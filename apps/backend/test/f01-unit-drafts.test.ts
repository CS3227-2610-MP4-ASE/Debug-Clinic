import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { FakeAiProvider } from "../src/ai/provider.js";
import { createApp } from "../src/app.js";
import { readEnv } from "../src/config/env.js";
import type { DebugClinicPrisma } from "../src/db/client.js";
import { createInstructorDrafts } from "../src/exercises/instructor-drafts.js";
import { createLogger } from "../src/lib/logger.js";

const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://127.0.0.1:5173",
  CORS_ORIGINS: "http://127.0.0.1:5173",
  DATABASE_URL: "postgresql://127.0.0.1:55441/debugclinic_f01_test",
  BETTER_AUTH_URL: "http://127.0.0.1:5173",
  BETTER_AUTH_SECRET: "synthetic-secret-longer-than-thirty-two-characters",
  LOG_LEVEL: "silent",
});
const now = new Date("2026-11-05T01:00:00.000Z");
const provenance = {
  generationId: "generation",
  provider: "fake",
  model: null,
  promptVersion: "fake-question-v1",
  generatedAt: now.toISOString(),
  association: "instructor-reported",
};
const fields = {
  title: "Count all values",
  problemStatement: "Fix the counter",
  buggyCode: "  count = 1\n",
  expectedBehavior: "Start from zero",
  bugExplanation: "The initial count is one too high",
  correctedSolution: "  count = 0\n",
};
const row = {
  id: "draft-1",
  title: fields.title,
  description: fields.problemStatement,
  status: "DRAFT",
  createdAt: now,
  versions: [
    {
      topic: "Python loops",
      buggyCode: fields.buggyCode,
      expectedBehavior: fields.expectedBehavior,
      bugExplanation: fields.bugExplanation,
      correctedSolution: fields.correctedSolution,
      generationProvenance: provenance,
    },
  ],
};

function setup() {
  const usage = {
    create: vi.fn().mockResolvedValue({ id: "generation", createdAt: now }),
    findFirst: vi.fn().mockResolvedValue({
      id: "generation",
      generationTopicDigest: null,
      provider: "fake",
      model: null,
      promptVersion: "fake-question-v1",
      createdAt: now,
    }),
  };
  const exercise = {
    create: vi.fn().mockResolvedValue({ id: "draft-1" }),
    findFirst: vi.fn().mockResolvedValue(row),
    findMany: vi.fn().mockResolvedValue([]),
  };
  const exerciseVersion = {
    create: vi.fn().mockResolvedValue({ id: "version-1" }),
  };
  const transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) =>
    work({ exercise, exerciseVersion }),
  );
  const prisma = {
    aiUsageEvent: usage,
    exercise,
    exerciseVersion,
    $transaction: transaction,
  } as unknown as DebugClinicPrisma;
  const provider = new FakeAiProvider();
  const logger = createLogger(config);
  const log = vi.spyOn(logger, "error");
  const service = createInstructorDrafts({ prisma, provider, config, logger });
  return {
    usage,
    exercise,
    exerciseVersion,
    transaction,
    provider,
    log,
    service,
  };
}

describe("F01 draft module", () => {
  it("records a fresh server usage identity per generation without persisting a draft", async () => {
    const s = setup();
    const a = await s.service.generate("owner", " Python loops ");
    await s.service.generate("owner", "Python loops");
    expect(a.topic).toBe("Python loops");
    expect(a.generation).toEqual({
      id: "generation",
      provider: "fake",
      model: null,
      promptVersion: "fake-question-v1",
      generatedAt: now.toISOString(),
    });
    const first = s.usage.create.mock.calls[0]![0].data;
    const second = s.usage.create.mock.calls[1]![0].data;
    expect(first).toMatchObject({
      userId: "owner",
      attemptId: null,
      operation: "generate-question",
      status: "SUCCEEDED",
      inputTokens: null,
      outputTokens: null,
    });
    expect(first.requestId).not.toBe(second.requestId);
    expect(JSON.stringify(first)).not.toContain("Python loops");
    expect(s.transaction).not.toHaveBeenCalled();
  });
  it("does not return a preview if the success usage write fails", async () => {
    const s = setup();
    s.usage.create.mockRejectedValue(new Error("private SQL/topic"));
    await expect(
      s.service.generate("owner", "Python loops"),
    ).rejects.toMatchObject({ status: 503 });
    expect(s.usage.create).toHaveBeenCalledOnce();
    expect(s.log.mock.calls[0]?.[0]).toMatchObject({
      category: "USAGE_RECORDING_FAILED",
      operationId: expect.any(String),
    });
    expect(JSON.stringify(s.log.mock.calls)).not.toContain("private SQL");
  });
  it("retains a safe refusal when usage recording also fails", async () => {
    const s = setup();
    vi.spyOn(s.provider, "generateQuestion").mockResolvedValue({
      output: {
        schemaVersion: "f01-question-v1",
        kind: "rejected",
        reason: "vague",
      },
      inputTokens: null,
      outputTokens: null,
    });
    s.usage.create.mockRejectedValue(new Error("private provider text"));
    await expect(s.service.generate("owner", "stuff")).rejects.toMatchObject({
      status: 400,
      details: [{ path: "topic", message: expect.stringContaining("specify") }],
    });
    expect(s.usage.create.mock.calls[0]?.[0].data).toMatchObject({
      status: "REJECTED",
      errorCode: "TOPIC_REJECTED",
    });
  });
  it("turns malformed normalized results into one failed metadata record", async () => {
    const s = setup();
    vi.spyOn(s.provider, "generateQuestion").mockResolvedValue({
      output: {
        schemaVersion: "f01-question-v1",
        kind: "rejected",
        reason: "vague",
      },
      inputTokens: 2_147_483_648,
      outputTokens: null,
    });
    await expect(
      s.service.generate("owner", "Python loops"),
    ).rejects.toMatchObject({ status: 503 });
    expect(s.usage.create.mock.calls[0]?.[0].data).toMatchObject({
      status: "FAILED",
      inputTokens: null,
      outputTokens: null,
    });
  });
  it("saves edited code and server provenance in one transaction", async () => {
    const s = setup();
    const saved = await s.service.save("owner", {
      topic: "Python loops",
      draft: fields,
      generationId: "generation",
    });
    expect(saved.draft).toEqual({
      id: "draft-1",
      status: "DRAFT",
      topic: "Python loops",
      ...fields,
      provenance,
      createdAt: now.toISOString(),
    });
    expect(s.usage.findFirst.mock.calls[0]?.[0].where).toEqual({
      id: "generation",
      userId: "owner",
      operation: "generate-question",
      status: "SUCCEEDED",
    });
    expect(s.transaction).toHaveBeenCalledOnce();
    expect(s.exercise.create.mock.calls[0]?.[0].data).toEqual({
      title: fields.title,
      description: fields.problemStatement,
      authorId: "owner",
      status: "DRAFT",
      publishedAt: null,
    });
    expect(s.exerciseVersion.create.mock.calls[0]?.[0].data).toMatchObject({
      version: 1,
      language: "python",
      buggyCode: fields.buggyCode,
      generationProvenance: provenance,
    });
  });
  it("rejects an unavailable association before starting a write", async () => {
    const s = setup();
    s.usage.findFirst.mockResolvedValue(null);
    await expect(
      s.service.save("other", {
        topic: "Python loops",
        draft: fields,
        generationId: "generation",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(s.transaction).not.toHaveBeenCalled();
  });
  it("returns a safe failure if a version write prevents commit", async () => {
    const s = setup();
    s.exerciseVersion.create.mockRejectedValue(new Error("private SQL"));
    await expect(
      s.service.save("owner", {
        topic: "Python loops",
        draft: fields,
        generationId: "generation",
      }),
    ).rejects.toMatchObject({
      status: 503,
      message: "The draft could not be saved; try again",
    });
  });
  it("checks unsigned pagination before Prisma and rejects next-page overflow", async () => {
    const s = setup();
    await expect(s.service.list("owner", 4_294_967_296)).rejects.toThrow();
    expect(s.exercise.findMany).not.toHaveBeenCalled();
    s.exercise.findMany.mockResolvedValue(
      Array.from({ length: 51 }, () => row),
    );
    await expect(s.service.list("owner", 4_294_967_246)).rejects.toMatchObject({
      status: 400,
      message:
        "The requested draft page exceeds the supported pagination range",
    });
    expect((await s.service.list("owner", 4_294_967_245)).nextOffset).toBe(
      4_294_967_295,
    );
  });
  it("hides invalid stored provenance behind the same unavailable-draft response", async () => {
    const s = setup();
    s.exercise.findFirst.mockResolvedValue({
      ...row,
      versions: [
        { ...row.versions[0], generationProvenance: { secret: "private" } },
      ],
    });
    await expect(s.service.get("owner", "draft-1")).rejects.toMatchObject({
      status: 404,
      message: "Draft not found",
    });
    expect(s.exercise.findFirst.mock.calls[0]?.[0].where).toMatchObject({
      id: "draft-1",
      authorId: "owner",
      status: "DRAFT",
    });
  });
  it("validates stored list provenance without returning its internal JSON", async () => {
    const s = setup();
    s.exercise.findMany.mockResolvedValue([row]);
    expect(await s.service.list("owner")).toEqual({
      drafts: [
        {
          id: "draft-1",
          title: fields.title,
          topic: "Python loops",
          createdAt: now.toISOString(),
        },
      ],
      nextOffset: null,
    });
    s.exercise.findMany.mockResolvedValue([
      {
        ...row,
        versions: [
          {
            ...row.versions[0],
            generationProvenance: { private: "not provenance" },
          },
        ],
      },
    ]);
    await expect(s.service.list("owner")).rejects.toMatchObject({
      status: 503,
      message: "Your drafts could not be loaded; try again",
    });
  });
});

describe("F01 route access", () => {
  function app(role: "INSTRUCTOR" | "LEARNER" | null) {
    const s = setup();
    const generate = vi.spyOn(s.service, "generate");
    return {
      generate,
      app: createApp({
        config,
        database: { $queryRawUnsafe: vi.fn() },
        instructorDrafts: s.service,
        sessionResolver: async () =>
          role
            ? {
                id: "owner",
                name: "Synthetic",
                email: "owner@example.test",
                role,
              }
            : null,
        profileUpdater: vi.fn(),
      }),
    };
  }
  it.each([
    [null, 401],
    ["LEARNER", 403],
  ] as const)("denies %s before provider work", async (role, status) => {
    const s = app(role);
    expect(
      (
        await request(s.app)
          .post("/api/v1/instructor/questions/generate")
          .set("Origin", config.appOrigin)
          .send({ topic: "Python loops" })
      ).status,
    ).toBe(status);
    expect(s.generate).not.toHaveBeenCalled();
  });
  it("requires exact allowed origin and JSON before generation", async () => {
    const s = app("INSTRUCTOR");
    expect(
      (
        await request(s.app)
          .post("/api/v1/instructor/questions/generate")
          .send({ topic: "Python loops" })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(s.app)
          .post("/api/v1/instructor/questions/generate")
          .set("Origin", config.appOrigin)
          .type("text")
          .send("Python loops")
      ).status,
    ).toBe(400);
    expect(s.generate).not.toHaveBeenCalled();
    expect(
      (
        await request(s.app)
          .post("/api/v1/instructor/questions/generate")
          .set("Origin", config.appOrigin)
          .send({ topic: "Python loops" })
      ).status,
    ).toBe(200);
  });
});
