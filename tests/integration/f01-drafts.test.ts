// Coordinator executes this suite serially on the assigned real PostgreSQL only.
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { PrismaPg } from "@prisma/adapter-pg";
import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PrismaClient } from "../../generated/prisma/client.js";
import { createApp } from "../../apps/backend/src/app.js";
import {
  FakeAiProvider,
  SocLlmProvider,
} from "../../apps/backend/src/ai/provider.js";
import { readEnv } from "../../apps/backend/src/config/env.js";
import type { DebugClinicPrisma } from "../../apps/backend/src/db/client.js";
import { createInstructorDrafts } from "../../apps/backend/src/exercises/instructor-drafts.js";
import { createLogger } from "../../apps/backend/src/lib/logger.js";
import { f01DatabaseUrl } from "../support/f01-database.js";
import {
  f01Draft,
  f01Edited,
  f01FieldLimits,
  f01Origin,
  f01Output,
  f01Topic,
} from "../support/f01-fixtures.js";

const url = f01DatabaseUrl();
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const suffix = randomUUID();
const owner = {
  id: `f01-owner-${suffix}`,
  name: "F01 Owner",
  email: `f01-owner-${suffix}@example.test`,
  role: "INSTRUCTOR" as const,
};
const other = {
  id: `f01-other-${suffix}`,
  name: "F01 Other",
  email: `f01-other-${suffix}@example.test`,
  role: "INSTRUCTOR" as const,
};
const learner = {
  id: `f01-learner-${suffix}`,
  name: "F01 Learner",
  email: `f01-learner-${suffix}@example.test`,
  role: "LEARNER" as const,
};
const userIds = [owner.id, other.id, learner.id];
const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: f01Origin,
  CORS_ORIGINS: f01Origin,
  DATABASE_URL: url,
  BETTER_AUTH_URL: f01Origin,
  BETTER_AUTH_SECRET: "f01-pg-synthetic-secret-at-least-thirty-two-characters",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "info",
});
function fixture(client: DebugClinicPrisma = prisma) {
  const logs: string[] = [];
  const logger = createLogger(config, {
    write(chunk) {
      logs.push(chunk);
    },
  });
  const provider = new FakeAiProvider();
  const generate = vi.fn().mockResolvedValue({
    output: f01Output,
    inputTokens: null,
    outputTokens: null,
  });
  provider.generateQuestion = generate;
  const module = createInstructorDrafts({
    prisma: client,
    provider,
    config,
    logger,
  });
  const app = createApp({
    config,
    database: client,
    logger,
    instructorDrafts: module,
    sessionResolver: async (req) =>
      ({ owner, other, learner })[
        req.header("x-f01-user") as "owner" | "other" | "learner"
      ] ?? null,
    profileUpdater: async () => owner,
  });
  return { app, generate, logs, module };
}
function post(
  app: ReturnType<typeof createApp>,
  path: string,
  body: Record<string, unknown>,
  user = "owner",
) {
  return request(app)
    .post(path)
    .set("x-f01-user", user)
    .set("origin", f01Origin)
    .send(body);
}
function list(app: ReturnType<typeof createApp>, user = "owner", query = "") {
  return request(app)
    .get(`/api/v1/instructor/drafts${query}`)
    .set("x-f01-user", user);
}
function get(app: ReturnType<typeof createApp>, id: string, user = "owner") {
  return request(app)
    .get(`/api/v1/instructor/drafts/${encodeURIComponent(id)}`)
    .set("x-f01-user", user);
}
async function generate(app: ReturnType<typeof createApp>, topic = f01Topic) {
  const response = await post(app, "/api/v1/instructor/questions/generate", {
    topic,
  }).expect(200);
  return response.body.generation.id as string;
}
function save(
  app: ReturnType<typeof createApp>,
  generationId: string,
  draft = f01Edited,
  topic = f01Topic,
) {
  return post(app, "/api/v1/instructor/drafts", {
    topic,
    draft,
    generationId,
  });
}
async function clean() {
  await prisma.exercise.deleteMany({ where: { authorId: { in: userIds } } });
  await prisma.aiUsageEvent.deleteMany({ where: { userId: { in: userIds } } });
}
beforeAll(async () => {
  const names = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT current_database() AS name`;
  // Verify the connected database, not the experiment-only database name.
  expect(names).toEqual([
    { name: decodeURIComponent(new URL(url).pathname.slice(1)) },
  ]);
  await prisma.user.createMany({
    data: [owner, other, learner].map((user) => ({
      ...user,
      emailVerified: true,
    })),
  });
});
beforeEach(clean);
afterAll(async () => {
  try {
    await clean();
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  } finally {
    await prisma.$disconnect();
  }
});

describe("F01 real PostgreSQL through public HTTP", () => {
  it("B05/B11/B14/B19/B20 preview is unsaved; all edits persist with server provenance and survive new app composition", async () => {
    const { app, logs } = fixture();
    const response = await post(app, "/api/v1/instructor/questions/generate", {
      topic: `  ${f01Topic}  `,
    })
      .set("x-request-id", "f01-inbound-repeated")
      .expect(200);
    expect(response.body.topic).toBe(f01Topic);
    expect(response.body.draft).toEqual(f01Draft);
    expect(response.body.generation).toMatchObject({
      provider: "fake",
      model: null,
      promptVersion: "fake-question-v1",
    });
    expect((await list(app).expect(200)).body).toEqual({
      drafts: [],
      nextOffset: null,
    });
    const generationId = response.body.generation.id as string;
    const usage = await prisma.aiUsageEvent.findUniqueOrThrow({
      where: { id: generationId },
    });
    expect(usage).toMatchObject({
      userId: owner.id,
      operation: "generate-question",
      attemptId: null,
      status: "SUCCEEDED",
      provider: "fake",
      model: null,
      promptVersion: "fake-question-v1",
      inputTokens: null,
      outputTokens: null,
      errorCode: null,
    });
    expect(usage.latencyMs).toBeGreaterThanOrEqual(0);
    expect(usage.requestId).toMatch(
      /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i,
    );
    expect(usage.requestId).not.toBe("f01-inbound-repeated");
    const rawEdited = {
      ...f01Edited,
      title: `  ${f01Edited.title}  `,
      problemStatement: `  ${f01Edited.problemStatement}  `,
    };
    const saved = (await save(app, generationId, rawEdited).expect(201)).body
      .draft;
    expect(saved).toMatchObject({
      status: "DRAFT",
      topic: f01Topic,
      ...f01Edited,
      provenance: {
        generationId,
        provider: "fake",
        model: null,
        promptVersion: "fake-question-v1",
        generatedAt: response.body.generation.generatedAt,
        association: "instructor-reported",
      },
    });
    expect(Object.keys(saved).sort()).toEqual(
      [
        "id",
        "status",
        "topic",
        ...Object.keys(f01Draft),
        "provenance",
        "createdAt",
      ].sort(),
    );
    expect((await get(fixture().app, saved.id).expect(200)).body.draft).toEqual(
      saved,
    );
    const integrity = await prisma.exercise.findUniqueOrThrow({
      where: { id: saved.id },
      include: { versions: { include: { hints: true, attempts: true } } },
    });
    expect(integrity).toMatchObject({
      authorId: owner.id,
      status: "DRAFT",
      publishedAt: null,
    });
    expect(integrity.versions).toHaveLength(1);
    expect(integrity.versions[0]).toMatchObject({
      version: 1,
      language: "python",
      hints: [],
      attempts: [],
    });
    expect(logs.join("")).not.toContain(f01Topic);
    expect(logs.join("")).not.toContain(f01Draft.buggyCode);
    expect(logs.join("")).not.toContain(f01Draft.problemStatement);
  });
  it("B01/B19 foreign, missing, legacy, non-DRAFT and corrupted provenance are indistinguishable404", async () => {
    const { app } = fixture();
    const id = (await save(app, await generate(app)).expect(201)).body.draft
      .id as string;
    const foreign = await get(app, id, "other").expect(404);
    const missing = await get(app, "f01-does-not-exist").expect(404);
    const legacy = await prisma.exercise.create({
      data: {
        title: "F01 legacy",
        description: "Old description",
        authorId: owner.id,
        versions: {
          create: {
            version: 1,
            buggyCode: "print(x)",
            expectedBehavior: "prints one",
          },
        },
      },
    });
    const old = await get(app, legacy.id).expect(404);
    await prisma.exerciseVersion.updateMany({
      where: { exerciseId: id },
      data: {
        generationProvenance: { unexpected: "f01-private-stored-value" },
      },
    });
    const corrupt = await get(app, id).expect(404);
    await prisma.exercise.update({
      where: { id: id },
      data: {
        status: "ARCHIVED",
        publishedAt: new Date("2026-11-06T00:00:00Z"),
        archivedAt: new Date("2026-11-06T00:00:01Z"),
      },
    });
    const archived = await get(app, id).expect(404);
    for (const r of [foreign, missing, old, corrupt, archived]) {
      expect(r.body.error).toMatchObject({
        code: "NOT_FOUND",
        message: missing.body.error.message,
      });
      expect(JSON.stringify(r.body)).not.toMatch(
        /Sum all values|Old description|f01-private-stored-value|bugExplanation|correctedSolution/,
      );
    }
    expect((await list(app).expect(200)).body).toEqual({
      drafts: [],
      nextOffset: null,
    });
    expect((await list(app, "other").expect(200)).body).toEqual({
      drafts: [],
      nextOffset: null,
    });
  });
  it("B17 repeat generationId creates distinct drafts; committed lost response remains discoverable without replay", async () => {
    const { app } = fixture();
    const id = await generate(app);
    const first = (await save(app, id).expect(201)).body.draft;
    // Discard the successful response as a deterministic lost-response observation.
    await save(app, id, {
      ...f01Edited,
      title: "Different edited draft",
    }).expect(201);
    const records = (await list(app).expect(200)).body.drafts;
    expect(records).toHaveLength(2);
    expect(new Set(records.map((row: { id: string }) => row.id)).size).toBe(2);
    expect(records.some((row: { id: string }) => row.id === first.id)).toBe(
      true,
    );
  });
  for (const topic of ["", "   ", "x".repeat(301), null, 42]) {
    it(`B03/B04 invalid topic ${JSON.stringify(topic)} does no provider work or writes`, async () => {
      const { app, generate: provider } = fixture();
      await post(app, "/api/v1/instructor/questions/generate", {
        topic,
      }).expect(400);
      expect(provider).not.toHaveBeenCalled();
      expect((await list(app).expect(200)).body.drafts).toEqual([]);
      expect(
        await prisma.aiUsageEvent.count({ where: { userId: owner.id } }),
      ).toBe(0);
    });
  }
  for (const length of [1, 2, 299, 300]) {
    it(`B04 valid structural topic JS length${length} retained exactly`, async () => {
      const { app, generate: provider } = fixture();
      const topic = "x".repeat(length);
      const result = await post(app, "/api/v1/instructor/questions/generate", {
        topic,
      }).expect(200);
      expect(result.body.topic).toBe(topic);
      expect(provider).toHaveBeenCalledWith({ topic });
    });
  }
  for (const reason of [
    "vague",
    "non_python",
    "out_of_level",
    "unrelated",
    "unsuitable",
  ]) {
    it(`B06/B11 refusal ${reason} records rejected usage but no draft`, async () => {
      const { app, generate: provider } = fixture();
      provider.mockResolvedValue({
        output: { schemaVersion: "f01-question-v1", kind: "rejected", reason },
        inputTokens: null,
        outputTokens: null,
      });
      const r = await post(app, "/api/v1/instructor/questions/generate", {
        topic: "stuff",
      }).expect(400);
      expect(r.body.error).toMatchObject({
        code: "BAD_REQUEST",
        details: [{ path: "topic", message: expect.any(String) }],
      });
      if (reason === "vague")
        expect(r.body.error.details[0].message).toMatch(/specif|clarif/i);
      const usage = await prisma.aiUsageEvent.findFirstOrThrow({
        where: { userId: owner.id },
      });
      expect(usage.status).toBe("REJECTED");
      expect(usage.errorCode).toEqual(expect.any(String));
      expect((await list(app).expect(200)).body.drafts).toEqual([]);
    });
  }
  it("B07/B11 invalid normalized result and upstream failure safe503; server request UUIDs ignore inbound collision", async () => {
    const { app, generate: provider, logs } = fixture();
    provider
      .mockRejectedValueOnce(new Error("f01-provider-private-code"))
      .mockResolvedValueOnce({
        output: f01Output,
        inputTokens: 2147483648,
        outputTokens: null,
      });
    for (let n = 0; n < 2; n++) {
      const r = await post(app, "/api/v1/instructor/questions/generate", {
        topic: f01Topic,
      })
        .set("x-request-id", "duplicate-inbound")
        .expect(503);
      expect(JSON.stringify(r.body)).not.toMatch(
        /f01-provider-private-code|stack|2147483648/,
      );
    }
    const events = await prisma.aiUsageEvent.findMany({
      where: { userId: owner.id },
    });
    expect(events).toHaveLength(2);
    expect(new Set(events.map((event) => event.requestId)).size).toBe(2);
    for (const event of events)
      expect(event).toMatchObject({
        status: "FAILED",
        inputTokens: null,
        outputTokens: null,
        attemptId: null,
      });
    expect(logs.join("")).not.toMatch(
      /f01-provider-private-code|Sum every list element|Python lists and for loops/,
    );
  });
  for (const key of [
    "ownerId",
    "status",
    "version",
    "language",
    "provenance",
  ]) {
    it(`B15 Save rejects client authority key ${key}`, async () => {
      const { app } = fixture();
      const generationId = await generate(app);
      await post(app, "/api/v1/instructor/drafts", {
        topic: f01Topic,
        draft: f01Edited,
        generationId,
        [key]: "spoofed",
      }).expect(400);
      expect((await list(app).expect(200)).body.drafts).toEqual([]);
    });
  }
  for (const [field, maximum] of Object.entries(f01FieldLimits)) {
    for (const value of ["", " \n ", null, 42, "x".repeat(maximum + 1)]) {
      it(`B15 Save ${field} rejects ${typeof value === "string" ? `length${value.length}` : String(value)}`, async () => {
        const { app } = fixture();
        const generationId = await generate(app);
        await post(app, "/api/v1/instructor/drafts", {
          topic: f01Topic,
          generationId,
          draft: { ...f01Edited, [field]: value },
        }).expect(400);
        expect((await list(app).expect(200)).body.drafts).toEqual([]);
      });
    }
    for (const length of [1, 2, maximum - 1, maximum]) {
      it(`B15 Save ${field} accepts structural JS length${length}`, async () => {
        const { app } = fixture();
        const generationId = await generate(app);
        const draft = { ...f01Edited, [field]: "x".repeat(length) };
        expect(
          (await save(app, generationId, draft).expect(201)).body.draft[field],
        ).toBe(draft[field as keyof typeof draft]);
      });
    }
  }
  for (const generationId of ["", "unknown", "x".repeat(129)]) {
    it(`B15 generation association rejects ID length${generationId.length}`, async () => {
      const { app } = fixture();
      await save(app, generationId).expect(400);
      expect((await list(app).expect(200)).body.drafts).toEqual([]);
    });
  }
  for (const status of ["SUCCEEDED", "REJECTED", "FAILED"] as const) {
    it(`B15 rejects ${status} event owned by another instructor`, async () => {
      const { app } = fixture();
      const usage = await prisma.aiUsageEvent.create({
        data: {
          userId: other.id,
          requestId: randomUUID(),
          operation: "generate-question",
          provider: "fake",
          model: null,
          promptVersion: "fake-question-v1",
          status,
        },
      });
      await save(app, usage.id).expect(400);
    });
  }
  for (const [operation, status] of [
    ["hint-preview", "SUCCEEDED"],
    ["generate-question", "REJECTED"],
    ["generate-question", "FAILED"],
  ] as const) {
    it(`B15 rejects own ${operation}/${status} association`, async () => {
      const { app } = fixture();
      const usage = await prisma.aiUsageEvent.create({
        data: {
          userId: owner.id,
          requestId: randomUUID(),
          operation,
          provider: "fake",
          promptVersion: "fake-question-v1",
          status,
        },
      });
      await save(app, usage.id).expect(400);
    });
  }
  for (const offset of [
    "-1",
    "1.5",
    "NaN",
    "4294967296",
    "4294967297",
    "9007199254740991",
    "0&offset=1",
    "0&extra=1",
  ]) {
    it(`B18 rejects offset ${offset} before database pagination`, async () => {
      const { app } = fixture();
      const r = await list(app, "owner", `?offset=${offset}`).expect(400);
      expect(r.body.error.code).toBe("BAD_REQUEST");
    });
  }
  for (const count of [0, 1, 49, 50, 51, 101]) {
    it(`B18 private fixed50 page traversal with ${count} tied-timestamp records`, async () => {
      const { app } = fixture();
      const generationId = await generate(app);
      const generatedAt = (
        await prisma.aiUsageEvent.findUniqueOrThrow({
          where: { id: generationId },
        })
      ).createdAt.toISOString();
      const provenance = {
        generationId,
        provider: "fake",
        model: null,
        promptVersion: "fake-question-v1",
        generatedAt,
        association: "instructor-reported",
      };
      const createdAt = new Date("2026-11-05T01:00:00.000Z");
      const ids: string[] = [];
      for (let i = 0; i < count; i++) {
        const id = `f01-page-${suffix}-${String(i).padStart(3, "0")}`;
        ids.push(id);
        await prisma.exercise.create({
          data: {
            id,
            title: `Page ${i}`,
            description: f01Draft.problemStatement,
            authorId: owner.id,
            createdAt,
            versions: {
              create: {
                version: 1,
                language: "python",
                buggyCode: f01Draft.buggyCode,
                expectedBehavior: f01Draft.expectedBehavior,
                topic: f01Topic,
                bugExplanation: f01Draft.bugExplanation,
                correctedSolution: f01Draft.correctedSolution,
                generationProvenance: provenance,
              },
            },
          },
        });
      }
      const seen: string[] = [];
      let nextOffset: number | null = 0;
      do {
        const result: {
          drafts: Array<{
            id: string;
            title: string;
            topic: string;
            createdAt: string;
          }>;
          nextOffset: number | null;
        } = (await list(app, "owner", `?offset=${nextOffset}`).expect(200))
          .body;
        expect(result.drafts.length).toBeLessThanOrEqual(50);
        for (const row of result.drafts) {
          expect(Object.keys(row).sort()).toEqual(
            ["id", "title", "topic", "createdAt"].sort(),
          );
          seen.push(row.id);
        }
        if (result.nextOffset !== null)
          expect(result.nextOffset).toBe(nextOffset + 50);
        nextOffset = result.nextOffset;
      } while (nextOffset !== null);
      expect(seen).toEqual(ids.sort().reverse());
      expect((await list(app, "other").expect(200)).body.drafts).toEqual([]);
    }, 20000);
  }
  it("B18 accepts upper unsigned offsets without wrap to existing first records", async () => {
    const { app } = fixture();
    await save(app, await generate(app)).expect(201);
    for (const offset of [4294967294, 4294967295])
      expect(
        (await list(app, "owner", `?offset=${offset}`).expect(200)).body,
      ).toEqual({ drafts: [], nextOffset: null });
  });
  it("B20 additive nullable fields leave old-write rows null and old content usable", async () => {
    const { app } = fixture();
    const legacy = await prisma.exercise.create({
      data: {
        title: "Old write",
        description: "Legacy description",
        authorId: owner.id,
        versions: {
          create: {
            version: 1,
            buggyCode: "print(missing)",
            expectedBehavior: "prints a value",
          },
        },
      },
      include: { versions: true },
    });
    expect(legacy.versions[0]).toMatchObject({
      topic: null,
      bugExplanation: null,
      correctedSolution: null,
      generationProvenance: null,
      buggyCode: "print(missing)",
    });
    await get(app, legacy.id).expect(404);
    expect((await list(app).expect(200)).body.drafts).toEqual([]);
  });
});

describe("F01 real PostgreSQL failure integrity", () => {
  it("B17 actual dropped HTTP Save response leaves committed draft visible without automatic replay", async () => {
    const { app } = fixture();
    const generationId = await generate(app);
    const server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/api/v1/instructor/drafts") {
        res.end = () => {
          res.destroy();
          return res;
        };
      }
      app(req, res);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    try {
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("Expected loopback address");
      await expect(
        fetch(`http://127.0.0.1:${address.port}/api/v1/instructor/drafts`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: f01Origin,
            "x-f01-user": "owner",
          },
          body: JSON.stringify({
            topic: f01Topic,
            draft: f01Edited,
            generationId,
          }),
        }),
      ).rejects.toThrow();
      const records = (await list(app).expect(200)).body.drafts;
      expect(records).toHaveLength(1);
      expect(
        (await get(app, records[0].id).expect(200)).body.draft,
      ).toMatchObject({ ...f01Edited, topic: f01Topic });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
  for (const rawCount of [
    0, 2147483646, 2147483647, 2147483648, 9007199254740991,
  ]) {
    it(`B11 SoC raw count${rawCount} crosses HTTP and real PostgreSQL safely`, async () => {
      const socConfig = {
        ...config,
        aiProvider: "soc" as const,
        socLlmEndpoint: "https://provider.example.test/chat/completions",
        socLlmModel: "f01-synthetic-model",
        socLlmApiKey: "f01-synthetic-key",
        aiMaxRetries: 0,
      };
      const transport = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          choices: [{ message: { content: JSON.stringify(f01Output) } }],
          usage: { prompt_tokens: rawCount, completion_tokens: rawCount },
        }),
      );
      const provider = new SocLlmProvider(socConfig, transport);
      const logger = createLogger({ ...socConfig, logLevel: "silent" });
      const app = createApp({
        config: socConfig,
        database: prisma,
        logger,
        instructorDrafts: createInstructorDrafts({
          prisma,
          provider,
          config: socConfig,
          logger,
        }),
        sessionResolver: async () => owner,
        profileUpdater: async () => owner,
      });
      const id = await generate(app);
      const expected = rawCount <= 2147483647 ? rawCount : null;
      expect(
        await prisma.aiUsageEvent.findUniqueOrThrow({ where: { id } }),
      ).toMatchObject({
        inputTokens: expected,
        outputTokens: expected,
        provider: "soc",
        model: "f01-synthetic-model",
        promptVersion: "soc-question-v2",
      });
      await save(app, id).expect(201);
      expect(transport).toHaveBeenCalledOnce();
    });
  }
  it("B18 nextOffset unsigned overflow uses explicit400, with a declared synthetic offset mapping", async () => {
    const { app } = fixture();
    const generationId = await generate(app);
    for (let i = 0; i < 51; i++)
      await save(app, generationId, {
        ...f01Edited,
        title: `Overflow fixture ${i}`,
      }).expect(201);
    let mappings = 0;
    // There are51 real PG rows, not billions. Only the DB pagination argument is
    // mapped to0 to expose the approved51st-row branch at the public module seam.
    const client = prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ operation, args, query }) {
            const pagination = args as { skip?: number };
            if (
              operation === "findMany" &&
              pagination.skip !== undefined &&
              pagination.skip >= 4294967244
            ) {
              pagination.skip = 0;
              mappings++;
            }
            return query(args);
          },
        },
      },
    }) as unknown as DebugClinicPrisma;
    const mappedApp = fixture(client).app;
    for (const [offset, nextOffset] of [
      [4294967244, 4294967294],
      [4294967245, 4294967295],
    ]) {
      const result = (
        await list(mappedApp, "owner", `?offset=${offset}`).expect(200)
      ).body;
      expect(result.drafts).toHaveLength(50);
      expect(result.nextOffset).toBe(nextOffset);
    }
    const response = await list(
      mappedApp,
      "owner",
      "?offset=4294967246",
    ).expect(400);
    expect(response.body.error).toMatchObject({
      code: "BAD_REQUEST",
      message:
        "The requested draft page exceeds the supported pagination range",
    });
    expect(mappings).toBe(3);
  }, 20000);
  it("B04/B15 strict top-level and nested unknown keys, missing fields and missing generationId fail before writes", async () => {
    const { app, generate: provider } = fixture();
    await post(app, "/api/v1/instructor/questions/generate", {
      topic: f01Topic,
      history: "f01-private-history",
    }).expect(400);
    expect(provider).not.toHaveBeenCalled();
    const generationId = await generate(app);
    await post(app, "/api/v1/instructor/drafts", {
      topic: f01Topic,
      draft: f01Edited,
    }).expect(400);
    await post(app, "/api/v1/instructor/drafts", {
      topic: f01Topic,
      generationId,
      draft: { ...f01Edited, additionalInstruction: "publish" },
    }).expect(400);
    for (const field of Object.keys(f01Edited)) {
      const draft: Record<string, string> = { ...f01Edited };
      delete draft[field];
      await post(app, "/api/v1/instructor/drafts", {
        topic: f01Topic,
        generationId,
        draft,
      }).expect(400);
    }
    expect((await list(app).expect(200)).body.drafts).toEqual([]);
  });
  it("B04/B15 string limits use JS surrogate-pair length rather than byte count", async () => {
    const { app } = fixture();
    const generationId = await generate(app, "😀".repeat(150));
    await post(app, "/api/v1/instructor/questions/generate", {
      topic: "😀".repeat(151),
    }).expect(400);
    await save(
      app,
      generationId,
      {
        ...f01Edited,
        title: "😀".repeat(60),
      },
      "😀".repeat(150),
    ).expect(201);
    await save(
      app,
      generationId,
      {
        ...f01Edited,
        title: "😀".repeat(61),
      },
      "😀".repeat(150),
    ).expect(400);
  });
  it("B04/B19 detail ID bounds retain opaque IDs; over128 fails validation", async () => {
    const { app } = fixture();
    for (const length of [1, 2, 127, 128])
      await get(app, "x".repeat(length)).expect(404);
    await get(app, "x".repeat(129)).expect(400);
  });
  it("B11 PostgreSQL INTEGER maximum tokens persist without widening or clamping", async () => {
    const { app, generate: provider } = fixture();
    provider.mockResolvedValue({
      output: f01Output,
      inputTokens: 2147483647,
      outputTokens: 2147483646,
    });
    const generationId = await generate(app);
    expect(
      await prisma.aiUsageEvent.findUniqueOrThrow({
        where: { id: generationId },
      }),
    ).toMatchObject({ inputTokens: 2147483647, outputTokens: 2147483646 });
    await save(app, generationId).expect(201);
  });
  it("B19 retrieval dependency faults use safe503 without leaking database details", async () => {
    const client = prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ operation, args, query }) {
            if (
              [
                "findMany",
                "findFirst",
                "findUnique",
                "findFirstOrThrow",
                "findUniqueOrThrow",
              ].includes(operation)
            )
              throw new Error("f01-private-retrieval-sql");
            return query(args);
          },
        },
      },
    }) as unknown as DebugClinicPrisma;
    const { app } = fixture(client);
    for (const call of [list(app), get(app, "f01-existing-id")]) {
      const response = await call.expect(503);
      expect(response.body.error.code).toBe("DEPENDENCY_UNAVAILABLE");
      expect(JSON.stringify(response.body)).not.toMatch(
        /f01-private-retrieval-sql|stack/,
      );
    }
  });
  for (const output of ["success", "refused", "failed"]) {
    it(`B12 usage insert fault preserves ${output} outcome and safe log`, async () => {
      let writes = 0;
      const client = prisma.$extends({
        query: {
          aiUsageEvent: {
            async create() {
              writes++;
              throw new Error("f01-private-usage-sql");
            },
          },
        },
      }) as unknown as DebugClinicPrisma;
      const { app, generate: provider, logs } = fixture(client);
      if (output === "refused")
        provider.mockResolvedValue({
          output: {
            schemaVersion: "f01-question-v1",
            kind: "rejected",
            reason: "vague",
          },
          inputTokens: null,
          outputTokens: null,
        });
      if (output === "failed")
        provider.mockRejectedValue(new Error("f01-private-provider"));
      const result = await post(app, "/api/v1/instructor/questions/generate", {
        topic: f01Topic,
      }).expect(output === "refused" ? 400 : 503);
      expect(writes).toBe(1);
      expect(result.body).not.toHaveProperty("draft");
      expect((await list(app).expect(200)).body.drafts).toEqual([]);
      expect(logs.join("")).not.toMatch(
        /f01-private-usage-sql|f01-private-provider|Python lists and for loops|Sum every list element/,
      );
      if (output !== "success")
        expect(logs.join("")).toContain("USAGE_RECORDING_FAILED");
    });
  }
  for (const stage of ["exercise", "version", "completion"]) {
    it(`B16 real PostgreSQL rollback at ${stage} exposes no partial draft`, async () => {
      const { app } = fixture();
      const generationId = await generate(app);
      const token = randomUUID().replaceAll("-", "");
      const name = `f01_fault_${token}`;
      const table = stage === "version" ? "ExerciseVersion" : "Exercise";
      const condition =
        stage === "version"
          ? `EXISTS (SELECT 1 FROM "Exercise" WHERE id = NEW."exerciseId" AND "authorId" = '${owner.id}')`
          : `NEW."authorId" = '${owner.id}'`;
      // Dedicated synthetic trigger, scoped to this test's UUID owner; no migrations/reset.
      await prisma.$executeRawUnsafe(
        `CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF ${condition} THEN RAISE EXCEPTION 'f01-private-transaction-fault'; END IF; RETURN NEW; END $$`,
      );
      try {
        await prisma.$executeRawUnsafe(
          stage === "completion"
            ? `CREATE CONSTRAINT TRIGGER "${name}" AFTER INSERT ON "${table}" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "${name}"()`
            : `CREATE TRIGGER "${name}" BEFORE INSERT ON "${table}" FOR EACH ROW EXECUTE FUNCTION "${name}"()`,
        );
        const response = await save(app, generationId).expect(503);
        expect(JSON.stringify(response.body)).not.toMatch(
          /f01-private-transaction-fault|SQL|stack/,
        );
        expect((await list(app).expect(200)).body.drafts).toEqual([]);
        expect(
          await prisma.exercise.count({ where: { authorId: owner.id } }),
        ).toBe(0);
        expect(
          await prisma.exerciseVersion.count({
            where: { exercise: { authorId: owner.id } },
          }),
        ).toBe(0);
      } finally {
        await prisma.$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS "${name}" ON "${table}"`,
        );
        await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${name}"()`);
      }
    });
  }
});
