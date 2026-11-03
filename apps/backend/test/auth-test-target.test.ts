import { afterEach, describe, expect, it, vi } from "vitest";
import {
  testDatabaseUrl,
  testRuntimeDatabaseTarget,
} from "../../../tests/support/database-target.js";
import { createPrismaClient } from "../src/db/client.js";
vi.mock("../src/db/client.js", () => ({
  createPrismaClient: vi.fn(() => {
    throw new Error("Database construction must not be reached");
  }),
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("synthetic database target admission", () => {
  it.each([
    "not-a-url",
    "mysql://synthetic@127.0.0.1:55434/auth_test",
    "postgresql://synthetic@remote.example.test/auth_test",
    "postgresql://synthetic@127.0.0.1:55434/auth",
    "postgresql://synthetic@127.0.0.1:55434/auth_test?host=remote.example.test",
    "postgresql://synthetic@127.0.0.1:55434/auth_test?%68ost=remote.example.test",
    "postgresql://synthetic@127.0.0.1:55434/auth_test?database=production",
    "postgresql://synthetic@127.0.0.1:55434/auth_test?sslmode=disable",
    "postgresql://synthetic@127.0.0.1:55434/auth_test#fragment",
  ])("rejects unsafe target %# before connecting", (raw) => {
    expect(() => testDatabaseUrl(raw)).toThrow();
  });
  it("requires an explicit environment target", () => {
    vi.stubEnv("TEST_DATABASE_URL", undefined);
    expect(() => testDatabaseUrl()).toThrow(
      "Explicit isolated database URL required",
    );
  });
  it.each([
    "postgresql://synthetic@127.0.0.1:55434/auth_test",
    "postgres://synthetic@localhost:55434/auth_test",
  ])("accepts only an identified local test target %#", (raw) => {
    expect(testDatabaseUrl(raw)).toBe(raw);
    expect(
      testRuntimeDatabaseTarget({ databaseUrl: raw, runtimeDatabaseUrl: raw }),
    ).toBe(raw);
  });
  it("rejects a different otherwise-safe pooled target", () => {
    expect(() =>
      testRuntimeDatabaseTarget({
        databaseUrl: "postgresql://synthetic@127.0.0.1:55434/auth_test",
        runtimeDatabaseUrl: "postgresql://synthetic@127.0.0.1:55434/other_test",
      }),
    ).toThrow("must match exactly");
  });
  it("rejects unsafe inherited pooled runtime before browser fixture constructs a client", async () => {
    for (const [key, value] of Object.entries({
      E2E_AUTH_COMPLETION: "1",
      NODE_ENV: "test",
      APP_ORIGIN: "http://127.0.0.1:5173",
      CORS_ORIGINS: "http://127.0.0.1:5173",
      DATABASE_URL: "postgresql://synthetic@127.0.0.1:55434/auth_test",
      DATABASE_URL_POOLED:
        "postgresql://synthetic@127.0.0.1:55434/auth_test?host=remote.example.test",
      BETTER_AUTH_URL: "http://127.0.0.1:5173",
      BETTER_AUTH_SECRET: "synthetic-browser-guard-secret-32-characters",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      OAUTH_PROXY_URL: "",
      OAUTH_PROXY_SECRET: "",
      SMTP_USER: "",
      SMTP_PASSWORD: "",
      EMAIL_FROM: "",
    }))
      vi.stubEnv(key, value);
    await expect(
      import("../../../tests/support/browser-auth-server.js"),
    ).rejects.toThrow("Unsafe synthetic database target");
    expect(createPrismaClient).not.toHaveBeenCalled();
  });
});
