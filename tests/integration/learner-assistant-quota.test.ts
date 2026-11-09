import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "../../generated/prisma/client.js";
import { FakeAiProvider } from "../../apps/backend/src/ai/provider.js";
import {
  createLearnerAssistant,
  LEARNER_ASSISTANT_REQUEST_LIMIT,
  LEARNER_ASSISTANT_WINDOW_MS,
} from "../../apps/backend/src/exercises/learner-assistant.js";
import type { AssistantMessageRequest } from "../../packages/contracts/src/index.js";
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
const teacherId = `quota-teacher-${suffix}`;
const learnerId = `quota-learner-${suffix}`;
const exerciseIds = [
  `quota-exercise-a-${suffix}`,
  `quota-exercise-b-${suffix}`,
];
const versionIds = [`quota-version-a-${suffix}`, `quota-version-b-${suffix}`];
const assistant = createLearnerAssistant(prisma, new FakeAiProvider());

async function seedRequests(
  count: number,
  versionIndex: number,
  createdAt: (index: number) => Date,
) {
  const conversation =
    await prisma.learnerAssistantConversation.findUniqueOrThrow({
      where: {
        learnerId_exerciseVersionId: {
          learnerId,
          exerciseVersionId: versionIds[versionIndex]!,
        },
      },
    });
  await prisma.learnerAssistantRequest.createMany({
    data: Array.from({ length: count }, (_, index) => ({
      learnerId,
      conversationId: conversation.id,
      requestId: randomUUID(),
      payloadDigest: `seed-${index}`,
      action: index % 2 === 0 ? "MESSAGE" : "NEXT_HINT",
      status: "FAILED",
      expectedRevision: 0,
      contentGeneration: 0,
      targetLevel: 1,
      providerAttempts: 0,
      createdAt: createdAt(index),
      updatedAt: createdAt(index),
    })),
  });
}

function message(
  versionIndex: number,
  expectedRevision = 0,
): AssistantMessageRequest {
  return {
    requestId: randomUUID(),
    expectedRevision,
    expectedExerciseVersionId: versionIds[versionIndex]!,
    action: "MESSAGE",
    message: "Please help me inspect this loop.",
    context: { shareCode: false, shareReasoning: false, shareOutput: false },
  };
}

beforeAll(async () => {
  await prisma.user.createMany({
    data: [
      {
        id: teacherId,
        name: "Synthetic teacher",
        email: `${teacherId}@example.test`,
        role: "INSTRUCTOR",
      },
      {
        id: learnerId,
        name: "Synthetic learner",
        email: `${learnerId}@example.test`,
        role: "LEARNER",
      },
    ],
  });
  await prisma.exercise.createMany({
    data: exerciseIds.map((id) => ({
      id,
      title: "Quota exercise",
      description: "Inspect the loop boundary.",
      status: "PUBLISHED" as const,
      authorId: teacherId,
      publishedAt: new Date(),
    })),
  });
  await prisma.exerciseVersion.createMany({
    data: versionIds.map((id, index) => ({
      id,
      exerciseId: exerciseIds[index]!,
      version: 1,
      language: "python",
      topic: "loops",
      buggyCode: "print('start')",
      expectedBehavior: "Print the full result.",
      bugExplanation: "The last iteration is skipped.",
      correctedSolution: "print('complete')",
      generationProvenance: {
        generationId: "quota-fixture",
        provider: "fake",
        model: null,
        promptVersion: "fixture-v1",
        generatedAt: new Date().toISOString(),
        association: "instructor-reported",
      },
    })),
  });
  for (const versionId of versionIds)
    await prisma.learnerAssistantConversation.create({
      data: { learnerId, exerciseVersionId: versionId },
    });
});

beforeEach(async () => {
  await prisma.learnerAssistantRequest.deleteMany({ where: { learnerId } });
  await prisma.learnerAssistantMessage.deleteMany({
    where: { conversation: { learnerId } },
  });
  await prisma.learnerAssistantConversation.updateMany({
    where: { learnerId },
    data: {
      unlockedLevel: 1,
      revision: 0,
      contentGeneration: 0,
      hasSuccessfulReply: false,
      lastActivityAt: null,
      expiresAt: null,
    },
  });
});

afterAll(async () => {
  await prisma.learnerAssistantConversation.deleteMany({
    where: { learnerId },
  });
  await prisma.exercise.deleteMany({ where: { id: { in: exerciseIds } } });
  await prisma.user.deleteMany({
    where: { id: { in: [teacherId, learnerId] } },
  });
  await prisma.$disconnect();
});

describe("learner assistant rolling quota / PostgreSQL", () => {
  it("allows request 100, rejects 101, and replays without consuming another slot", async () => {
    const now = Date.now();
    await seedRequests(
      LEARNER_ASSISTANT_REQUEST_LIMIT - 1,
      0,
      (index) => new Date(now - 60_000 + index),
    );
    const beforeReads = await prisma.learnerAssistantRequest.count({
      where: { learnerId, action: { in: ["MESSAGE", "NEXT_HINT"] } },
    });
    const seededRequest = await prisma.learnerAssistantRequest.findFirstOrThrow(
      {
        where: { learnerId },
        orderBy: { createdAt: "asc" },
      },
    );
    await assistant.get(learnerId, exerciseIds[0]!);
    await assistant.reconcile(
      learnerId,
      exerciseIds[0]!,
      seededRequest.requestId,
    );
    expect(
      await prisma.learnerAssistantRequest.count({
        where: { learnerId, action: { in: ["MESSAGE", "NEXT_HINT"] } },
      }),
    ).toBe(beforeReads);
    const hundredth = message(0);
    const first = await assistant.send(learnerId, exerciseIds[0]!, hundredth);
    expect(first.assistant.revision).toBe(1);
    const countAfterHundredth = await prisma.learnerAssistantRequest.count({
      where: { learnerId, action: { in: ["MESSAGE", "NEXT_HINT"] } },
    });
    expect(countAfterHundredth).toBe(LEARNER_ASSISTANT_REQUEST_LIMIT);
    const replay = await assistant.send(learnerId, exerciseIds[0]!, hundredth);
    expect(replay.reply?.requestId).toBe(hundredth.requestId);
    expect(
      await prisma.learnerAssistantRequest.count({
        where: { learnerId, action: { in: ["MESSAGE", "NEXT_HINT"] } },
      }),
    ).toBe(countAfterHundredth);
    await expect(
      assistant.send(learnerId, exerciseIds[0]!, message(0, 1)),
    ).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: expect.any(Number),
    });
  });

  it("returns capacity when the oldest request leaves the rolling window", async () => {
    const now = Date.now();
    await seedRequests(
      LEARNER_ASSISTANT_REQUEST_LIMIT,
      0,
      (index) => new Date(now - (index === 0 ? 11 : 2) * 60_000),
    );
    const result = await assistant.send(learnerId, exerciseIds[0]!, message(0));
    expect(result.assistant.revision).toBe(1);
  });

  it("sets Retry-After from the oldest request occupying the window", async () => {
    const now = Date.now();
    await seedRequests(
      LEARNER_ASSISTANT_REQUEST_LIMIT,
      0,
      (index) => new Date(now - (index === 0 ? 45 : 20) * 1_000),
    );
    const failure = await assistant
      .send(learnerId, exerciseIds[0]!, message(0))
      .catch(
        (error: unknown) =>
          error as { status?: number; retryAfterSeconds?: number },
      );
    expect(failure).toMatchObject({ status: 429 });
    expect(failure.retryAfterSeconds).toBeGreaterThanOrEqual(550);
    expect(failure.retryAfterSeconds).toBeLessThanOrEqual(600);
  });

  it("does not block more than 100 earlier requests from the same day", async () => {
    const now = Date.now();
    await seedRequests(120, 0, (index) => new Date(now - 60 * 60_000 - index));
    const result = await assistant.send(learnerId, exerciseIds[0]!, message(0));
    expect(result.assistant.revision).toBe(1);
  });

  it("serializes requests competing for the final slot across exercises", async () => {
    const now = Date.now();
    await seedRequests(
      LEARNER_ASSISTANT_REQUEST_LIMIT - 1,
      0,
      (index) => new Date(now - 60_000 + index),
    );
    const results = await Promise.allSettled([
      assistant.send(learnerId, exerciseIds[0]!, message(0)),
      assistant.send(learnerId, exerciseIds[1]!, message(1)),
    ]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === "rejected")).toHaveLength(
      1,
    );
    const rejection = results.find(({ status }) => status === "rejected");
    expect(rejection).toMatchObject({
      status: "rejected",
      reason: { status: 429 },
    });
    expect(
      await prisma.learnerAssistantRequest.count({
        where: {
          learnerId,
          action: { in: ["MESSAGE", "NEXT_HINT"] },
          createdAt: { gt: new Date(Date.now() - LEARNER_ASSISTANT_WINDOW_MS) },
        },
      }),
    ).toBe(LEARNER_ASSISTANT_REQUEST_LIMIT);
  });
});
