import { describe, expect, it, vi } from "vitest";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { createDebugClinicAuth } from "../src/auth/auth.js";
import type { DebugClinicPrisma } from "../src/db/client.js";
import { readEnv } from "../src/config/env.js";
import { protectedMapPath } from "../../../scripts/normalize-auth-identities.js";
const captured = vi.hoisted(() => [] as unknown[][]);
vi.mock("../src/lib/logger.js", async (original) => ({
  ...(await original<object>()),
  createLogger: () => ({
    warn: (...args: unknown[]) => {
      captured.push(args);
    },
  }),
}));
const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://127.0.0.1:5173",
  CORS_ORIGINS: "http://127.0.0.1:5173",
  DATABASE_URL: "postgresql://synthetic@127.0.0.1:1/auth_test",
  BETTER_AUTH_URL: "http://127.0.0.1:5173",
  BETTER_AUTH_SECRET: "synthetic-diagnostics-secret-at-least-32-characters",
  SMTP_HOST: "smtp.example.test",
  SMTP_USER: "auth@example.test",
  SMTP_PASSWORD: "synthetic",
  EMAIL_FROM: "auth@example.test",
  LOG_LEVEL: "warn",
});
describe("authentication diagnostics and protected transition map", () => {
  it("F03 discards library free-form payloads and suppresses recipient delivery errors", async () => {
    captured.length = 0;
    const auth = createDebugClinicAuth(
      config,
      {} as DebugClinicPrisma,
      async () => {
        throw new Error("PRIVATE_SMTP_CANARY");
      },
    );
    auth.options.logger?.log?.("error", "PRIVATE_EMAIL_CANARY", {
      url: "https://example.test/?token=PRIVATE_TOKEN_CANARY",
      error: new Error("PRIVATE_DB_CANARY"),
      cookie: "PRIVATE_COOKIE_CANARY",
    });
    const user = {
      id: "synthetic",
      email: "PRIVATE_RECIPIENT_CANARY@example.test",
      name: "Synthetic",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await auth.options.emailVerification?.sendVerificationEmail?.({
      user,
      url: "https://example.test/?token=PRIVATE_LINK_CANARY",
      token: "PRIVATE_TOKEN_CANARY",
    });
    await auth.options.emailAndPassword?.sendResetPassword?.({
      user,
      url: "https://example.test/reset-password/PRIVATE_LINK_CANARY",
      token: "PRIVATE_TOKEN_CANARY",
    });
    expect(captured).toHaveLength(3);
    expect(JSON.stringify(captured)).not.toContain("PRIVATE_");
    expect(
      captured.map((entry) => (entry[0] as { category: string }).category),
    ).toEqual([
      "auth_library_failure",
      "auth_email_delivery_failed",
      "auth_email_delivery_failed",
    ]);
  });
  it("N04 refuses protected map paths inside Git or nonexistent parent before connecting", () => {
    expect(() => protectedMapPath(resolve("rollback-map.json"))).toThrow(
      "outside every Git worktree",
    );
    expect(() =>
      protectedMapPath(resolve(".workflow-state/rollback-map.json")),
    ).toThrow("outside every Git worktree");
    expect(() =>
      protectedMapPath(
        resolve("missing-parent-does-not-exist/rollback-map.json"),
      ),
    ).toThrow("outside every Git worktree");
    expect(
      protectedMapPath(resolve(tmpdir(), "synthetic-rollback-map.json")),
    ).toBe(resolve(tmpdir(), "synthetic-rollback-map.json"));
  });
});
