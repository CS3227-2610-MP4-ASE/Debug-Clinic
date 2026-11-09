import {
  LearnerDashboardResponseSchema,
  type LearnerDashboardResponse,
} from "@debugclinic/contracts";
import type { DebugClinicPrisma } from "../db/client.js";
import { DependencyUnavailableError } from "../lib/errors.js";
import { findCanonicalPublishedQuestions } from "./instructor-questions.js";

export interface LearnerDashboard {
  get(learnerId: string): Promise<LearnerDashboardResponse>;
}

export function createLearnerDashboard(
  prisma: DebugClinicPrisma,
): LearnerDashboard {
  return {
    async get(learnerId) {
      try {
        const attempts = await prisma.attempt.findMany({
          where: { learnerId },
          select: {
            status: true,
            exerciseVersion: { select: { exerciseId: true } },
          },
        });
        const attempted = new Set(
          attempts.map(({ exerciseVersion }) => exerciseVersion.exerciseId),
        );
        const completed = new Set(
          attempts
            .filter(({ status }) => status === "FINAL_SUBMITTED")
            .map(({ exerciseVersion }) => exerciseVersion.exerciseId),
        );
        const drafts = await prisma.attempt.findMany({
          where: {
            learnerId,
            status: "DRAFT",
            exerciseVersion: { exercise: { status: "PUBLISHED" } },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 100,
          select: {
            exerciseVersionId: true,
            updatedAt: true,
            exerciseVersion: { select: { exerciseId: true } },
          },
        });
        const exerciseIds = [
          ...new Set(
            drafts.map(({ exerciseVersion }) => exerciseVersion.exerciseId),
          ),
        ];
        const publicQuestions = await findCanonicalPublishedQuestions(
          prisma,
          exerciseIds,
        );
        const recentDrafts: LearnerDashboardResponse["recentDrafts"] = [];
        const seen = new Set<string>();
        for (const draft of drafts) {
          const exerciseId = draft.exerciseVersion.exerciseId;
          if (seen.has(exerciseId)) continue;
          const question = publicQuestions.get(exerciseId);
          if (!question || question.versionId !== draft.exerciseVersionId)
            continue;
          seen.add(exerciseId);
          recentDrafts.push({
            exerciseId,
            title: question.title,
            updatedAt: draft.updatedAt.toISOString(),
          });
          if (recentDrafts.length === 5) break;
        }
        return LearnerDashboardResponseSchema.parse({
          attemptedCount: attempted.size,
          completedCount: completed.size,
          inProgressCount: attempted.size - completed.size,
          recentDrafts,
        });
      } catch {
        throw new DependencyUnavailableError(
          "Your dashboard is temporarily unavailable. Try again.",
        );
      }
    },
  };
}
