import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("local database configuration", () => {
  const compose = readFileSync(
    new URL("../../../docker-compose.yml", import.meta.url),
    "utf8",
  );
  const example = readFileSync(
    new URL("../../../.env.example", import.meta.url),
    "utf8",
  );

  it("binds both published database ports only to loopback", () => {
    const mappings = [...compose.matchAll(/- "([^"]+):5432"/g)].map(
      (match) => match[1],
    );
    expect(mappings).toEqual(["127.0.0.1:55432", "127.0.0.1:5433"]);
  });

  it("uses the published development address in both example URLs", () => {
    const urls = [...example.matchAll(/^DATABASE_URL(?:_POOLED)?=(.+)$/gm)];
    expect(urls).toHaveLength(2);
    for (const [, value] of urls) {
      const url = new URL(value!);
      expect(compose).toContain(`"${url.hostname}:${url.port}:5432"`);
      expect(url.pathname).toBe("/debugclinic");
    }
  });
});
