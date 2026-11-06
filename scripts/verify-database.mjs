import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";

if (Number(process.versions.node.split(".")[0]) !== 24) {
  throw new Error("Run this check with Node 24; see docs/CredentialsSetup.md");
}
const desktopDocker = "/Applications/Docker.app/Contents/Resources/bin/docker";
const docker = existsSync(desktopDocker) ? desktopDocker : "docker";
const taskEnvironment = {
  ...process.env,
  PATH: `${dirname(docker)}${delimiter}${process.env.PATH ?? ""}`,
};
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function dockerCommand(args) {
  return execFileSync(docker, args, {
    env: taskEnvironment,
    encoding: "utf8",
    timeout: 120_000,
  }).trim();
}
const name = `debugclinic-verify-${randomUUID()}`;
let containerId;
try {
  containerId = dockerCommand([
    "run",
    "--detach",
    "--name",
    name,
    "--publish",
    "127.0.0.1::5432",
    "--env",
    "POSTGRES_USER=debugclinic",
    "--env",
    "POSTGRES_PASSWORD=debugclinic",
    "--env",
    "POSTGRES_DB=debugclinic_test",
    "--tmpfs",
    "/var/lib/postgresql/data",
    "postgres:17-alpine",
  ]);
  if (!/^[a-f0-9]{64}$/.test(containerId))
    throw new Error("Unexpected container ID");
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      dockerCommand([
        "exec",
        containerId,
        "pg_isready",
        "-U",
        "debugclinic",
        "-d",
        "debugclinic_test",
      ]);
      ready = true;
      break;
    } catch {
      await setTimeout(500);
    }
  }
  if (!ready) throw new Error("PostgreSQL readiness timed out");
  const mapping = dockerCommand(["port", containerId, "5432/tcp"]);
  const port = /^127\.0\.0\.1:(\d+)$/.exec(mapping)?.[1];
  if (!port) throw new Error("Expected a loopback-only PostgreSQL port");
  const url = `postgresql://debugclinic:debugclinic@127.0.0.1:${port}/debugclinic_test`;
  const env = {
    ...taskEnvironment,
    DATABASE_URL: url,
    DATABASE_URL_POOLED: url,
    TEST_DATABASE_URL: url,
    E2E_TEST_DATABASE_URL: url,
  };
  console.log(
    `Verifying PostgreSQL 17 in an isolated container using Node ${process.versions.node}`,
  );
  for (const script of [
    "db:deploy",
    "db:seed",
    "db:seed",
    "test:integration",
  ]) {
    // npm is a .cmd shim on Windows; invoke its installed JS CLI directly.
    const npmCli = process.env.npm_execpath;
    if (!npmCli || !existsSync(npmCli))
      throw new Error("Run this verification through npm run db:verify");
    execFileSync(process.execPath, [npmCli, "run", script], {
      cwd: root,
      env,
      stdio: "inherit",
      timeout: 120_000,
    });
  }
} finally {
  if (containerId && /^[a-f0-9]{64}$/.test(containerId)) {
    dockerCommand(["rm", "--force", containerId]);
    console.log(
      "Removed the disposable verification container and its synthetic data.",
    );
  }
}
