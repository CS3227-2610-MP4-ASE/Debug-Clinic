import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { readEnv } from "../src/config/env.js";
import { createLogger } from "../src/lib/logger.js";
import { AppError } from "../src/lib/errors.js";
import type { InstructorQuestions } from "../src/exercises/instructor-questions.js";
const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://127.0.0.1:5173",
  CORS_ORIGINS: "http://127.0.0.1:5173",
  DATABASE_URL:
    "postgresql://synthetic:synthetic@127.0.0.1:55432/debugclinic_f02_test",
  BETTER_AUTH_URL: "http://127.0.0.1:5173",
  BETTER_AUTH_SECRET: "f02-http-synthetic-secret-at-least-32-characters",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "info",
});
const draft = {
  title: "Sum all values",
  problemStatement: "Fix it",
  buggyCode: "print(1)",
  expectedBehavior: "Print 1",
  bugExplanation: "Private explanation",
  correctedSolution: "print(2)",
};
const payload = {
  source: "saved",
  id: "question",
  expectedRevision: 0,
  topic: "Python lists",
  draft,
  reviewConfirmed: true,
};
function fixture(module?: InstructorQuestions) {
  const logs: string[] = [];
  const logger = createLogger(config, {
    write(chunk) {
      logs.push(chunk);
    },
  });
  const app = createApp({
    config,
    database: { $queryRawUnsafe: vi.fn() },
    logger,
    ...(module ? { instructorQuestions: module } : {}),
    sessionResolver: async (req) => ({
      id: "instructor",
      name: "Instructor",
      email: "synthetic@example.test",
      role: req.header("x-role") === "LEARNER" ? "LEARNER" : "INSTRUCTOR",
    }),
    profileUpdater: vi.fn(),
  });
  return { app, logs };
}
describe("F02 HTTP middleware doubles (no PG claim)", () => {
  it("B43 missing composition safely denies all question endpoints", async () => {
    const { app } = fixture();
    for (const path of [
      "/api/v1/instructor/questions?status=DRAFT",
      "/api/v1/instructor/questions/question",
      "/api/v1/learner/questions",
      "/api/v1/learner/questions/question",
    ]) {
      await request(app)
        .get(path)
        .set("x-role", path.includes("learner") ? "LEARNER" : "INSTRUCTOR")
        .expect(503);
    }
    const result = await request(app)
      .post("/api/v1/instructor/questions/publish")
      .set("origin", config.appOrigin)
      .send(payload)
      .expect(503);
    expect(result.body.error.mutationOutcome).toBe("NOT_APPLIED");
  });
  it("B17 unexpected mutation errors are UNKNOWN and never log protected internals", async () => {
    const publish = vi
      .fn()
      .mockRejectedValue(new Error("F02_PRIVATE_SQL_AND_CONTENT"));
    const { app, logs } = fixture({
      publish,
    } as unknown as InstructorQuestions);
    const result = await request(app)
      .post("/api/v1/instructor/questions/publish")
      .set("origin", config.appOrigin)
      .send(payload)
      .expect(500);
    expect(result.body.error).toMatchObject({
      code: "INTERNAL_ERROR",
      mutationOutcome: "UNKNOWN",
      requestId: expect.any(String),
    });
    expect(JSON.stringify(result.body) + logs.join("")).not.toContain(
      "F02_PRIVATE",
    );
    publish.mockRejectedValueOnce(
      new AppError(
        503,
        "DEPENDENCY_UNAVAILABLE",
        "Publication outcome is unconfirmed. Retry to resolve the same reviewed question.",
        undefined,
        "UNKNOWN",
      ),
    );
    const unknown = await request(app)
      .post("/api/v1/instructor/questions/publish")
      .set("origin", config.appOrigin)
      .send(payload)
      .expect(503);
    expect(unknown.body.error.mutationOutcome).toBe("UNKNOWN");
  });
  it("B33 strict queries and unconfirmed publication fail before the module", async () => {
    const publish = vi.fn();
    const { app } = fixture({ publish } as unknown as InstructorQuestions);
    for (const body of [
      { ...payload, reviewConfirmed: false },
      { ...payload, source: "invalid" },
      { ...payload, expectedRevision: -1 },
      { ...payload, ownerId: "forged" },
    ]) {
      await request(app)
        .post("/api/v1/instructor/questions/publish")
        .set("origin", config.appOrigin)
        .send(body)
        .expect(400);
    }
    for (const query of [
      "",
      "?status=VERIFIED",
      "?status=DRAFT&offset=-1",
      "?status=DRAFT&offset=0&offset=1",
      "?status=DRAFT&extra=1",
    ]) {
      await request(app)
        .get(`/api/v1/instructor/questions${query}`)
        .expect(400);
    }
    expect(publish).not.toHaveBeenCalled();
  });
});
