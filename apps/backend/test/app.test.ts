import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrentUser } from "@debugclinic/contracts";

import { createApp, type ProfileUpdater } from "../src/app.js";
import type { SessionResolver } from "../src/auth/session.js";
import type { AppConfig } from "../src/config/env.js";
import type { LearnerAssistant } from "../src/exercises/learner-assistant.js";
import type { LearnerDashboard } from "../src/exercises/learner-dashboard.js";
import { PassThrough } from "node:stream";
import { createLogger } from "../src/lib/logger.js";

const config: AppConfig = {
  nodeEnv: "test",
  port: 3001,
  appOrigin: "http://localhost:5173",
  corsOrigins: ["http://localhost:5173"],
  databaseUrl: "postgresql://user:password@localhost:5432/test",
  runtimeDatabaseUrl: "postgresql://user:password@localhost:5432/test",
  betterAuthUrl: "http://localhost:5173",
  betterAuthSecret: "test-secret-with-more-than-thirty-two-characters",
  aiProvider: "fake",
  aiTimeoutMs: 1_000,
  aiMaxRetries: 0,
  logLevel: "silent",
};

const learner: CurrentUser = {
  id: "learner-1",
  name: "Dev Learner",
  email: "learner@example.test",
  role: "LEARNER",
};

const instructor: CurrentUser = {
  id: "instructor-1",
  name: "Dev Instructor",
  email: "instructor@example.test",
  role: "INSTRUCTOR",
};

const circularFailure = new Error("PRIVATE_CANARY");
circularFailure.cause = circularFailure;

const sessionResolver: SessionResolver = async (req) => {
  const token = req.header("authorization");
  if (token === "Bearer learner") return learner;
  if (token === "Bearer instructor") return instructor;
  return null;
};

function buildApp(options?: {
  databaseFailure?: boolean;
  learnerAssistant?: LearnerAssistant;
  learnerDashboard?: LearnerDashboard;
  profileUpdater?: ProfileUpdater;
}) {
  return createApp({
    config,
    database: {
      $queryRawUnsafe: options?.databaseFailure
        ? vi.fn().mockRejectedValue(new Error("offline"))
        : vi.fn().mockResolvedValue([{ result: 1 }]),
    },
    sessionResolver,
    ...(options?.learnerAssistant
      ? { learnerAssistant: options.learnerAssistant }
      : {}),
    ...(options?.learnerDashboard
      ? { learnerDashboard: options.learnerDashboard }
      : {}),
    profileUpdater:
      options?.profileUpdater ??
      ((async (id, name) => ({
        ...learner,
        id,
        name,
      })) satisfies ProfileUpdater),
  });
}

describe("DebugClinic API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("serves health and readiness probes", async () => {
    const app = buildApp();
    const health = await request(app).get("/api/health").expect(200);
    const ready = await request(app).get("/api/ready").expect(200);
    expect(health.body.status).toBe("ok");
    expect(ready.body.status).toBe("ready");
    expect(health.headers["x-request-id"]).toBeTruthy();
  });

  it("reports database readiness failures without leaking internals", async () => {
    const response = await request(buildApp({ databaseFailure: true }))
      .get("/api/ready")
      .expect(503);
    expect(response.body.error.code).toBe("DEPENDENCY_UNAVAILABLE");
    expect(JSON.stringify(response.body)).not.toContain("offline");
  });

  it.each([
    [
      {
        meta: {
          driverAdapterError: {
            cause: {
              kind: "TlsConnectionError",
              reason: "self-signed certificate PRIVATE_CANARY",
            },
          },
        },
      },
      "tls",
    ],
    [{ cause: { code: "28P01", message: "PRIVATE_CANARY" } }, "credentials"],
    [{ code: "ENOTFOUND", message: "PRIVATE_CANARY" }, "connectivity"],
    [{ cause: { kind: "DatabaseDoesNotExist" } }, "target"],
    [{ cause: { originalCode: "53300" } }, "capacity"],
    [circularFailure, "unknown"],
    [new Error("PRIVATE_CANARY"), "unknown"],
  ])(
    "logs only a safe category when the readiness query fails",
    async (failure, expected) => {
      const output = new PassThrough();
      let logs = "";
      output.on("data", (chunk) => {
        logs += String(chunk);
      });
      const app = createApp({
        config,
        database: { $queryRawUnsafe: vi.fn().mockRejectedValue(failure) },
        sessionResolver,
        profileUpdater: async () => learner,
        logger: createLogger({ ...config, logLevel: "info" }, output),
      });
      const response = await request(app).get("/api/ready").expect(503);
      const entries = logs
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      expect(entries).toContainEqual(
        expect.objectContaining({
          category: "database_readiness_failure",
          reason: expected,
          requestId: response.headers["x-request-id"],
        }),
      );
      expect(logs + JSON.stringify(response.body)).not.toContain(
        "PRIVATE_CANARY",
      );
      expect(logs).not.toContain(config.runtimeDatabaseUrl);
    },
  );

  it("rejects missing and revoked sessions", async () => {
    await request(buildApp()).get("/api/v1/me").expect(401);
    await request(buildApp())
      .get("/api/v1/me")
      .set("authorization", "Bearer revoked")
      .expect(401);
  });

  it("enforces instructor authorization on the API", async () => {
    await request(buildApp())
      .get("/api/v1/instructor/ping")
      .set("authorization", "Bearer learner")
      .expect(403);
    await request(buildApp())
      .get("/api/v1/instructor/ping")
      .set("authorization", "Bearer instructor")
      .expect(200);
  });

  it("rejects client-provided role escalation", async () => {
    const updater = vi.fn<ProfileUpdater>();
    const response = await request(buildApp({ profileUpdater: updater }))
      .patch("/api/v1/profile")
      .set("authorization", "Bearer learner")
      .send({ name: "Learner", role: "INSTRUCTOR" })
      .expect(400);
    expect(response.body.error.code).toBe("BAD_REQUEST");
    expect(updater).not.toHaveBeenCalled();
  });

  it("returns safe NOT_FOUND for the retired caller-selected hint route", async () => {
    const response = await request(buildApp())
      .post("/api/v1/ai/hint-preview")
      .set("authorization", "Bearer learner")
      .send({
        attemptId: "attempt-1",
        proposedCode: "pass",
        reasoning: "test",
        stage: 3,
      })
      .expect(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("protects assistant reads and origin-checks learner mutations", async () => {
    const state = {
      exerciseVersionId: "version-1",
      revision: 0,
      unlockedLevel: 1,
      hasSuccessfulReply: false,
      readOnly: false,
      expiresAt: null,
      messages: [],
    } as const;
    const service: LearnerAssistant = {
      get: vi.fn().mockResolvedValue(state),
      send: vi.fn().mockResolvedValue({ assistant: state }),
      clear: vi.fn().mockResolvedValue(state),
      reconcile: vi.fn().mockResolvedValue({
        requestId: "c7ee4994-572d-4a87-aeaa-7a0e5e30a5ad",
        status: "FAILED",
        reply: null,
      }),
      cleanupExpired: vi.fn().mockResolvedValue(0),
    };
    const app = buildApp({ learnerAssistant: service });
    const path = "/api/v1/learner/questions/exercise-1/assistant";
    await request(app).get(path).expect(401);
    await request(app)
      .get(path)
      .set("authorization", "Bearer instructor")
      .expect(403);
    const read = await request(app)
      .get(path)
      .set("authorization", "Bearer learner")
      .expect(200);
    expect(read.body.assistant.unlockedLevel).toBe(1);
    expect(service.get).toHaveBeenCalledTimes(1);

    const body = {
      requestId: "c7ee4994-572d-4a87-aeaa-7a0e5e30a5ad",
      expectedRevision: 0,
      expectedExerciseVersionId: "version-1",
      action: "MESSAGE",
      message: "What should I trace?",
      context: { shareCode: false, shareReasoning: false, shareOutput: false },
    };
    await request(app)
      .post(`${path}/messages`)
      .set("authorization", "Bearer learner")
      .send(body)
      .expect(403);
    expect(service.send).not.toHaveBeenCalled();
    await request(app)
      .post(`${path}/messages`)
      .set("authorization", "Bearer learner")
      .set("origin", config.appOrigin)
      .send(body)
      .expect(200);
    expect(service.send).toHaveBeenCalledWith(
      "learner-1",
      "exercise-1",
      expect.objectContaining({ action: "MESSAGE" }),
    );
  });

  it("protects dashboard reads and derives identity from the learner session", async () => {
    const get = vi.fn().mockResolvedValue({
      attemptedCount: 2,
      completedCount: 1,
      inProgressCount: 1,
      recentDrafts: [],
    });
    const app = buildApp({ learnerDashboard: { get } });
    await request(app).get("/api/v1/learner/dashboard").expect(401);
    await request(app)
      .get("/api/v1/learner/dashboard")
      .set("authorization", "Bearer instructor")
      .expect(403);
    const response = await request(app)
      .get("/api/v1/learner/dashboard?learnerId=learner-2")
      .set("authorization", "Bearer learner")
      .expect(200);
    expect(response.body.attemptedCount).toBe(2);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("learner-1");
  });

  it("handles malformed and oversized assistant JSON without exposing body text", async () => {
    const malformed = await request(buildApp())
      .post("/api/v1/learner/questions/exercise-1/assistant/messages")
      .set("content-type", "application/json")
      .send('{"apiKey":"MALFORMED_BODY_SENTINEL", invalid}')
      .expect(400);
    expect(malformed.body.error.code).toBe("BAD_REQUEST");
    expect(JSON.stringify(malformed.body)).not.toContain(
      "MALFORMED_BODY_SENTINEL",
    );

    const oversized = await request(buildApp())
      .post("/api/v1/learner/questions/exercise-1/assistant/messages")
      .send({
        message: "x".repeat(65 * 1024),
        apiKey: "OVERSIZED_BODY_SENTINEL",
      })
      .expect(413);
    expect(oversized.body.error.code).toBe("BAD_REQUEST");
    expect(JSON.stringify(oversized.body)).not.toContain(
      "OVERSIZED_BODY_SENTINEL",
    );
  });

  it("does not expose unknown errors just because they declare a client status", async () => {
    const response = await request(
      buildApp({
        profileUpdater: async () => {
          throw Object.assign(new Error("private-internal-error"), {
            status: 400,
          });
        },
      }),
    )
      .patch("/api/v1/profile")
      .set("authorization", "Bearer learner")
      .send({ name: "Learner" })
      .expect(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(response.body)).not.toContain(
      "private-internal-error",
    );
  });
});
