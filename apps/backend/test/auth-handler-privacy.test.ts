import { inspect } from "node:util";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDebugClinicAuth } from "../src/auth/auth.js";
import type { DebugClinicPrisma } from "../src/db/client.js";
import { createApp } from "../src/app.js";
import { readEnv } from "../src/config/env.js";
import type * as AuthLogging from "../src/lib/logger.js";
const logs = vi.hoisted(() => [] as string[]);
vi.mock("../src/lib/logger.js", async (original) => {
  const actual = await original<typeof AuthLogging>();
  return {
    ...actual,
    createLogger: (config: Parameters<typeof actual.createLogger>[0]) =>
      actual.createLogger(config, {
        write: (line) => {
          logs.push(line);
        },
      }),
  };
});
const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://127.0.0.1:5173",
  CORS_ORIGINS: "http://127.0.0.1:5173",
  DATABASE_URL: "postgresql://synthetic@127.0.0.1:1/auth_test",
  BETTER_AUTH_URL: "http://127.0.0.1:5173",
  BETTER_AUTH_SECRET: "synthetic-handler-secret-at-least-32-characters",
  GOOGLE_CLIENT_ID: "synthetic-client",
  GOOGLE_CLIENT_SECRET: "synthetic-secret",
  LOG_LEVEL: "info",
});
afterEach(() => {
  vi.restoreAllMocks();
  logs.length = 0;
});
describe("real handler failure privacy", () => {
  it("intercepts storage exceptions before better-call's raw console fallback", async () => {
    const consoleCalls: unknown[][] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      consoleCalls.push(args);
    });
    const prisma = {
      verification: {
        findMany: async () => {
          throw new Error("PRIVATE_HANDLER_STORAGE_CANARY");
        },
      },
    } as unknown as DebugClinicPrisma;
    const auth = createDebugClinicAuth(config, prisma);
    for (const handler of [auth.handler, auth.fetch]) {
      const response = await handler(
        new Request(`${config.appOrigin}/api/auth/sign-in/social`, {
          method: "POST",
          headers: {
            origin: config.appOrigin,
            "content-type": "application/json",
          },
          body: JSON.stringify({ provider: "google", requestSignUp: false }),
        }),
      );
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        code: "AUTH_UNAVAILABLE",
        message: "Authentication is temporarily unavailable. Try again.",
      });
    }
    expect(inspect(consoleCalls)).not.toContain("PRIVATE_");
    expect(logs.join("\n")).not.toContain("PRIVATE_");
    expect(logs.join("\n")).toContain("auth_handler_failure");
    const expectedError = await auth.handler(
      new Request(`${config.appOrigin}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          origin: config.appOrigin,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Synthetic",
          email: "synthetic@example.test",
          password: "Synthetic-password-12345",
        }),
      }),
    );
    expect(expectedError.status).toBe(400);
    expect(await expectedError.json()).toMatchObject({
      code: "REGISTRATION_ROLE_REQUIRED",
    });
  });
  it("translates session lookup failures before Express can log raw exception/cause", async () => {
    const consoleCalls: unknown[][] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      consoleCalls.push(args);
    });
    const auth = createDebugClinicAuth(config, {} as DebugClinicPrisma);
    vi.spyOn(auth.api, "getSession").mockRejectedValue(
      new Error("PRIVATE_SESSION_STORAGE_CANARY", {
        cause: new Error("PRIVATE_CAUSE_CANARY"),
      }),
    );
    const app = createApp({
      config,
      auth,
      database: { $queryRawUnsafe: async <T>() => [] as T },
      profileUpdater: async () => {
        throw new Error("Unused");
      },
    });
    const result = await request(app)
      .get("/api/v1/me")
      .set("cookie", "synthetic=opaque")
      .expect(503);
    expect(result.body.error).toMatchObject({
      code: "DEPENDENCY_UNAVAILABLE",
      message: "Session service is temporarily unavailable",
    });
    expect(result.body.error.requestId).toBeTruthy();
    expect(JSON.stringify(result.body)).not.toContain("PRIVATE_");
    expect(logs.join("\n")).not.toContain("PRIVATE_");
    expect(inspect(consoleCalls)).not.toContain("PRIVATE_");
  });
});
