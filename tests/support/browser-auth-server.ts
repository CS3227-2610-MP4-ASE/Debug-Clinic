// Opt-in synthetic runtime: private filesystem controller channel, never a production route.
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createApp } from "../../apps/backend/src/app.js";
import { createAiProvider } from "../../apps/backend/src/ai/provider.js";
import { createDebugClinicAuth } from "../../apps/backend/src/auth/auth.js";
import { readEnv } from "../../apps/backend/src/config/env.js";
import { createPrismaClient } from "../../apps/backend/src/db/client.js";
import { createInstructorDrafts } from "../../apps/backend/src/exercises/instructor-drafts.js";
import { createInstructorQuestions } from "../../apps/backend/src/exercises/instructor-questions.js";
import { createGrading } from "../../apps/backend/src/exercises/grading.js";
import { createLearnerAttempts } from "../../apps/backend/src/exercises/learner-attempts.js";
import { createLearnerAssistant } from "../../apps/backend/src/exercises/learner-assistant.js";
import { createLearnerDashboard } from "../../apps/backend/src/exercises/learner-dashboard.js";
import { createLogger } from "../../apps/backend/src/lib/logger.js";
import { testRuntimeDatabaseTarget } from "./database-target.js";
import { browserTestOrigin } from "./browser-target.js";
import { createBrowserResponseLossProxy } from "./browser-response-loss-proxy.js";

if (process.env["E2E_AUTH_COMPLETION"] !== "1")
  throw new Error("Synthetic runtime requires explicit opt-in");
const config = readEnv();
testRuntimeDatabaseTarget(config);
if (config.appOrigin !== browserTestOrigin())
  throw new Error("Unsafe synthetic runtime target");
const channel = resolve(".workflow-state/browser-auth");
await mkdir(channel, { recursive: true });
const prisma = createPrismaClient(config);
const logger = createLogger(config);
const aiProvider = createAiProvider(config);
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
  instructorDrafts: createInstructorDrafts({
    prisma,
    provider: aiProvider,
    config,
    logger,
  }),
  instructorQuestions: createInstructorQuestions({ prisma, logger }),
  learnerAttempts: createLearnerAttempts(prisma),
  grading: createGrading(prisma),
  learnerAssistant: createLearnerAssistant(prisma, aiProvider),
  learnerDashboard: createLearnerDashboard(prisma),
  logger,
  profileUpdater: async (id, name) =>
    prisma.user.update({
      where: { id },
      data: { name },
      select: { id: true, name: true, email: true, role: true },
    }),
});
const upstream = app.listen(0, "127.0.0.1");
await once(upstream, "listening");
const address = upstream.address();
if (!address || typeof address === "string")
  throw new Error("Missing synthetic upstream port");
const server = createBrowserResponseLossProxy(
  new URL(`http://127.0.0.1:${address.port}`),
  async () => {
    try {
      await unlink(resolve(channel, "drop-next-publication-response"));
      return true;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      )
        return false;
      throw new Error("Synthetic response-loss marker could not be claimed", {
        cause: error,
      });
    }
  },
);
server.listen(config.port, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    server.close(() => {
      upstream.close(() => {
        void prisma.$disconnect().finally(() => process.exit(0));
      });
    });
  });
