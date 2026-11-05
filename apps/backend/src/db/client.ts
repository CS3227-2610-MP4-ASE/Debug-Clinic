import { PrismaPg } from "@prisma/adapter-pg";
import type { PoolConfig } from "pg";

import { PrismaClient } from "../../../../generated/prisma/client.js";
import type { AppConfig } from "../config/env.js";
import { SUPABASE_CA } from "./supabase-ca.js";

const globalForPrisma = globalThis as unknown as {
  debugClinicPrisma?: PrismaClient;
};

export function databasePoolConfig(connectionString: string): PoolConfig {
  const url = new URL(connectionString);
  const isSupabase =
    url.hostname.endsWith(".pooler.supabase.com") ||
    /^db\.[a-z0-9-]+\.supabase\.co$/.test(url.hostname);
  const hasCustomCertificate = ["sslrootcert", "sslcert", "sslkey"].some(
    (key) => url.searchParams.has(key),
  );
  if (isSupabase && !hasCustomCertificate) {
    // pg lets URL SSL settings replace the explicit CA object. Remove only
    // those switches and require certificate + hostname verification below.
    for (const key of ["sslmode", "ssl", "uselibpqcompat"])
      url.searchParams.delete(key);
    return {
      connectionString: url.toString(),
      ssl: { ca: SUPABASE_CA, rejectUnauthorized: true },
    };
  }
  return { connectionString };
}

export function createPrismaClient(config: AppConfig): PrismaClient {
  if (globalForPrisma.debugClinicPrisma)
    return globalForPrisma.debugClinicPrisma;

  const adapter = new PrismaPg(databasePoolConfig(config.runtimeDatabaseUrl));
  const client = new PrismaClient({ adapter });
  if (config.nodeEnv !== "production")
    globalForPrisma.debugClinicPrisma = client;
  return client;
}

export type DebugClinicPrisma = PrismaClient;
