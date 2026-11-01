import "dotenv/config";

import { defineConfig } from "prisma/config";

const localDevelopmentUrl =
  "postgresql://debugclinic:debugclinic@127.0.0.1:5432/debugclinic?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Generation and validation do not contact PostgreSQL. Commands that do
    // connect will safely target the documented local Compose service unless
    // an environment-specific URL is provided.
    url: process.env.DATABASE_URL ?? localDevelopmentUrl,
  },
});
