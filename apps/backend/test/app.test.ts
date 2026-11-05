import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrentUser } from "@debugclinic/contracts";

import { FakeAiProvider, type AiProvider } from "../src/ai/provider.js";
import { createApp, type ProfileUpdater } from "../src/app.js";
import type { SessionResolver } from "../src/auth/session.js";
import type { AppConfig } from "../src/config/env.js";
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
  aiProvider?: AiProvider;
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
    aiProvider: options?.aiProvider ?? new FakeAiProvider(),
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

  it("returns deterministic, schema-valid fake AI coaching", async () => {
    const response = await request(buildApp())
      .post("/api/v1/ai/hint-preview")
      .set("authorization", "Bearer learner")
      .send({
        attemptId: "attempt-1",
        proposedCode: "print(value)",
        reasoning: "The value may be uninitialized.",
        stage: 1,
      })
      .expect(200);
    expect(response.body.kind).toBe("HINT");
    expect(response.body.stage).toBe(1);
  });

  it("rejects invalid AI output", async () => {
    const invalidProvider: AiProvider = {
      generateHint: vi.fn().mockResolvedValue({ message: "missing fields" }),
    };
    const response = await request(buildApp({ aiProvider: invalidProvider }))
      .post("/api/v1/ai/hint-preview")
      .set("authorization", "Bearer learner")
      .send({
        attemptId: "attempt-1",
        proposedCode: "pass",
        reasoning: "Testing",
        stage: 1,
      })
      .expect(503);
    expect(response.body.error.code).toBe("DEPENDENCY_UNAVAILABLE");
  });

  it("does not shape provider failures as successful responses", async () => {
    const failingProvider: AiProvider = {
      generateHint: vi.fn().mockRejectedValue(new Error("provider secret")),
    };
    const response = await request(buildApp({ aiProvider: failingProvider }))
      .post("/api/v1/ai/hint-preview")
      .set("authorization", "Bearer learner")
      .send({
        attemptId: "attempt-1",
        proposedCode: "pass",
        reasoning: "Testing",
        stage: 1,
      })
      .expect(503);
    expect(JSON.stringify(response.body)).not.toContain("provider secret");
  });

  it("returns safe validation errors for malformed requests", async () => {
    const response = await request(buildApp())
      .post("/api/v1/ai/hint-preview")
      .set("authorization", "Bearer learner")
      .send({ stage: 9 })
      .expect(400);
    expect(response.body.error.code).toBe("BAD_REQUEST");
    expect(response.body.error.requestId).toBeTruthy();
  });

  it("returns 400 for invalid raw JSON without exposing its contents", async () => {
    const response = await request(buildApp())
      .post("/api/v1/ai/hint-preview")
      .set("content-type", "application/json")
      .send('{"password":"parser-secret", invalid}')
      .expect(400);
    expect(response.body.error.code).toBe("BAD_REQUEST");
    expect(response.body.error.requestId).toBeTruthy();
    expect(response.body.error.message).toContain("valid JSON");
    expect(JSON.stringify(response.body)).not.toContain("parser-secret");
    expect(response.body).not.toHaveProperty("stack");
  });

  it("returns 413 for JSON above the 64kb limit", async () => {
    const response = await request(buildApp())
      .post("/api/v1/ai/hint-preview")
      .send({ reasoning: "x".repeat(65 * 1024), password: "large-body-secret" })
      .expect(413);
    expect(response.body.error.code).toBe("BAD_REQUEST");
    expect(response.body.error.requestId).toBeTruthy();
    expect(response.body.error.message).toContain("64kb");
    expect(JSON.stringify(response.body)).not.toContain("large-body-secret");
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
