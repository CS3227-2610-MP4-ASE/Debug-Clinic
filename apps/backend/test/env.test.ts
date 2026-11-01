import { describe, expect, it } from "vitest";

import { readEnv } from "../src/config/env.js";

const validEnv = {
  NODE_ENV: "test",
  PORT: "3001",
  APP_ORIGIN: "http://localhost:5173",
  CORS_ORIGINS: "http://localhost:5173,http://127.0.0.1:4173",
  DATABASE_URL: "postgresql://user:password@localhost:5432/debugclinic",
  BETTER_AUTH_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: "a-test-secret-that-is-at-least-32-characters",
  AI_PROVIDER: "fake",
};

describe("environment configuration", () => {
  it("parses and normalizes valid configuration", () => {
    const config = readEnv(validEnv);
    expect(config.corsOrigins).toEqual([
      "http://localhost:5173",
      "http://127.0.0.1:4173",
    ]);
    expect(config.runtimeDatabaseUrl).toBe(validEnv.DATABASE_URL);
  });

  it("rejects a short authentication secret", () => {
    expect(() =>
      readEnv({ ...validEnv, BETTER_AUTH_SECRET: "too-short" }),
    ).toThrow();
  });

  it("rejects incomplete SoC LLM configuration", () => {
    expect(() => readEnv({ ...validEnv, AI_PROVIDER: "soc" })).toThrow();
  });

  it("requires real email configuration for production", () => {
    expect(() => readEnv({ ...validEnv, NODE_ENV: "production" })).toThrow();
  });

  it("rejects sending provider credentials over plain HTTP", () => {
    expect(() =>
      readEnv({
        ...validEnv,
        SOC_LLM_ENDPOINT: "http://provider.example/v1/chat/completions",
      }),
    ).toThrow();
  });
});
