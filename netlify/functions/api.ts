import serverless from "serverless-http";
import deployment from "../../generated/deployment.json" with { type: "json" };

import { createAiProvider } from "../../apps/backend/src/ai/provider.js";
import { createApp } from "../../apps/backend/src/app.js";
import { createDebugClinicAuth } from "../../apps/backend/src/auth/auth.js";
import { readEnv } from "../../apps/backend/src/config/env.js";
import { deploymentEnvironment } from "../../apps/backend/src/config/deployment.js";
import { createPrismaClient } from "../../apps/backend/src/db/client.js";
import { createInstructorDrafts } from "../../apps/backend/src/exercises/instructor-drafts.js";
import { createInstructorQuestions } from "../../apps/backend/src/exercises/instructor-questions.js";
import { createLearnerAttempts } from "../../apps/backend/src/exercises/learner-attempts.js";
import { createLogger } from "../../apps/backend/src/lib/logger.js";
import { toWebHandler } from "../../apps/backend/src/lib/web-handler.js";

const appConfig = readEnv(deploymentEnvironment(process.env, deployment));
const logger = createLogger(appConfig);
const prisma = createPrismaClient(appConfig);
const auth = createDebugClinicAuth(appConfig, prisma);
const aiProvider = createAiProvider(appConfig);
const app = createApp({
  config: appConfig,
  database: prisma,
  auth,
  aiProvider,
  instructorQuestions: createInstructorQuestions({ prisma, logger }),
  learnerAttempts: createLearnerAttempts(prisma),
  instructorDrafts: createInstructorDrafts({
    prisma,
    provider: aiProvider,
    config: appConfig,
    logger,
  }),
  profileUpdater: async (userId, name) =>
    prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, name: true, email: true, role: true },
    }),
  logger,
});

// A default Web handler selects Netlify's ESM runtime, preserving Prisma's
// import.meta.url. The adapter retains Express and multiple auth cookies.
export default toWebHandler(serverless(app, { binary: true }));
