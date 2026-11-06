import {
  DraftIdSchema,
  LearnerAttemptResponseSchema,
  LearnerAttemptSchema,
  LearnerAttemptWriteSchema,
  type LearnerAttemptResponse,
  type LearnerAttemptWrite,
} from "@debugclinic/contracts";
import { Prisma } from "../../../../generated/prisma/client.js";
import type { DebugClinicPrisma } from "../db/client.js";
import { AppError } from "../lib/errors.js";

export interface LearnerAttempts {
  get(learnerId: string, exerciseId: string): Promise<LearnerAttemptResponse>;
  save(
    learnerId: string,
    exerciseId: string,
    input: LearnerAttemptWrite,
  ): Promise<LearnerAttemptResponse>;
  submit(
    learnerId: string,
    exerciseId: string,
    input: LearnerAttemptWrite,
  ): Promise<LearnerAttemptResponse>;
}

const unavailable = () =>
  new AppError(
    503,
    "DEPENDENCY_UNAVAILABLE",
    "The attempt could not be saved. Keep your edits and try again.",
  );
const notFound = () => new AppError(404, "NOT_FOUND", "Question not found");
const conflict = (
  message = "This attempt changed. Reload it before saving again.",
) => new AppError(409, "CONFLICT", message, undefined, "NOT_APPLIED");

function project(row: {
  id: string;
  proposedCode: string;
  reasoning: string;
  status: "DRAFT" | "FINAL_SUBMITTED";
  revision: number;
  finalSubmittedAt: Date | null;
}) {
  return LearnerAttemptSchema.parse({
    id: row.id,
    code: row.proposedCode,
    reasoning: row.reasoning,
    status: row.status,
    revision: row.revision,
    submittedAt: row.finalSubmittedAt?.toISOString() ?? null,
  });
}

export function createLearnerAttempts(
  prisma: DebugClinicPrisma,
): LearnerAttempts {
  async function run<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw unavailable();
    }
  }
  async function lockPublished(
    transaction: Prisma.TransactionClient,
    exerciseId: string,
  ) {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Exercise" WHERE "id" = ${exerciseId} AND "status" = 'PUBLISHED' FOR UPDATE
    `;
    if (!rows.length) throw notFound();
    const version = await transaction.exerciseVersion.findFirst({
      where: {
        exerciseId,
        version: 1,
        language: "python",
        topic: { not: null },
        bugExplanation: { not: null },
        correctedSolution: { not: null },
        generationProvenance: { not: Prisma.DbNull },
      },
      select: { id: true },
    });
    if (!version) throw notFound();
    return version.id;
  }
  async function read(learnerId: string, versionId: string) {
    const row = await prisma.attempt.findUnique({
      where: {
        learnerId_exerciseVersionId: {
          learnerId,
          exerciseVersionId: versionId,
        },
      },
    });
    return LearnerAttemptResponseSchema.parse({
      attempt: row ? project(row) : null,
    });
  }
  return {
    async get(learnerId, rawExerciseId) {
      const exerciseId = DraftIdSchema.parse(rawExerciseId);
      try {
        const question = await prisma.exercise.findFirst({
          where: {
            id: exerciseId,
            status: "PUBLISHED",
            versions: {
              some: {
                version: 1,
                language: "python",
                topic: { not: null },
                bugExplanation: { not: null },
                correctedSolution: { not: null },
                generationProvenance: { not: Prisma.DbNull },
              },
            },
          },
          select: {
            versions: {
              where: { version: 1, language: "python" },
              select: { id: true },
            },
          },
        });
        const versionId = question?.versions[0]?.id;
        if (!versionId) throw notFound();
        return await read(learnerId, versionId);
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw unavailable();
      }
    },
    async save(learnerId, rawExerciseId, rawInput) {
      const exerciseId = DraftIdSchema.parse(rawExerciseId);
      const input = LearnerAttemptWriteSchema.parse(rawInput);
      return run(async (tx) => {
        const versionId = await lockPublished(tx, exerciseId);
        const current = await tx.attempt.findUnique({
          where: {
            learnerId_exerciseVersionId: {
              learnerId,
              exerciseVersionId: versionId,
            },
          },
        });
        if (current?.status === "FINAL_SUBMITTED")
          throw conflict(
            "This attempt has already been submitted and is read-only.",
          );
        if ((current?.revision ?? null) !== input.expectedRevision)
          throw conflict();
        if (current && current.revision === 2_147_483_647)
          throw conflict("This attempt reached its revision limit.");
        const row = current
          ? await tx.attempt.update({
              where: { id: current.id },
              data: {
                proposedCode: input.code,
                reasoning: input.reasoning,
                revision: { increment: 1 },
              },
            })
          : await tx.attempt.create({
              data: {
                learnerId,
                exerciseVersionId: versionId,
                proposedCode: input.code,
                reasoning: input.reasoning,
                revision: 0,
              },
            });
        return LearnerAttemptResponseSchema.parse({ attempt: project(row) });
      });
    },
    async submit(learnerId, rawExerciseId, rawInput) {
      const exerciseId = DraftIdSchema.parse(rawExerciseId);
      const input = LearnerAttemptWriteSchema.parse(rawInput);
      return run(async (tx) => {
        const versionId = await lockPublished(tx, exerciseId);
        const current = await tx.attempt.findUnique({
          where: {
            learnerId_exerciseVersionId: {
              learnerId,
              exerciseVersionId: versionId,
            },
          },
        });
        if (current?.status === "FINAL_SUBMITTED") {
          if (
            current.proposedCode === input.code &&
            current.reasoning === input.reasoning
          )
            return LearnerAttemptResponseSchema.parse({
              attempt: project(current),
            });
          throw conflict("A different final submission already exists.");
        }
        if ((current?.revision ?? null) !== input.expectedRevision)
          throw conflict();
        if (current && current.revision === 2_147_483_647)
          throw conflict("This attempt reached its revision limit.");
        const submittedAt = new Date();
        const row = current
          ? await tx.attempt.update({
              where: { id: current.id },
              data: {
                proposedCode: input.code,
                reasoning: input.reasoning,
                status: "FINAL_SUBMITTED",
                finalSubmittedAt: submittedAt,
                revision: { increment: 1 },
              },
            })
          : await tx.attempt.create({
              data: {
                learnerId,
                exerciseVersionId: versionId,
                proposedCode: input.code,
                reasoning: input.reasoning,
                status: "FINAL_SUBMITTED",
                finalSubmittedAt: submittedAt,
                revision: 0,
              },
            });
        return LearnerAttemptResponseSchema.parse({ attempt: project(row) });
      });
    },
  };
}
