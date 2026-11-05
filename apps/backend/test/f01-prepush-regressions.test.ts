import { afterEach, describe, expect, it, vi } from "vitest";
import { f01DatabaseUrl } from "../../../tests/support/f01-database.js";
import { f01Output } from "../../../tests/support/f01-fixtures.js";
import { SocLlmProvider } from "../src/ai/provider.js";
import { readEnv } from "../src/config/env.js";
import type { DebugClinicPrisma } from "../src/db/client.js";
import { createInstructorDrafts } from "../src/exercises/instructor-drafts.js";
import { createLogger } from "../src/lib/logger.js";

afterEach(() => vi.unstubAllEnvs());

describe("F01 pre-push regressions", () => {
  it.each([
    "postgresql://debugclinic:synthetic@127.0.0.1:5432/debugclinic_test",
    "postgresql://debugclinic:synthetic@127.0.0.1:55441/debugclinic_f01_test",
    "postgres://debugclinic:synthetic@localhost:55433/browser_test",
  ])("accepts the explicitly configured safe test target %s", (url) => {
    vi.stubEnv("TEST_DATABASE_URL", url);
    expect(f01DatabaseUrl()).toBe(url);
  });

  it.each([
    undefined,
    "postgresql://synthetic@remote.example.test:5432/debugclinic_test",
    "postgresql://synthetic@127.0.0.1:5432/production",
    "postgresql://synthetic@127.0.0.1:5432/debugclinic_test?host=remote.example.test",
    "postgresql://synthetic@127.0.0.1:5432/debugclinic_test#fragment",
  ])("retains synthetic database safety for %s", (url) => {
    vi.stubEnv("TEST_DATABASE_URL", url);
    expect(() => f01DatabaseUrl()).toThrow();
  });

  it("records the repaired prompt version with generated preview provenance", async () => {
    const config = readEnv({
      NODE_ENV: "test",
      APP_ORIGIN: "http://127.0.0.1:5173",
      CORS_ORIGINS: "http://127.0.0.1:5173",
      DATABASE_URL: "postgresql://synthetic@127.0.0.1:55441/f01_test",
      BETTER_AUTH_URL: "http://127.0.0.1:5173",
      BETTER_AUTH_SECRET:
        "synthetic-regression-secret-over-thirty-two-characters",
      AI_PROVIDER: "soc",
      SOC_LLM_ENDPOINT: "https://provider.example.test/chat/completions",
      SOC_LLM_MODEL: "synthetic-model",
      SOC_LLM_API_KEY: "synthetic-key",
      AI_MAX_RETRIES: "0",
      LOG_LEVEL: "silent",
    });
    const create = vi.fn().mockResolvedValue({
      id: "generation-regression",
      createdAt: new Date("2026-11-05T10:00:00Z"),
    });
    const prisma = { aiUsageEvent: { create } } as unknown as DebugClinicPrisma;
    const provider = new SocLlmProvider(config, async () =>
      Response.json({
        choices: [{ message: { content: JSON.stringify(f01Output) } }],
      }),
    );
    const drafts = createInstructorDrafts({
      prisma,
      provider,
      config,
      logger: createLogger(config),
    });
    const result = await drafts.generate(
      "synthetic-instructor",
      "Python loop accumulators",
    );
    expect(result.generation.promptVersion).toBe("soc-question-v2");
    expect(create.mock.calls[0]?.[0].data.promptVersion).toBe(
      "soc-question-v2",
    );
  });
});
