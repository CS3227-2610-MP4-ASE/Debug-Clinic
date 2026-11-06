import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testDatabaseUrl } from "../support/database-target.js";

const url = testDatabaseUrl();
if (
  process.env["DATABASE_URL"] !== url ||
  process.env["DATABASE_URL_POOLED"] !== url
)
  throw new Error("Explicit identical synthetic database targets required");
const migration = await readFile(
  new URL(
    "../../prisma/migrations/20261106120000_learner_attempt_revision/migration.sql",
    import.meta.url,
  ),
  "utf8",
);
const client = new Client({ connectionString: url });
const suffix = randomUUID().replaceAll("-", "");
const schema = `learner_attempt_migration_${suffix}`;
const quotedSchema = `"${schema}"`;

beforeAll(async () => {
  await client.connect();
});
afterAll(async () => {
  await client.query(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`);
  await client.end();
});

async function isolatedAttemptTable() {
  await client.query(`CREATE SCHEMA ${quotedSchema}`);
  await client.query(`SET search_path TO ${quotedSchema}`);
  await client.query(`CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "exerciseVersionId" TEXT NOT NULL
  )`);
}

describe("learner attempt additive migration / real PostgreSQL", () => {
  it("stops on duplicate learner/version attempts without deleting data", async () => {
    await isolatedAttemptTable();
    await client.query(
      `INSERT INTO "Attempt" ("id", "learnerId", "exerciseVersionId") VALUES
       ('a1', 'learner-a', 'version-a'), ('a2', 'learner-a', 'version-a')`,
    );
    await expect(client.query(migration)).rejects.toThrow(
      "Duplicate attempts exist for a learner and exercise version",
    );
    const rows = await client.query(`SELECT "id" FROM "Attempt" ORDER BY "id"`);
    expect(rows.rows).toEqual([{ id: "a1" }, { id: "a2" }]);
    const revisionColumn = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'Attempt' AND column_name = 'revision'`,
      [schema],
    );
    expect(revisionColumn.rowCount).toBe(0);
  });

  it("adds revision zero and uniqueness when the existing data is compatible", async () => {
    await client.query(`DROP SCHEMA ${quotedSchema} CASCADE`);
    await isolatedAttemptTable();
    await client.query(
      `INSERT INTO "Attempt" ("id", "learnerId", "exerciseVersionId") VALUES ('a1', 'learner-a', 'version-a')`,
    );
    await client.query(migration);
    const row = await client.query(
      `SELECT "revision" FROM "Attempt" WHERE "id" = 'a1'`,
    );
    expect(row.rows).toEqual([{ revision: 0 }]);
    const index = await client.query(
      `SELECT indexdef FROM pg_indexes WHERE schemaname = $1 AND indexname = 'Attempt_learnerId_exerciseVersionId_key'`,
      [schema],
    );
    expect(index.rows[0]?.indexdef).toContain("UNIQUE");
  });
});
