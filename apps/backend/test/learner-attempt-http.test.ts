import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { LearnerAttempts } from "../src/exercises/learner-attempts.js";
import { createApp } from "../src/app.js";
import { readEnv } from "../src/config/env.js";
import { createLogger } from "../src/lib/logger.js";

const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://127.0.0.1:5173",
  CORS_ORIGINS: "http://127.0.0.1:5173",
  DATABASE_URL: "postgresql://test:test@127.0.0.1:55432/learner_test",
  BETTER_AUTH_URL: "http://127.0.0.1:5173",
  BETTER_AUTH_SECRET: "learner-attempt-http-secret-at-least-32",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "silent",
});
const body = {
  code: "print(1)",
  reasoning: "Fix the output",
  expectedRevision: null,
};
function fixture(module: LearnerAttempts) {
  return createApp({
    config,
    database: { $queryRawUnsafe: vi.fn() },
    learnerAttempts: module,
    sessionResolver: async (req) => ({
      id: "synthetic-learner",
      name: "Learner",
      email: "learner@example.test",
      role: req.header("x-role") === "INSTRUCTOR" ? "INSTRUCTOR" : "LEARNER",
    }),
    profileUpdater: vi.fn(),
    logger: createLogger(config, { write() {} }),
  });
}
describe("learner attempt HTTP boundary", () => {
  it("requires a learner and allowed origin/JSON before calling mutations", async () => {
    const save = vi.fn(),
      submit = vi.fn(),
      get = vi.fn();
    const app = fixture({ save, submit, get } as unknown as LearnerAttempts);
    await request(app)
      .put("/api/v1/learner/questions/q/attempt")
      .set("x-role", "INSTRUCTOR")
      .set("origin", config.appOrigin)
      .send(body)
      .expect(403);
    await request(app)
      .put("/api/v1/learner/questions/q/attempt")
      .set("origin", "https://attacker.example")
      .send(body)
      .expect(403);
    await request(app)
      .put("/api/v1/learner/questions/q/attempt")
      .send(body)
      .expect(403);
    await request(app)
      .put("/api/v1/learner/questions/q/attempt")
      .set("origin", config.appOrigin)
      .send({ ...body, learnerId: "forged" })
      .expect(400);
    expect(save).not.toHaveBeenCalled();
  });
  it("passes authenticated identity and strict attempt input to the injected service", async () => {
    const save = vi.fn().mockResolvedValue({ attempt: null });
    const app = fixture({
      save,
      submit: vi.fn(),
      get: vi.fn(),
    } as unknown as LearnerAttempts);
    const response = await request(app)
      .put("/api/v1/learner/questions/q/attempt")
      .set("origin", config.appOrigin)
      .send(body)
      .expect(200);
    expect(response.body).toEqual({ attempt: null });
    expect(save).toHaveBeenCalledWith("synthetic-learner", "q", body);
  });
  it("routes own-attempt reads and confirmed-submit requests to the injected service", async () => {
    const attempt = {
      id: "own-attempt",
      code: body.code,
      reasoning: body.reasoning,
      status: "DRAFT",
      revision: 0,
      submittedAt: null,
    };
    const get = vi.fn().mockResolvedValue({ attempt });
    const submit = vi.fn().mockResolvedValue({
      attempt: {
        ...attempt,
        status: "FINAL_SUBMITTED",
        submittedAt: "2026-11-06T12:00:00.000Z",
      },
    });
    const app = fixture({
      get,
      save: vi.fn(),
      submit,
    } as unknown as LearnerAttempts);
    await request(app)
      .get("/api/v1/learner/questions/q/attempt")
      .expect(200)
      .expect({ attempt });
    await request(app)
      .post("/api/v1/learner/questions/q/attempt/submit")
      .set("origin", config.appOrigin)
      .send({ ...body, expectedRevision: 0 })
      .expect(200);
    expect(get).toHaveBeenCalledWith("synthetic-learner", "q");
    expect(submit).toHaveBeenCalledWith("synthetic-learner", "q", {
      ...body,
      expectedRevision: 0,
    });
  });
});
