import { createAiProvider } from "./ai/provider.js";
import { createApp } from "./app.js";
import { createDebugClinicAuth } from "./auth/auth.js";
import { readEnv } from "./config/env.js";
import { createPrismaClient } from "./db/client.js";
import { createLogger } from "./lib/logger.js";

const config = readEnv();
const logger = createLogger(config);
const prisma = createPrismaClient(config);
const auth = createDebugClinicAuth(config, prisma);

const app = createApp({
  config,
  database: prisma,
  auth,
  aiProvider: createAiProvider(config),
  profileUpdater: async (userId, name) => {
    return prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, name: true, email: true, role: true },
    });
  },
  logger,
});

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, "DebugClinic API listening");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
