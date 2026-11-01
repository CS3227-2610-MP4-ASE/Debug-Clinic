import "dotenv/config";

import { defineConfig } from "prisma/config";

const localDevelopmentUrl =
  "postgresql://debugclinic:debugclinic@127.0.0.1:5432/debugclinic?schema=public";
const offlineCommand = process.argv.some((argument) =>
  ["generate", "validate", "format"].includes(argument),
);
if (!process.env.DATABASE_URL && !offlineCommand) {
  throw new Error(
    "DATABASE_URL is required for database commands; no implicit database target is allowed",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Only offline generation/validation/formatting may use a placeholder URL.
    url: process.env.DATABASE_URL ?? localDevelopmentUrl,
  },
});
