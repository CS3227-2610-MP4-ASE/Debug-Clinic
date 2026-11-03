import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { realpathSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readEnv } from "../apps/backend/src/config/env.js";
import { createPrismaClient } from "../apps/backend/src/db/client.js";

// Invoke an extracted Netlify packager artifact, never the source handler.
// This deliberately uses no SMTP/Google credentials and creates only its own user.
function verifiedEnvironment(): NodeJS.ProcessEnv {
  if (process.versions.node.split(".")[0] !== "24")
    throw new Error("Use Node 24 for packaged-function verification");
  const raw = process.env["TEST_DATABASE_URL"];
  if (!raw) throw new Error("Explicit TEST_DATABASE_URL is required");
  const target = new URL(raw);
  if (
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    !["localhost", "127.0.0.1"].includes(target.hostname) ||
    !/^\/[a-zA-Z0-9_]+_test$/.test(target.pathname) ||
    target.search ||
    target.hash
  )
    throw new Error(
      "Use an isolated loopback PostgreSQL database ending _test",
    );
  if (
    process.env["DATABASE_URL"] !== raw ||
    process.env["DATABASE_URL_POOLED"] !== raw
  )
    throw new Error("Explicit direct, pooled and test targets must match");
  return {
    ...process.env,
    NODE_ENV: "test",
    APP_ORIGIN: "http://127.0.0.1:5173",
    CORS_ORIGINS: "http://127.0.0.1:5173",
    BETTER_AUTH_URL: "http://127.0.0.1:5173",
    BETTER_AUTH_SECRET: "packaged-smoke-only-synthetic-secret-32-characters",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    OAUTH_PROXY_URL: "",
    OAUTH_PROXY_SECRET: "",
    SMTP_USER: "",
    SMTP_PASSWORD: "",
    EMAIL_FROM: "",
    AI_PROVIDER: "fake",
    SOC_LLM_ENDPOINT: "",
    SOC_LLM_API_KEY: "",
    SOC_LLM_MODEL: "",
    LOG_LEVEL: "silent",
    NETLIFY: "",
    SITE_ID: "",
    CONTEXT: "",
    NETLIFY_SITE_ID: "",
    NETLIFY_AUTH_TOKEN: "",
  };
}

type WebHandler = (request: Request) => Promise<Response>;

async function smoke(artifact: string): Promise<number> {
  const email = `package-${randomUUID()}@example.test`;
  let step = "load packaged ESM export";
  try {
    const loaded: unknown = await import(pathToFileURL(artifact).href);
    if (
      !loaded ||
      typeof loaded !== "object" ||
      !("default" in loaded) ||
      typeof loaded.default !== "function"
    )
      throw new Error("Missing Web handler");
    const handler = loaded.default as WebHandler;
    const request = (
      path: string,
      body?: object | string,
      cookie?: string,
    ): Promise<Response> =>
      handler(
        new Request(`http://127.0.0.1:5173${path}`, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            origin: "http://127.0.0.1:5173",
            ...(body === undefined
              ? {}
              : { "content-type": "application/json" }),
            ...(cookie ? { cookie } : {}),
          },
          ...(body === undefined
            ? {}
            : { body: typeof body === "string" ? body : JSON.stringify(body) }),
        }),
      );
    const expectStatus = (response: Response, status: number) => {
      if (response.status !== status) throw new Error("Unexpected status");
    };

    step = "health";
    expectStatus(await request("/api/health"), 200);
    step = "real database readiness";
    expectStatus(await request("/api/ready"), 200);
    step = "anonymous protected access";
    expectStatus(await request("/api/v1/me"), 401);
    step = "explicit instructor registration";
    const signup = await request("/api/auth/sign-up/email", {
      name: "Packaged smoke instructor",
      email: `  ${email.toUpperCase()}  `,
      password: randomUUID(),
      registrationRole: "INSTRUCTOR",
    });
    expectStatus(signup, 200);
    const cookies = signup.headers.getSetCookie();
    if (!cookies.length) throw new Error("No auth cookie");
    const cookie = cookies.map((value) => value.split(";", 1)[0]).join("; ");
    step = "cookie roundtrip and canonical identity";
    const me = await request("/api/v1/me", undefined, cookie);
    expectStatus(me, 200);
    const current = (await me.json()) as {
      user?: { id?: string; email?: string; role?: string };
    };
    if (
      current.user?.email !== email ||
      current.user.role !== "INSTRUCTOR" ||
      !current.user.id
    )
      throw new Error("Incorrect persisted identity");
    step = "instructor authorization";
    expectStatus(
      await request("/api/v1/instructor/ping", undefined, cookie),
      200,
    );
    step = "wrong-role denial";
    expectStatus(await request("/api/v1/ai/hint-preview", {}, cookie), 403);
    step = "signout";
    expectStatus(await request("/api/auth/sign-out", {}, cookie), 200);
    step = "revoked-cookie denial";
    expectStatus(await request("/api/v1/me", undefined, cookie), 401);
    step = "safe malformed auth body";
    const invalid = await request("/api/auth/sign-in/email", "{");
    if (invalid.status < 400 || invalid.status >= 500)
      throw new Error("Malformed auth body did not fail safely");
    process.stdout.write("Packaged ESM function: all smoke checks passed.\n");
    return 0;
  } catch (error) {
    // Neither dependency exceptions nor response bodies enter published evidence.
    process.stderr.write(`Packaged ESM function smoke failed at: ${step}.\n`);
    const code =
      error && typeof error === "object" && "code" in error
        ? error.code
        : undefined;
    if (
      typeof code === "string" &&
      [
        "ERR_MODULE_NOT_FOUND",
        "ERR_PACKAGE_PATH_NOT_EXPORTED",
        "ERR_REQUIRE_ESM",
      ].includes(code)
    )
      process.stderr.write(`Packaged module loader category: ${code}.\n`);
    return 1;
  } finally {
    // Construct cleanup access after exercising the artifact, so its startup
    // cannot accidentally reuse a source-created global Prisma client.
    const database = createPrismaClient(readEnv());
    await database.user.deleteMany({ where: { email } });
    await database.$disconnect();
  }
}

async function main(): Promise<void> {
  const environment = verifiedEnvironment();
  // Apply isolation even if a caller inherited the internal worker marker.
  Object.assign(process.env, environment);
  const artifact = process.argv[2];
  if (
    !artifact ||
    !isAbsolute(artifact) ||
    !/\.(?:mjs|js)$/.test(artifact) ||
    !statSync(artifact).isFile()
  )
    throw new Error("Pass the absolute extracted packaged function .mjs path");
  const resolvedArtifact = realpathSync(artifact);
  if (process.env["DEBUGCLINIC_PACKAGE_SMOKE_CHILD"] === "1") {
    // The bundle owns a private pool with no public disconnect API. Its isolated
    // worker exits after requests settle and the controller cleans its fixtures.
    const result = await smoke(resolvedArtifact);
    process.exit(result);
  }
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), resolvedArtifact],
    {
      env: { ...environment, DEBUGCLINIC_PACKAGE_SMOKE_CHILD: "1" },
      encoding: "utf8",
      timeout: 60_000,
      windowsHide: true,
    },
  );
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.error || result.status !== 0)
    throw new Error("Packaged-function smoke worker failed or timed out");
}

try {
  await main();
} catch {
  process.stderr.write(
    "Packaged-function verification could not complete; check the explicit local environment, artifact and last reported step.\n",
  );
  process.exit(1);
}
