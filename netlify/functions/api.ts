import serverless from "serverless-http";

import { createAiProvider } from "../../apps/backend/src/ai/provider.js";
import { createApp } from "../../apps/backend/src/app.js";
import { createDebugClinicAuth } from "../../apps/backend/src/auth/auth.js";
import { readEnv } from "../../apps/backend/src/config/env.js";
import { createPrismaClient } from "../../apps/backend/src/db/client.js";
import { createLogger } from "../../apps/backend/src/lib/logger.js";

const config = readEnv();
const logger = createLogger(config);
const prisma = createPrismaClient(config);
const auth = createDebugClinicAuth(config, prisma);
const app = createApp({
  config,
  database: prisma,
  auth,
  aiProvider: createAiProvider(config),
  profileUpdater: async (userId, name) =>
    prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, name: true, email: true, role: true },
    }),
  logger,
});

export const handler = serverless(app);
