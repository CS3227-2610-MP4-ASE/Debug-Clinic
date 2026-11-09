import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { createLearnerDashboard } from "../../apps/backend/src/exercises/learner-dashboard.js";
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
const teacherId = `dashboard-teacher-${suffix}`;
const learnerId = `dashboard-learner-${suffix}`;
const otherLearnerId = `dashboard-other-${suffix}`;
const exerciseId = `dashboard-exercise-${suffix}`;
const historyExerciseId = `dashboard-history-${suffix}`;
const archivedExerciseId = `dashboard-archived-${suffix}`;
const oldVersionId = `dashboard-old-version-${suffix}`;
const currentVersionId = `dashboard-current-version-${suffix}`;
const historyOldVersionId = `dashboard-history-old-version-${suffix}`;
const historyVersionId = `dashboard-history-version-${suffix}`;
const archivedVersionId = `dashboard-archived-version-${suffix}`;
const dashboard = createLearnerDashboard(prisma);

const provenance = {
  generationId: "dashboard-fixture",
  provider: "fake",
  model: null,
  promptVersion: "fixture-v1",
  generatedAt: new Date().toISOString(),
  association: "instructor-reported",
};

async function createExercise(
  id: string,
  versionId: string,
  status: "PUBLISHED" | "ARCHIVED",
) {
  await prisma.exercise.create({
    data: {
      id,
      title: id === exerciseId ? "Current version exercise" : "Saved activity",
      description: "Find the missed value.",
      status,
      authorId: teacherId,
      publishedAt: new Date(),
      archivedAt: status === "ARCHIVED" ? new Date() : null,
      versions: {
        create: {
          id: versionId,
          version: 1,
          language: "python",
          topic: "loops",
          buggyCode: "print('start')",
          expectedBehavior: "Print the complete result.",
          bugExplanation: "The loop ends early.",
          correctedSolution: "print('complete')",
          generationProvenance: provenance,
        },
      },
    },
  });
}

beforeAll(async () => {
  await prisma.user.createMany({
    data: [
      {
        id: teacherId,
        name: "Teacher",
        email: `${teacherId}@example.test`,
        role: "INSTRUCTOR",
      },
      {
        id: learnerId,
        name: "Learner",
        email: `${learnerId}@example.test`,
        role: "LEARNER",
      },
      {
        id: otherLearnerId,
        name: "Other learner",
        email: `${otherLearnerId}@example.test`,
        role: "LEARNER",
      },
    ],
  });
  await prisma.exercise.create({
    data: {
      id: exerciseId,
      title: "Current version exercise",
      description: "Find the missed value.",
      status: "PUBLISHED",
      authorId: teacherId,
      publishedAt: new Date(),
      versions: {
        create: [
          {
            id: oldVersionId,
            version: 2,
            language: "python",
            topic: null,
            buggyCode: "print('old')",
            expectedBehavior: "Old expected result.",
            bugExplanation: null,
            correctedSolution: null,
            generationProvenance: Prisma.DbNull,
          },
          {
            id: currentVersionId,
            version: 1,
            language: "python",
            topic: "loops",
            buggyCode: "print('start')",
            expectedBehavior: "Print the complete result.",
            bugExplanation: "The loop ends early.",
            correctedSolution: "print('complete')",
            generationProvenance: provenance,
          },
        ],
      },
    },
  });
  await prisma.exercise.create({
    data: {
      id: historyExerciseId,
      title: "Saved activity",
      description: "Find the missed value.",
      status: "PUBLISHED",
      authorId: teacherId,
      publishedAt: new Date(),
      versions: {
        create: [
          {
            id: historyOldVersionId,
            version: 2,
            language: "python",
            topic: null,
            buggyCode: "print('old')",
            expectedBehavior: "Old expected result.",
            bugExplanation: null,
            correctedSolution: null,
            generationProvenance: Prisma.DbNull,
          },
          {
            id: historyVersionId,
            version: 1,
            language: "python",
            topic: "loops",
            buggyCode: "print('start')",
            expectedBehavior: "Print the complete result.",
            bugExplanation: "The loop ends early.",
            correctedSolution: "print('complete')",
            generationProvenance: provenance,
          },
        ],
      },
    },
  });
  await createExercise(archivedExerciseId, archivedVersionId, "ARCHIVED");

  const now = Date.now();
  await prisma.attempt.createMany({
    data: [
      {
        learnerId,
        exerciseVersionId: oldVersionId,
        proposedCode: "print('old draft')",
        reasoning: "old saved work",
        status: "DRAFT",
        updatedAt: new Date(now + 2_000),
      },
      {
        learnerId,
        exerciseVersionId: currentVersionId,
        proposedCode: "print('current draft')",
        reasoning: "current saved work",
        status: "DRAFT",
        updatedAt: new Date(now + 1_000),
      },
      {
        learnerId,
        exerciseVersionId: historyOldVersionId,
        proposedCode: "print('final')",
        reasoning: "submitted",
        status: "FINAL_SUBMITTED",
        finalSubmittedAt: new Date(),
      },
      {
        learnerId,
        exerciseVersionId: historyVersionId,
        proposedCode: "print('saved')",
        reasoning: "in progress",
        status: "DRAFT",
      },
      {
        learnerId: otherLearnerId,
        exerciseVersionId: historyVersionId,
        proposedCode: "print('other')",
        reasoning: "other learner",
        status: "DRAFT",
      },
      {
        learnerId,
        exerciseVersionId: archivedVersionId,
        proposedCode: "print('archived')",
        reasoning: "archived history",
        status: "DRAFT",
      },
    ],
  });
});

afterAll(async () => {
  await prisma.attempt.deleteMany({
    where: { learnerId: { in: [learnerId, otherLearnerId] } },
  });
  await prisma.exercise.deleteMany({
    where: { id: { in: [exerciseId, historyExerciseId, archivedExerciseId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [teacherId, learnerId, otherLearnerId] } },
  });
  await prisma.$disconnect();
});

describe("learner dashboard / PostgreSQL", () => {
  it("groups attempts across versions and resumes only the current public draft", async () => {
    const result = await dashboard.get(learnerId);
    expect(result).toMatchObject({
      attemptedCount: 3,
      completedCount: 1,
      inProgressCount: 2,
    });
    expect(result.recentDrafts.map(({ exerciseId: id }) => id)).toEqual([
      exerciseId,
      historyExerciseId,
    ]);
    expect(JSON.stringify(result)).not.toContain("correctedSolution");
    expect(JSON.stringify(result)).not.toContain("print(");
    expect(await dashboard.get(otherLearnerId)).toMatchObject({
      attemptedCount: 1,
      completedCount: 0,
      inProgressCount: 1,
      recentDrafts: [{ exerciseId: historyExerciseId }],
    });
  });

  it("returns zero counts and no resumable drafts for an empty learner", async () => {
    const emptyId = `dashboard-empty-${suffix}`;
    await prisma.user.create({
      data: {
        id: emptyId,
        name: "Empty learner",
        email: `${emptyId}@example.test`,
        role: "LEARNER",
      },
    });
    try {
      expect(await dashboard.get(emptyId)).toEqual({
        attemptedCount: 0,
        completedCount: 0,
        inProgressCount: 0,
        recentDrafts: [],
      });
    } finally {
      await prisma.user.delete({ where: { id: emptyId } });
    }
  });
});
