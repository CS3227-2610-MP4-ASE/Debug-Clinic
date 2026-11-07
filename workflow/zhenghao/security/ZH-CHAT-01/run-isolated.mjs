import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";

if (process.versions.node.split(".")[0] !== "24")
  throw Error("Node 24 required");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const docker = existsSync(
  "/Applications/Docker.app/Contents/Resources/bin/docker",
)
  ? "/Applications/Docker.app/Contents/Resources/bin/docker"
  : "docker";
const env = {
  ...process.env,
  PATH: `${dirname(docker)}:${process.env.PATH ?? ""}`,
};
const command = (args) =>
  execFileSync(docker, args, { env, encoding: "utf8", timeout: 120000 }).trim();
let container;
try {
  container = command([
    "run",
    "--detach",
    "--name",
    `chat-security-${randomUUID()}`,
    "--publish",
    "127.0.0.1::5432",
    "--env",
    "POSTGRES_USER=synthetic",
    "--env",
    "POSTGRES_PASSWORD=synthetic",
    "--env",
    "POSTGRES_DB=chat_security_test",
    "--tmpfs",
    "/var/lib/postgresql/data",
    "postgres:17-alpine",
  ]);
  if (!/^[a-f0-9]{64}$/.test(container)) throw Error("Invalid owned container");
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      command([
        "exec",
        container,
        "pg_isready",
        "-U",
        "synthetic",
        "-d",
        "chat_security_test",
      ]);
      ready = true;
      break;
    } catch {
      await setTimeout(300);
    }
  }
  if (!ready) throw Error("Owned PostgreSQL not ready");
  const port = /^127\.0\.0\.1:(\d+)$/.exec(
    command(["port", container, "5432/tcp"]),
  )?.[1];
  if (!port) throw Error("Non-loopback mapping rejected");
  const url = `postgresql://synthetic:synthetic@127.0.0.1:${port}/chat_security_test`;
  const isolated = {
    ...env,
    DATABASE_URL: url,
    DATABASE_URL_POOLED: url,
    TEST_DATABASE_URL: url,
    E2E_TEST_DATABASE_URL: url,
  };
  const run = (args) =>
    execFileSync(process.execPath, args, {
      cwd: root,
      env: isolated,
      stdio: "inherit",
      timeout: 120000,
    });
  run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
  run([
    "--import",
    "tsx",
    "workflow/zhenghao/security/ZH-CHAT-01/service-checks.ts",
  ]);
} finally {
  if (container && /^[a-f0-9]{64}$/.test(container))
    command(["rm", "--force", container]);
  console.log("Owned disposable PostgreSQL removed.");
}
