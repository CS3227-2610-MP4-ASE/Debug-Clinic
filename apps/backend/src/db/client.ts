import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../../../generated/prisma/client.js";
import type { AppConfig } from "../config/env.js";

const globalForPrisma = globalThis as unknown as {
  debugClinicPrisma?: PrismaClient;
};

export function createPrismaClient(config: AppConfig): PrismaClient {
  if (globalForPrisma.debugClinicPrisma)
    return globalForPrisma.debugClinicPrisma;

  const adapter = new PrismaPg({ connectionString: config.runtimeDatabaseUrl });
  const client = new PrismaClient({ adapter });
  if (config.nodeEnv !== "production")
    globalForPrisma.debugClinicPrisma = client;
  return client;
}

export type DebugClinicPrisma = PrismaClient;
