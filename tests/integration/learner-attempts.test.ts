import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../generated/prisma/client.js";
import { createLearnerAttempts } from "../../apps/backend/src/exercises/learner-attempts.js";
import { createInstructorQuestions } from "../../apps/backend/src/exercises/instructor-questions.js";
import { createInstructorDrafts } from "../../apps/backend/src/exercises/instructor-drafts.js";
import { FakeAiProvider } from "../../apps/backend/src/ai/provider.js";
import { readEnv } from "../../apps/backend/src/config/env.js";
import { createLogger } from "../../apps/backend/src/lib/logger.js";
import { testDatabaseUrl } from "../support/database-target.js";

const url = testDatabaseUrl();
if (
  process.env["DATABASE_URL"] !== url ||
  process.env["DATABASE_URL_POOLED"] !== url
)
  throw new Error("Explicit identical synthetic database targets required");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const suffix = randomUUID();
const instructor = `learner-owner-${suffix}`,
  learner = `learner-user-${suffix}`,
  other = `learner-other-${suffix}`;
let exerciseId = `learner-exercise-${suffix}`;
let versionId = "";
const searchTopic = `UniqueSearchTopic${suffix.replaceAll("-", "")}`;
const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://localhost:5173",
  CORS_ORIGINS: "http://localhost:5173",
  DATABASE_URL: url,
  DATABASE_URL_POOLED: url,
  BETTER_AUTH_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: "learner-attempt-integration-secret-at-least-32",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "silent",
});
const logger = createLogger(config);
const attempts = createLearnerAttempts(prisma);
const questions = createInstructorQuestions({ prisma, logger });
const drafts = createInstructorDrafts({
  prisma,
  logger,
  config,
  provider: new FakeAiProvider(),
});
beforeAll(async () => {
  await prisma.user.createMany({
    data: [
      {
        id: instructor,
        name: "Instructor",
        email: `${instructor}@example.test`,
        role: "INSTRUCTOR",
      },
      {
        id: learner,
        name: "Learner",
        email: `${learner}@example.test`,
        role: "LEARNER",
      },
      {
        id: other,
        name: "Other Learner",
        email: `${other}@example.test`,
        role: "LEARNER",
      },
    ],
  });
  const generated = await drafts.generate(instructor, searchTopic);
  const draft = await drafts.save(instructor, {
    topic: searchTopic,
    generationId: generated.generation.id,
    draft: {
      title: "Search phrase: list sum",
      problemStatement: "Fix this",
      buggyCode: "print(0)",
      expectedBehavior: "Print 1",
      bugExplanation: "private",
      correctedSolution: "print(1)",
    },
  });
  const published = await questions.publish(instructor, {
    source: "saved",
    id: draft.draft.id,
    expectedRevision: 0,
    topic: searchTopic,
    draft: {
      title: "Search phrase: list sum",
      problemStatement: "Fix this",
      buggyCode: "print(0)",
      expectedBehavior: "Print 1",
      bugExplanation: "private",
      correctedSolution: "print(1)",
    },
    reviewConfirmed: true,
  });
  exerciseId = published.question.id;
  versionId = published.question.versionId;
});
afterAll(async () => {
  await prisma.attempt.deleteMany({ where: { exerciseVersionId: versionId } });
  await prisma.exercise.deleteMany({ where: { id: exerciseId } });
  await prisma.user.deleteMany({
    where: { id: { in: [instructor, learner, other] } },
  });
  await prisma.$disconnect();
});

describe("learner attempts / real PostgreSQL", () => {
  it("pins a private attempt to the published version, compare-and-swaps revisions and freezes final content", async () => {
    expect(await attempts.get(learner, exerciseId)).toEqual({ attempt: null });
    const first = await attempts.save(learner, exerciseId, {
      code: "print(1)\n",
      reasoning: "The output should be one.",
      expectedRevision: null,
    });
    expect(first.attempt).toMatchObject({
      code: "print(1)\n",
      revision: 0,
      status: "DRAFT",
      submittedAt: null,
    });
    await expect(attempts.get(other, exerciseId)).resolves.toEqual({
      attempt: null,
    });
    await expect(
      attempts.save(learner, exerciseId, {
        code: "print(2)",
        reasoning: "stale edit",
        expectedRevision: null,
      }),
    ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
    const saved = await attempts.save(learner, exerciseId, {
      code: "print(2)",
      reasoning: "Updated explanation",
      expectedRevision: 0,
    });
    expect(saved.attempt?.revision).toBe(1);
    const submitted = await attempts.submit(learner, exerciseId, {
      code: "print(3)",
      reasoning: "Final explanation",
      expectedRevision: 1,
    });
    expect(submitted.attempt).toMatchObject({
      code: "print(3)",
      reasoning: "Final explanation",
      status: "FINAL_SUBMITTED",
      revision: 2,
    });
    await expect(
      attempts.submit(learner, exerciseId, {
        code: "print(3)",
        reasoning: "Final explanation",
        expectedRevision: null,
      }),
    ).resolves.toEqual(submitted);
    await expect(
      attempts.save(learner, exerciseId, {
        code: "print(4)",
        reasoning: "late",
        expectedRevision: 2,
      }),
    ).rejects.toMatchObject({ status: 409 });
    const raw = await prisma.attempt.findUniqueOrThrow({
      where: {
        learnerId_exerciseVersionId: {
          learnerId: learner,
          exerciseVersionId: versionId,
        },
      },
    });
    expect(raw.exerciseVersionId).toBe(versionId);
    expect(
      JSON.stringify(await attempts.get(learner, exerciseId)),
    ).not.toContain("private");
  });
  it("applies case-insensitive title/topic search at the service before returning the page", async () => {
    const result = await questions.listPublished({
      q: searchTopic.toLowerCase(),
      offset: 0,
    });
    expect(
      result.questions.some((question) => question.id === exerciseId),
    ).toBe(true);
  });
  it("serializes same-revision writes and submit against archival", async () => {
    const saves = await Promise.allSettled([
      attempts.save(other, exerciseId, {
        code: "print('first')",
        reasoning: "first competing save",
        expectedRevision: null,
      }),
      attempts.save(other, exerciseId, {
        code: "print('second')",
        reasoning: "second competing save",
        expectedRevision: null,
      }),
    ]);
    expect(
      saves.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(saves.filter((result) => result.status === "rejected")).toHaveLength(
      1,
    );
    const [submitted, removed] = await Promise.allSettled([
      attempts.submit(other, exerciseId, {
        code: "print('final')",
        reasoning: "final attempt racing with archive",
        expectedRevision: 0,
      }),
      questions.remove(instructor, exerciseId, { confirmed: true }),
    ]);
    expect(removed.status).toBe("fulfilled");
    if (submitted.status === "fulfilled")
      expect(submitted.value.attempt?.status).toBe("FINAL_SUBMITTED");
    else expect(submitted.reason).toMatchObject({ status: 404 });
  });
  it("rejects saves after publication is archived", async () => {
    await expect(
      attempts.save(learner, exerciseId, {
        code: "print(1)",
        reasoning: "No longer open",
        expectedRevision: null,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
