import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { readEnv } from "../src/config/env.js";
import { createLogger, sanitizeRequestUrl } from "../src/lib/logger.js";

const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://localhost:5173",
  CORS_ORIGINS: "http://localhost:5173",
  BETTER_AUTH_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: "synthetic-logging-secret-at-least-32-characters",
  DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/logging_test",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "info",
});

describe("credential-safe request logging", () => {
  it.each([
    ["/api/health", "/api/health"],
    [
      "/api/auth/verify-email?token=secret",
      "/api/auth/verify-email?[REDACTED]",
    ],
    [
      "/api/auth/callback/google?code=secret&state=secret",
      "/api/auth/callback/google?[REDACTED]",
    ],
    [
      "/api/auth/reset-password/secret?callbackURL=secret",
      "/api/auth/reset-password/[REDACTED]?[REDACTED]",
    ],
    [
      "/api/auth/%72eset-password/%73ecret",
      "/api/auth/reset-password/[REDACTED]",
    ],
    [
      "/api/auth/reset-password//secret/extra",
      "/api/auth/reset-password/[REDACTED]",
    ],
    ["/api/auth/reset-password/%ZZ", "[REDACTED_URL]"],
    ["https://user:secret@example.test/", "[REDACTED_URL]"],
  ])("sanitizes %s", (url, expected) => {
    expect(sanitizeRequestUrl(url)).toBe(expected);
  });

  it("never writes auth query values, reset tokens, or request headers into raw HTTP logs", async () => {
    let output = "";
    let receivedUrl = "";
    const logger = createLogger(config, {
      write: (line) => {
        output += line;
      },
    });
    const app = createApp({
      config,
      logger,
      database: { $queryRawUnsafe: async <T>() => [] as T },
      sessionResolver: async (req) => {
        receivedUrl = req.originalUrl;
        return null;
      },
      profileUpdater: async () => {
        throw new Error("unused");
      },
    });
    const urls = [
      "/api/auth/verify-email?token=verification-secret&callbackURL=redirect-secret",
      "/api/auth/callback/google?code=google-secret&state=state-secret",
      "/api/auth/callback/google/oauth-proxy?profile=profile-secret",
      "/api/auth/reset-password/reset-secret?callbackURL=redirect-secret",
      "/api/auth/%72eset-password/%65ncoded-secret",
    ];
    for (const url of urls) {
      await request(app)
        .get(url)
        .set("cookie", "session=cookie-secret")
        .set("authorization", "Bearer header-secret")
        .set("referer", "https://example.test/?token=referer-secret")
        .expect(404);
    }
    const originalUrl = "/api/v1/me?token=untouched-secret";
    await request(app).get(originalUrl).expect(401);
    expect(receivedUrl).toBe(originalUrl);
    logger.info(
      {
        res: {
          headers: {
            location: "https://example.test/?code=location-secret",
            "set-cookie": "session=response-cookie-secret",
          },
        },
      },
      "redirect",
    );
    for (const secret of [
      "verification-secret",
      "redirect-secret",
      "google-secret",
      "state-secret",
      "profile-secret",
      "reset-secret",
      "encoded-secret",
      "untouched-secret",
      "cookie-secret",
      "header-secret",
      "referer-secret",
      "location-secret",
      "response-cookie-secret",
    ]) {
      expect(output).not.toContain(secret);
    }
    const entries = output
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    for (const entry of entries.filter((entry) => entry.req)) {
      expect(entry.req.url).toContain("[REDACTED]");
      expect(entry.req).not.toHaveProperty("query");
      expect(entry.req).not.toHaveProperty("params");
      expect(entry.req).not.toHaveProperty("headers");
    }
  });
});
