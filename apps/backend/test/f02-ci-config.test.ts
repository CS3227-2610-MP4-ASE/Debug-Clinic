import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { testDatabaseUrl } from "../../../tests/support/database-target.js";

it("CI supplies the identical explicit database targets required by F02 integration", () => {
  const workflow = readFileSync(
    new URL("../../../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  const targets = new Map(
    [
      ...workflow.matchAll(
        /^ {6}(DATABASE_URL|DATABASE_URL_POOLED|TEST_DATABASE_URL|E2E_TEST_DATABASE_URL):\s*(\S+)\s*$/gm,
      ),
    ].map((match) => [match[1]!, match[2]!]),
  );
  const target = testDatabaseUrl(targets.get("TEST_DATABASE_URL"));
  for (const name of [
    "DATABASE_URL",
    "DATABASE_URL_POOLED",
    "TEST_DATABASE_URL",
    "E2E_TEST_DATABASE_URL",
  ])
    expect(targets.get(name), name).toBe(target);
});
