import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("F01 additive migration compatibility", () => {
  it("B20 adds only four nullable fields without backfill or destructive statements", async () => {
    const root = resolve("prisma/migrations");
    const names = (await readdir(root)).filter((name) =>
      name.endsWith("_f01_draft_content"),
    );
    expect(names).toHaveLength(1);
    const sql = (
      await readFile(resolve(root, names[0]!, "migration.sql"), "utf8")
    ).replace(/--[^\n]*/g, "");
    const additions = [
      ...sql.matchAll(/ADD COLUMN\s+"([^"]+)"\s+(TEXT|JSONB)\b/gi),
    ].map((match) => [match[1], match[2]!.toUpperCase()]);
    expect(additions.sort()).toEqual([
      ["bugExplanation", "TEXT"],
      ["correctedSolution", "TEXT"],
      ["generationProvenance", "JSONB"],
      ["topic", "TEXT"],
    ]);
    const statements = sql
      .split(";")
      .map((statement) => statement.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    expect(statements.length).toBeGreaterThan(0);
    for (const statement of statements) {
      if (["BEGIN", "COMMIT"].includes(statement.toUpperCase())) continue;
      expect(statement).toMatch(
        /^ALTER TABLE "ExerciseVersion" (?:ADD COLUMN "[^"]+" (?:TEXT|JSONB)(?: NULL)?(?:, )?)+$/,
      );
    }
    expect(sql).not.toMatch(
      /\b(?:DROP|DELETE|UPDATE|INSERT|RENAME|DEFAULT|NOT NULL)\b/i,
    );
  });
});
