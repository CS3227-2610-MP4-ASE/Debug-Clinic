import deployment from "../../generated/deployment.json" with { type: "json" };
import { createAiProvider } from "../../apps/backend/src/ai/provider.js";
import { readEnv } from "../../apps/backend/src/config/env.js";
import { deploymentEnvironment } from "../../apps/backend/src/config/deployment.js";
import { createPrismaClient } from "../../apps/backend/src/db/client.js";
import { createLearnerAssistant } from "../../apps/backend/src/exercises/learner-assistant.js";

export const config = { schedule: "*/30 * * * *" };

export default async function handler() {
  const appConfig = readEnv(deploymentEnvironment(process.env, deployment));
  const prisma = createPrismaClient(appConfig);
  try {
    return {
      deletedConversations: await createLearnerAssistant(
        prisma,
        createAiProvider(appConfig),
      ).cleanupExpired(),
    };
  } finally {
    await prisma.$disconnect();
  }
}
