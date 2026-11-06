// Independent HTTP denial and failure matrix; service/session are explicit doubles.
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { readEnv } from "../src/config/env.js";
import type { LearnerAttempts } from "../src/exercises/learner-attempts.js";
import { AppError } from "../src/lib/errors.js";
import { createLogger } from "../src/lib/logger.js";

const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://127.0.0.1:5173",
  CORS_ORIGINS: "http://127.0.0.1:5173",
  DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:55432/offline_test",
  BETTER_AUTH_URL: "http://127.0.0.1:5173",
  BETTER_AUTH_SECRET: "independent-http-only-synthetic-secret-32",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "silent",
});
const input = {
  code: "print('PRIVATE_CODE')\n",
  reasoning: "PRIVATE_REASONING",
  expectedRevision: null,
};
function fixture(service?: LearnerAttempts) {
  return createApp({
    config,
    database: { $queryRawUnsafe: vi.fn() },
    ...(service ? { learnerAttempts: service } : {}),
    sessionResolver: async (req) =>
      req.header("x-test-user") === "none"
        ? null
        : {
            id: "authenticated-learner",
            name: "Synthetic",
            email: "synthetic@example.test",
            role:
              req.header("x-test-user") === "instructor"
                ? "INSTRUCTOR"
                : "LEARNER",
          },
    profileUpdater: vi.fn(),
    logger: createLogger(config, { write() {} }),
  });
}
const routes = [
  {
    method: "get",
    path: "/api/v1/learner/questions/q/attempt",
    service: "get",
  },
  {
    method: "put",
    path: "/api/v1/learner/questions/q/attempt",
    service: "save",
  },
  {
    method: "post",
    path: "/api/v1/learner/questions/q/attempt/submit",
    service: "submit",
  },
] as const;
describe("independent learner attempt HTTP acceptance", () => {
  for (const route of routes) {
    for (const [user, status] of [
      ["none", 401],
      ["instructor", 403],
    ] as const) {
      it(`${route.method} rejects ${user} before any attempt dependency call`, async () => {
        const service = { get: vi.fn(), save: vi.fn(), submit: vi.fn() };
        await request(fixture(service))
          [route.method](route.path)
          .set("x-test-user", user)
          .set("origin", config.appOrigin)
          .send(route.method === "get" ? undefined : input)
          .expect(status);
        for (const method of Object.values(service))
          expect(method).not.toHaveBeenCalled();
      });
    }
    it(`${route.method} maps absent production dependency to a safe retryable 503`, async () => {
      const response = await request(fixture())
        [route.method](route.path)
        .set("origin", config.appOrigin)
        .send(route.method === "get" ? undefined : input)
        .expect(503);
      expect(response.body.error).toMatchObject({
        code: "DEPENDENCY_UNAVAILABLE",
        requestId: expect.any(String),
      });
      expect(JSON.stringify(response.body)).not.toMatch(
        /PRIVATE_CODE|PRIVATE_REASONING|postgresql|stack|Prisma/,
      );
    });
  }
  for (const route of routes.filter((route) => route.method !== "get")) {
    for (const [label, origin, contentType, status] of [
      ["missing Origin", null, "application/json", 403],
      [
        "foreign Origin",
        "https://foreign.example.test",
        "application/json",
        403,
      ],
      ["non-JSON body", config.appOrigin, "text/plain", 400],
    ] as const) {
      it(`${route.method} rejects ${label} before persistence`, async () => {
        const service = { get: vi.fn(), save: vi.fn(), submit: vi.fn() };
        const req = request(fixture(service))
          [route.method](route.path)
          .set("content-type", contentType);
        if (origin) req.set("origin", origin);
        await req.send(JSON.stringify(input)).expect(status);
        for (const method of Object.values(service))
          expect(method).not.toHaveBeenCalled();
      });
    }
    for (const [name, body, status] of [
      ["malformed JSON", "{", 400],
      [
        "oversized JSON",
        JSON.stringify({ code: "PRIVATE_CODE".repeat(7000) }),
        413,
      ],
      [
        "forged authority",
        JSON.stringify({
          ...input,
          learnerId: "other",
          versionId: "other",
          status: "FINAL_SUBMITTED",
        }),
        400,
      ],
      [
        "UTF16 code overflow",
        JSON.stringify({ ...input, code: "😀".repeat(10000) + "x" }),
        400,
      ],
      [
        "UTF16 reasoning overflow",
        JSON.stringify({ ...input, reasoning: "😀".repeat(2500) + "x" }),
        400,
      ],
      ["blank code", JSON.stringify({ ...input, code: " \n\t" }), 400],
      [
        "blank reasoning",
        JSON.stringify({ ...input, reasoning: " \n\t" }),
        400,
      ],
    ] as const) {
      it(`${route.method} rejects ${name} without invoking persistence or returning private input`, async () => {
        const service = { get: vi.fn(), save: vi.fn(), submit: vi.fn() };
        const response = await request(fixture(service))
          [route.method](route.path)
          .set("origin", config.appOrigin)
          .set("content-type", "application/json")
          .send(body)
          .expect(status);
        expect(response.body.error).toMatchObject({
          code: "BAD_REQUEST",
          requestId: expect.any(String),
          mutationOutcome: "NOT_APPLIED",
        });
        expect(JSON.stringify(response.body)).not.toMatch(
          /PRIVATE_CODE|PRIVATE_REASONING|postgresql|stack/,
        );
        for (const method of Object.values(service))
          expect(method).not.toHaveBeenCalled();
      });
    }
    it(`${route.method} retains safe conflict outcome semantics`, async () => {
      const service = { get: vi.fn(), save: vi.fn(), submit: vi.fn() };
      service[route.service].mockRejectedValue(
        new AppError(
          409,
          "CONFLICT",
          "Reload before saving",
          undefined,
          "NOT_APPLIED",
        ),
      );
      const response = await request(fixture(service))
        [route.method](route.path)
        .set("origin", config.appOrigin)
        .send(input)
        .expect(409);
      expect(response.body.error).toMatchObject({
        code: "CONFLICT",
        mutationOutcome: "NOT_APPLIED",
      });
    });
  }
});
