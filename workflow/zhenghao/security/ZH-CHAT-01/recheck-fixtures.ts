import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../generated/prisma/client.js";
import { createLearnerAssistant } from "../../../../apps/backend/src/exercises/learner-assistant.js";
import type { AiProvider } from "../../../../apps/backend/src/ai/provider.js";
import { AssistantMessageRequestSchema } from "@debugclinic/contracts";
import { testDatabaseUrl } from "../../../../tests/support/database-target.js";
import { exercises, type Case } from "./evaluation-cases.js";

const url = testDatabaseUrl();
assert.equal(process.env.DATABASE_URL, url);
assert.equal(process.env.DATABASE_URL_POOLED, url);
export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
export const corrections = {
  slice: "def total(values):\n    return sum(values)",
  accumulator:
    "def squares(values):\n    result = 0\n    for value in values:\n        result += value * value\n    return result",
};
export const privateMarker = "RECHECK_SERVER_ONLY_CANONICAL_SENTINEL";
export async function fixture(
  kind: keyof typeof exercises,
  provider: AiProvider,
) {
  const suffix = randomUUID();
  const learnerId = `learner-${suffix}`;
  const teacherId = `teacher-${suffix}`;
  const exerciseId = `exercise-${suffix}`;
  const versionId = `version-${suffix}`;
  const question = exercises[kind];
  await db.user.createMany({
    data: [
      {
        id: learnerId,
        name: "Synthetic learner",
        email: `${learnerId}@example.test`,
        role: "LEARNER",
      },
      {
        id: teacherId,
        name: "Synthetic instructor",
        email: `${teacherId}@example.test`,
        role: "INSTRUCTOR",
      },
    ],
  });
  await db.exercise.create({
    data: {
      id: exerciseId,
      title: question.title,
      description: question.problemStatement,
      status: "PUBLISHED",
      publishedAt: new Date(),
      authorId: teacherId,
      versions: {
        create: {
          id: versionId,
          version: 1,
          language: "python",
          topic: kind,
          buggyCode: question.buggyCode,
          expectedBehavior: question.expectedBehavior,
          bugExplanation: `${privateMarker}_EXPLANATION`,
          correctedSolution: `${corrections[kind]}\n# ${privateMarker}`,
          generationProvenance: {
            generationId: "independent-recheck-fixture",
            provider: "fake",
            model: null,
            promptVersion: "fixture-v1",
            generatedAt: new Date().toISOString(),
            association: "instructor-reported",
          },
        },
      },
    },
  });
  await db.learnerAssistantConversation.create({
    data: { learnerId, exerciseVersionId: versionId },
  });
  const service = createLearnerAssistant(db, provider);
  const send = async (test: Pick<Case, "level" | "current">) => {
    // This fixture sets already-unlocked server state to isolate each prescribed
    // level. It does not claim that a rejected response advanced progression.
    const conversation = await db.learnerAssistantConversation.update({
      where: {
        learnerId_exerciseVersionId: {
          learnerId,
          exerciseVersionId: versionId,
        },
      },
      data: { unlockedLevel: test.level },
    });
    const input = AssistantMessageRequestSchema.parse({
      requestId: randomUUID(),
      expectedRevision: conversation.revision,
      expectedExerciseVersionId: versionId,
      action: "MESSAGE",
      message: test.current.message,
      context: {
        shareCode: test.current.code !== undefined,
        shareReasoning: test.current.reasoning !== undefined,
        shareOutput: test.current.output !== undefined,
      },
      ...(test.current.code === undefined
        ? {}
        : { sharedCode: test.current.code }),
      ...(test.current.reasoning === undefined
        ? {}
        : { sharedReasoning: test.current.reasoning }),
      ...(test.current.output === undefined
        ? {}
        : { sharedOutput: test.current.output }),
    });
    try {
      const result = await service.send(learnerId, exerciseId, input);
      return {
        status: "accepted" as const,
        result,
        requestId: input.requestId,
      };
    } catch (error) {
      return {
        status: "rejected-or-failed" as const,
        safeCode: (error as { code?: string }).code ?? "unknown",
        requestId: input.requestId,
      };
    }
  };
  return { learnerId, exerciseId, versionId, service, send };
}
