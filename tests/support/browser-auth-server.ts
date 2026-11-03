// Opt-in synthetic runtime: private filesystem controller channel, never a production route.
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createApp } from "../../apps/backend/src/app.js";
import { createDebugClinicAuth } from "../../apps/backend/src/auth/auth.js";
import { readEnv } from "../../apps/backend/src/config/env.js";
import { createPrismaClient } from "../../apps/backend/src/db/client.js";
import { testRuntimeDatabaseTarget } from "./database-target.js";

if (process.env["E2E_AUTH_COMPLETION"] !== "1")
  throw new Error("Synthetic runtime requires explicit opt-in");
const config = readEnv();
testRuntimeDatabaseTarget(config);
if (config.appOrigin !== "http://127.0.0.1:5173")
  throw new Error("Unsafe synthetic runtime target");
const channel = resolve(".workflow-state/browser-auth");
await mkdir(channel, { recursive: true });
const prisma = createPrismaClient(config);
const auth = createDebugClinicAuth(
  {
    ...config,
    googleClientId: "synthetic-google-client",
    googleClientSecret: "synthetic-google-secret",
    smtp: {
      host: "smtp.example.test",
      port: 465,
      secure: true,
      user: "auth@example.test",
      password: "synthetic",
    },
    emailFrom: "auth@example.test",
  },
  prisma,
  async (message) => {
    const key = createHash("sha256").update(message.to).digest("hex");
    await writeFile(
      resolve(channel, `mail-${key}-${Date.now()}-${randomUUID()}.json`),
      JSON.stringify(message),
      { flag: "wx", mode: 0o600 },
    );
  },
);
const provider = (await auth.$context).socialProviders.find(
  (entry) => entry.id === "google",
)!;
provider.validateAuthorizationCode = async ({ code }) => {
  if (!/^[a-f0-9-]{36}$/.test(code))
    throw new Error("Unknown synthetic authorization code");
  await readFile(resolve(channel, `google-${code}.json`), "utf8");
  return { accessToken: code, scopes: ["email", "profile", "openid"] };
};
provider.getUserInfo = async ({ accessToken }) => {
  if (!accessToken || !/^[a-f0-9-]{36}$/.test(accessToken)) return null;
  const raw: unknown = JSON.parse(
    await readFile(resolve(channel, `google-${accessToken}.json`), "utf8"),
  );
  if (
    !raw ||
    typeof raw !== "object" ||
    !("email" in raw) ||
    !("sub" in raw) ||
    typeof raw.email !== "string" ||
    typeof raw.sub !== "string"
  )
    return null;
  return {
    user: {
      email: raw.email.trim().toLowerCase(),
      emailVerified: true,
      name: "Browser Google",
    },
    data: { sub: raw.sub, email: raw.email, email_verified: true },
  };
};
const app = createApp({
  config,
  auth,
  database: prisma,
  profileUpdater: async (id, name) =>
    prisma.user.update({
      where: { id },
      data: { name },
      select: { id: true, name: true, email: true, role: true },
    }),
});
const server = app.listen(config.port);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  });
