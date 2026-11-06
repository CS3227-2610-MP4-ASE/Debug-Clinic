// Independent persistence invariants; only owned synthetic rows are removed.
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient, type Prisma } from "../../generated/prisma/client.js";
import { FakeAiProvider } from "../../apps/backend/src/ai/provider.js";
import { readEnv } from "../../apps/backend/src/config/env.js";
import { createInstructorDrafts } from "../../apps/backend/src/exercises/instructor-drafts.js";
import { createInstructorQuestions } from "../../apps/backend/src/exercises/instructor-questions.js";
import { createLearnerAttempts } from "../../apps/backend/src/exercises/learner-attempts.js";
import { createLogger } from "../../apps/backend/src/lib/logger.js";
import { testDatabaseUrl } from "../support/database-target.js";

const url = testDatabaseUrl();
if (
  ["DATABASE_URL", "DATABASE_URL_POOLED", "E2E_TEST_DATABASE_URL"].some(
    (key) => process.env[key] !== url,
  )
)
  throw new Error("Explicit identical targets required");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const suffix = randomUUID();
const owner = `lws-accept-owner-${suffix}`;
const learners = [0, 1, 2, 3].map((n) => `lws-accept-learner-${n}-${suffix}`);
const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://127.0.0.1:5173",
  CORS_ORIGINS: "http://127.0.0.1:5173",
  DATABASE_URL: url,
  DATABASE_URL_POOLED: url,
  BETTER_AUTH_URL: "http://127.0.0.1:5173",
  BETTER_AUTH_SECRET: "independent-workspace-synthetic-secret-32",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "silent",
});
const logger = createLogger(config);
const questions = createInstructorQuestions({ prisma, logger });
const drafts = createInstructorDrafts({
  prisma,
  config,
  logger,
  provider: new FakeAiProvider(),
});
const attempts = createLearnerAttempts(prisma);
const topic = `Python unique ${suffix}`;
const fields = {
  title: "Independent acceptance",
  problemStatement: "Fix every value",
  buggyCode: "print(0)",
  expectedBehavior: "Print 1",
  bugExplanation: "PRIVATE_LWS_EXPLANATION",
  correctedSolution: "print(1) # PRIVATE_LWS_SOLUTION",
};
let id = "",
  versionId = "";
beforeAll(async () => {
  await prisma.user.createMany({
    data: [owner, ...learners].map((id) => ({
      id,
      name: id === owner ? "Independent instructor" : "Independent learner",
      email: `${id}@example.test`,
      role: id === owner ? ("INSTRUCTOR" as const) : ("LEARNER" as const),
    })),
  });
  const generated = await drafts.generate(owner, topic);
  const published = await questions.publish(owner, {
    source: "preview",
    previewKey: randomUUID(),
    generationId: generated.generation.id,
    topic,
    draft: fields,
    reviewConfirmed: true,
  });
  id = published.question.id;
  versionId = published.question.versionId;
});
afterAll(async () => {
  await prisma.review.deleteMany({ where: { instructorId: owner } });
  await prisma.attempt.deleteMany({ where: { learnerId: { in: learners } } });
  await prisma.exercise.deleteMany({ where: { authorId: owner } });
  await prisma.aiUsageEvent.deleteMany({ where: { userId: owner } });
  await prisma.user.deleteMany({ where: { id: { in: [owner, ...learners] } } });
  await prisma.$disconnect();
});

it("independent: searches the full corpus before 50-item paging for title and topic, including oldest matches", async () => {
  const stored = await prisma.exerciseVersion.findUniqueOrThrow({
    where: { id: versionId },
  });
  const marker = `AcceptanceSearch${suffix.replaceAll("-", "")}`;
  const ids = Array.from(
    { length: 55 },
    (_, n) => `lws-search-${String(n).padStart(3, "0")}-${suffix}`,
  );
  for (let n = 0; n < ids.length; n++) {
    await prisma.exercise.create({
      data: {
        id: ids[n]!,
        title: `${marker} ${n}`,
        description: fields.problemStatement,
        authorId: owner,
        status: "PUBLISHED",
        publishedAt: new Date(Date.UTC(2020, 0, 1, 0, 0, n)),
        versions: {
          create: {
            version: 1,
            language: "python",
            topic: marker,
            buggyCode: stored.buggyCode,
            expectedBehavior: stored.expectedBehavior,
            bugExplanation: stored.bugExplanation,
            correctedSolution: stored.correctedSolution,
            generationProvenance:
              stored.generationProvenance as Prisma.InputJsonValue,
          },
        },
      },
    });
  }
  const first = await questions.listPublished({
    q: marker.toLowerCase(),
    offset: 0,
  });
  expect(first.questions.map((q) => q.id)).toEqual(
    [...ids].reverse().slice(0, 50),
  );
  expect(first.nextOffset).toBe(50);
  const second = await questions.listPublished({
    q: marker.toUpperCase(),
    offset: 50,
  });
  expect(second.questions.map((q) => q.id)).toEqual(
    [...ids].reverse().slice(50),
  );
  expect(second.nextOffset).toBeNull();
  const oldest = await questions.listPublished({
    q: `${marker.toUpperCase()} 0`,
    offset: 0,
  });
  expect(oldest.questions.map((q) => q.id)).toEqual([ids[0]]);
  await prisma.exercise.deleteMany({
    where: { id: { in: ids }, authorId: owner },
  });
});

it("independent: save/finalize race cannot replace a final snapshot and same-payload retry is idempotent", async () => {
  const learner = learners[0]!;
  const initial = await attempts.save(learner, id, {
    code: "initial",
    reasoning: "initial",
    expectedRevision: null,
  });
  const results = await Promise.allSettled([
    attempts.save(learner, id, {
      code: "competing draft",
      reasoning: "draft",
      expectedRevision: 0,
    }),
    attempts.submit(learner, id, {
      code: "final snapshot",
      reasoning: "final",
      expectedRevision: 0,
    }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const rejected = results.find(
    (r) => r.status === "rejected",
  ) as PromiseRejectedResult;
  expect(rejected.reason).toMatchObject({ code: "CONFLICT", status: 409 });
  const loaded = await attempts.get(learner, id);
  if (loaded.attempt?.status === "DRAFT") {
    await attempts.submit(learner, id, {
      code: "final snapshot",
      reasoning: "final",
      expectedRevision: loaded.attempt.revision,
    });
  }
  const final = await attempts.get(learner, id);
  const retry = {
    code: "final snapshot",
    reasoning: "final",
    expectedRevision: initial.attempt!.revision,
  };
  expect(await attempts.submit(learner, id, retry)).toEqual(final);
  await expect(
    attempts.submit(learner, id, { ...retry, code: "different" }),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    attempts.save(learner, id, {
      ...retry,
      expectedRevision: final.attempt!.revision,
    }),
  ).rejects.toMatchObject({ status: 409 });
  expect(await attempts.get(learner, id)).toEqual(final);
  expect(await attempts.get(learners[1]!, id)).toEqual({ attempt: null });
});

it("independent: simultaneous first finalizations create exactly one immutable attempt", async () => {
  const learner = learners[1]!;
  const inputs = ["first final", "second final"].map((code) => ({
    code,
    reasoning: code,
    expectedRevision: null,
  }));
  const results = await Promise.allSettled(
    inputs.map((input) => attempts.submit(learner, id, input)),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(
    (results.find((r) => r.status === "rejected") as PromiseRejectedResult)
      .reason,
  ).toMatchObject({ status: 409 });
  expect(
    await prisma.attempt.count({
      where: { learnerId: learner, exerciseVersionId: versionId },
    }),
  ).toBe(1);
  expect((await attempts.get(learner, id)).attempt?.status).toBe(
    "FINAL_SUBMITTED",
  );
});

it.each(["get", "save", "submit"] as const)(
  "independent: %s rejects a question that canonical public validation declares unavailable",
  async (operation) => {
    const stored = await prisma.exerciseVersion.findUniqueOrThrow({
      where: { id: versionId },
    });
    const corrupt = await prisma.exercise.create({
      data: {
        title: "Invalid legacy publication",
        description: fields.problemStatement,
        authorId: owner,
        status: "PUBLISHED",
        publishedAt: new Date(),
        versions: {
          create: {
            version: 1,
            language: "python",
            topic,
            buggyCode: stored.buggyCode,
            expectedBehavior: stored.expectedBehavior,
            bugExplanation: stored.bugExplanation,
            correctedSolution: stored.correctedSolution,
            generationProvenance: {},
          },
        },
      },
    });
    try {
      await expect(questions.getPublished(corrupt.id)).rejects.toMatchObject({
        status: 503,
      });
      const input = {
        code: "print('must not save')",
        reasoning: "Unavailable question",
        expectedRevision: null,
      };
      // Every attempt path must use the same canonical eligible-question boundary.
      const operationResult =
        operation === "get"
          ? attempts.get(learners[3]!, corrupt.id)
          : attempts[operation](learners[3]!, corrupt.id, input);
      await expect(operationResult).rejects.toMatchObject({
        status: expect.any(Number),
      });
      expect(
        await prisma.attempt.count({
          where: { exerciseVersion: { exerciseId: corrupt.id } },
        }),
      ).toBe(0);
    } finally {
      await prisma.attempt.deleteMany({
        where: {
          exerciseVersion: { exerciseId: corrupt.id },
          learnerId: learners[3]!,
        },
      });
      await prisma.exercise.delete({ where: { id: corrupt.id } });
    }
  },
);

it("independent: archive racing a first save retains identity and references and denies every later operation", async () => {
  const retained = await prisma.attempt.findFirstOrThrow({
    where: { exerciseVersionId: versionId },
  });
  const review = await prisma.review.create({
    data: {
      attemptId: retained.id,
      instructorId: owner,
      decision: "APPROVED",
      comment: "Retained synthetic review",
    },
  });
  const [write, remove] = await Promise.allSettled([
    attempts.save(learners[2]!, id, {
      code: "racing save",
      reasoning: "racing",
      expectedRevision: null,
    }),
    questions.remove(owner, id, { confirmed: true }),
  ]);
  expect(remove.status).toBe("fulfilled");
  if (write.status === "rejected")
    expect(write.reason).toMatchObject({ status: 404 });
  else expect(write.value.attempt?.status).toBe("DRAFT");
  for (const learner of learners) {
    await expect(attempts.get(learner, id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      attempts.save(learner, id, {
        code: "late",
        reasoning: "late",
        expectedRevision: null,
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      attempts.submit(learner, id, {
        code: "late",
        reasoning: "late",
        expectedRevision: null,
      }),
    ).rejects.toMatchObject({ status: 404 });
  }
  expect(
    await prisma.attempt.findUnique({ where: { id: retained.id } }),
  ).toEqual(retained);
  expect(
    await prisma.review.findUnique({ where: { id: review.id } }),
  ).toMatchObject({ attemptId: retained.id });
  expect(await prisma.exerciseVersion.count({ where: { id: versionId } })).toBe(
    1,
  );
});
