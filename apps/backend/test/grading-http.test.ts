import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp, type CreateAppOptions } from "../src/app.js";
import type { Grading } from "../src/exercises/grading.js";
import { readEnv } from "../src/config/env.js";
import { AppError } from "../src/lib/errors.js";
import { createLogger } from "../src/lib/logger.js";

const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://127.0.0.1:5173",
  CORS_ORIGINS: "http://127.0.0.1:5173",
  DATABASE_URL: "postgresql://test:test@127.0.0.1:55432/grading_test",
  BETTER_AUTH_URL: "http://127.0.0.1:5173",
  BETTER_AUTH_SECRET: "grading-http-secret-at-least-32-characters",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "silent",
});

const submission = {
  attemptId: "owned-final",
  question: {
    title: "Count every item",
    problemStatement: "Fix the function to count every item.",
    expectedBehavior: "count([2, 4]) returns 2.",
  },
  learnerDisplayName: "Learner One",
  code: "def count(items):\n    return len(items)\n",
  reasoning: "Use the collection length.\n\nThe empty case is zero.\n",
  submittedAt: "2026-11-09T12:34:56.789Z",
  grade: null,
};

function fixture(
  grading: Partial<Grading>,
  overrides: Partial<Pick<CreateAppOptions, "config" | "logger">> = {},
) {
  return createApp({
    grading: grading as Grading,
    config,
    database: { $queryRawUnsafe: vi.fn() },
    sessionResolver: async (request) => {
      const role = request.header("x-synthetic-role");
      if (role === "ANONYMOUS") return null;
      return {
        id:
          role === "LEARNER"
            ? (request.header("x-synthetic-learner") ?? "learner")
            : "owner",
        name: "Synthetic User",
        email: "synthetic@example.test",
        role: role === "LEARNER" ? "LEARNER" : "INSTRUCTOR",
      };
    },
    profileUpdater: vi.fn(),
    ...overrides,
  });
}

describe("grading HTTP boundary", () => {
  it("serves an existing owned final with its exact submitted answer and no grade", async () => {
    const getInstructorDetail = vi.fn().mockResolvedValue({ submission });
    await request(fixture({ getInstructorDetail }))
      .get("/api/v1/instructor/submissions/owned-final")
      .expect(200)
      .expect({ submission });
    expect(getInstructorDetail).toHaveBeenCalledExactlyOnceWith(
      "owner",
      "owned-final",
    );
  });
  it("rejects an instructor identity mismatch before reading an owned final", async () => {
    const getInstructorDetail = vi.fn().mockResolvedValue({ submission });
    await request(fixture({ getInstructorDetail }))
      .get("/api/v1/instructor/submissions/owned-final")
      .set("x-debugclinic-actor", "different-user")
      .expect(403);
    expect(getInstructorDetail).not.toHaveBeenCalled();
  });

  it("saves a first grade as the instructor and reads only the score as the learner", async () => {
    const grade = {
      score: 6,
      revision: 1,
      savedAt: "2026-11-10T12:00:00.001Z",
    };
    const saveInstructorGrade = vi.fn().mockResolvedValue({ grade });
    const getLearnerGrade = vi.fn().mockResolvedValue({ grade: { score: 6 } });
    const app = fixture({ saveInstructorGrade, getLearnerGrade });
    await request(app)
      .put("/api/v1/instructor/submissions/owned-final/grade")
      .set("origin", config.appOrigin)
      .send({ score: 6, expectedRevision: null })
      .expect(200)
      .expect({ grade });
    await request(app)
      .get("/api/v1/learner/submissions/owned-final/grade")
      .set("x-synthetic-role", "LEARNER")
      .expect(200)
      .expect({ grade: { score: 6 } });
    expect(saveInstructorGrade).toHaveBeenCalledExactlyOnceWith(
      "owner",
      "owned-final",
      {
        score: 6,
        expectedRevision: null,
      },
    );
    expect(getLearnerGrade).toHaveBeenCalledExactlyOnceWith(
      "learner",
      "owned-final",
    );
  });

  it("returns a private complete response even with request validators", async () => {
    const getInstructorDetail = vi.fn().mockResolvedValue({ submission });
    await request(fixture({ getInstructorDetail }))
      .get("/api/v1/instructor/submissions/owned-final")
      .set("If-None-Match", "*")
      .set("If-Modified-Since", "Thu, 01 Jan 2099 00:00:00 GMT")
      .expect("Cache-Control", "private, no-store")
      .expect("Vary", /Cookie.*Origin/i)
      .expect(200)
      .expect({ submission });
  });

  it("allows credentialed grading preflight without exposing submission data", async () => {
    const app = fixture({});
    const response = await request(app)
      .options("/api/v1/instructor/submissions/owned-final/grade")
      .set("Origin", config.appOrigin)
      .set("Access-Control-Request-Method", "PUT")
      .set(
        "Access-Control-Request-Headers",
        "Content-Type, X-DebugClinic-Actor",
      )
      .set("x-synthetic-role", "ANONYMOUS")
      .expect("Access-Control-Allow-Credentials", "true")
      .expect("Access-Control-Allow-Headers", /X-DebugClinic-Actor/i)
      .expect("Cache-Control", "private, no-store")
      .expect(204);
    expect(response.text).toBe("");
    await request(app)
      .options("/api/v1/learner/submissions/owned-final/grade")
      .set("Origin", "https://foreign.example.test")
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "X-DebugClinic-Actor")
      .expect("Cache-Control", "private, no-store")
      .expect("Vary", /Cookie.*Origin/i)
      .expect(403);
  });

  it("rejects invalid grading PUT inputs with safe, definitive outcomes", async () => {
    const saveInstructorGrade = vi.fn();
    const app = fixture({ saveInstructorGrade });
    const path = "/api/v1/instructor/submissions/owned-final/grade";
    const missingOrigin = await request(app)
      .put(path)
      .send({ score: 8, expectedRevision: null })
      .expect(403);
    expect(missingOrigin.body.error).toMatchObject({
      code: "FORBIDDEN",
      mutationOutcome: "NOT_APPLIED",
    });
    for (const [body, expectedMessage] of [
      ['{"score":', "The request body must be valid JSON"],
      [
        '{"score":"8","expectedRevision":null}',
        "Enter a whole number from 1 to 10.",
      ],
      [
        '{"score":8,"expectedRevision":null,"injected":true}',
        "The request was invalid",
      ],
    ] as const) {
      const rejected = await request(app)
        .put(path)
        .set("Origin", config.appOrigin)
        .set("Content-Type", "application/json")
        .send(body)
        .expect("Cache-Control", "private, no-store")
        .expect(400);
      expect(rejected.body.error).toMatchObject({
        code: "BAD_REQUEST",
        message: expectedMessage,
        mutationOutcome: "NOT_APPLIED",
      });
    }
    expect(saveInstructorGrade).not.toHaveBeenCalled();
  });

  it("distinguishes a proven rejection from an invalid successful service response", async () => {
    const saveInstructorGrade = vi
      .fn()
      .mockRejectedValueOnce(
        new AppError(
          503,
          "DEPENDENCY_UNAVAILABLE",
          "Could not save",
          undefined,
          "NOT_APPLIED",
        ),
      )
      .mockResolvedValueOnce({ grade: { score: 8 } });
    const app = fixture({ saveInstructorGrade });
    const save = () =>
      request(app)
        .put("/api/v1/instructor/submissions/owned-final/grade")
        .set("Origin", config.appOrigin)
        .send({ score: 8, expectedRevision: null });
    const rollback = await save().expect(503);
    expect(rollback.body.error.mutationOutcome).toBe("NOT_APPLIED");
    const invalid = await save().expect(500);
    expect(invalid.body.error).toMatchObject({
      code: "INTERNAL_ERROR",
      mutationOutcome: "UNKNOWN",
    });
    expect(saveInstructorGrade).toHaveBeenCalledTimes(2);
  });

  it("rejects repeated list inputs and a cursor for another view before querying", async () => {
    const listInstructor = vi.fn();
    const app = fixture({ listInstructor });
    const path = "/api/v1/instructor/submissions";
    await request(app)
      .get(path + "?view=awaiting&view=graded")
      .expect(400);
    const cursor = Buffer.from(
      JSON.stringify({
        v: 1,
        scope: "learner-submissions",
        at: submission.submittedAt,
        attemptId: submission.attemptId,
      }),
    ).toString("base64url");
    await request(app).get(path).query({ cursor }).expect(400);
    expect(listInstructor).not.toHaveBeenCalled();
  });

  it("logs only safe metadata and generates the grading request ID server-side", async () => {
    const logs: string[] = [];
    const logger = createLogger(
      { ...config, logLevel: "info" },
      {
        write(message) {
          logs.push(message);
        },
      },
    );
    const app = fixture({}, { logger });
    const result = await request(app)
      .put(
        "/api/v1/instructor/submissions/raw-path-sentinel/grade?cursor=raw-query-sentinel",
      )
      .set("Origin", config.appOrigin)
      .set("X-Request-Id", "caller-id-sentinel")
      .set("Content-Type", "application/json")
      .send('{"malformed-body-sentinel"')
      .expect("Cache-Control", "private, no-store")
      .expect(400);
    const requestId = result.headers["x-request-id"];
    expect(requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(result.body.error.requestId).toBe(requestId);
    expect(logs.map((entry) => JSON.parse(entry))).toContainEqual(
      expect.objectContaining({
        route: "/api/v1/instructor/submissions/:attemptId/grade",
        method: "PUT",
        statusCode: 400,
        category: "BAD_REQUEST",
        requestId,
      }),
    );
    expect(logs.join("") + result.text).not.toMatch(/sentinel/);
  });

  it("isolates the compact learner and ordinary IP allowances", async () => {
    const getLearnerGrade = vi.fn().mockResolvedValue({ grade: { score: 6 } });
    const app = fixture(
      { getLearnerGrade },
      { config: { ...config, nodeEnv: "development" } },
    );
    const poll = (learner: string) =>
      request(app)
        .get("/api/v1/learner/submissions/owned-final/grade")
        .set("x-synthetic-role", "LEARNER")
        .set("x-synthetic-learner", learner)
        .set("Origin", config.appOrigin);
    for (let attempt = 0; attempt < 120; attempt++) {
      await poll("learner").expect(200);
    }
    await poll("learner")
      .expect("Retry-After", /^\d+$/)
      .expect("Access-Control-Expose-Headers", "Retry-After")
      .expect(429);
    await poll("other-learner").expect(200);
    await request(app).get("/api/health").expect(200);
    expect(getLearnerGrade).toHaveBeenCalledTimes(121);
  });

  it("charges rejected compact reads to the ordinary IP allowance", async () => {
    const getLearnerGrade = vi.fn().mockResolvedValue({ grade: null });
    const app = fixture(
      { getLearnerGrade },
      { config: { ...config, nodeEnv: "development" } },
    );
    for (let attempt = 0; attempt < 120; attempt++) {
      await request(app)
        .get("/api/v1/learner/submissions/owned-final/grade?unexpected=true")
        .set("x-synthetic-role", "LEARNER")
        .expect(400);
    }
    await request(app).get("/api/health").expect(429);
    await request(app)
      .get("/api/v1/learner/submissions/owned-final/grade")
      .set("x-synthetic-role", "LEARNER")
      .expect(200);
    expect(getLearnerGrade).toHaveBeenCalledTimes(1);
  });
});
