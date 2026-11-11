import {
  GradeRevisionSchema,
  GradingAttemptIdSchema,
  GradingTimestampSchema,
  SaveSubmissionGradeResponseSchema,
  type InstructorSubmissionDetailResponse,
  type InstructorSubmissionGradeResponse,
  type InstructorSubmissionListResponse,
  type InstructorSubmissionView,
  type LearnerSubmissionDetailResponse,
  type LearnerSubmissionGradeResponse,
  type LearnerSubmissionListResponse,
  type SaveSubmissionGradeRequest,
  type SaveSubmissionGradeResponse,
} from "@debugclinic/contracts";
import { z, ZodError } from "zod";

import { Prisma } from "../../../../generated/prisma/client.js";
import type { DebugClinicPrisma } from "../db/client.js";
import { AppError, DependencyUnavailableError } from "../lib/errors.js";

export interface Grading {
  getInstructorDetail(
    ownerId: string,
    attemptId: string,
  ): Promise<InstructorSubmissionDetailResponse>;
  getInstructorGrade(
    ownerId: string,
    attemptId: string,
  ): Promise<InstructorSubmissionGradeResponse>;
  saveInstructorGrade(
    ownerId: string,
    attemptId: string,
    input: SaveSubmissionGradeRequest,
  ): Promise<SaveSubmissionGradeResponse>;
  listInstructor(
    ownerId: string,
    view: InstructorSubmissionView,
    cursor: GradingCursor | null,
  ): Promise<InstructorSubmissionListResponse>;
  getLearnerDetail(
    learnerId: string,
    attemptId: string,
  ): Promise<LearnerSubmissionDetailResponse>;
  getLearnerGrade(
    learnerId: string,
    attemptId: string,
  ): Promise<LearnerSubmissionGradeResponse>;
  listLearner(
    learnerId: string,
    cursor: GradingCursor | null,
  ): Promise<LearnerSubmissionListResponse>;
}

const cursorSchema = z.strictObject({
  v: z.literal(1),
  scope: z.enum([
    "instructor-awaiting",
    "instructor-graded",
    "learner-submissions",
  ]),
  at: GradingTimestampSchema,
  attemptId: GradingAttemptIdSchema,
});
type GradingCursor = z.infer<typeof cursorSchema>;

export function parseGradingCursor(
  input: string | undefined,
  scope: GradingCursor["scope"],
): GradingCursor | null {
  if (input === undefined) return null;
  try {
    if (input.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(input))
      throw new Error();
    const bytes = Buffer.from(input, "base64url");
    if (bytes.toString("base64url") !== input) throw new Error();
    const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
    const cursor = cursorSchema.parse(JSON.parse(utf8.decode(bytes)));
    if (
      cursor.scope !== scope ||
      new Date(cursor.at).toISOString() !== cursor.at
    )
      throw new Error();
    return cursor;
  } catch {
    throw new AppError(400, "BAD_REQUEST", "The submission cursor is invalid");
  }
}

const pageSize = 50;

function nextCursor<Row>(
  rows: readonly Row[],
  scope: GradingCursor["scope"],
  tuple: (row: Row) => { attemptId: string; at: Date },
): string | null {
  if (rows.length <= pageSize) return null;
  const { attemptId, at } = tuple(rows[pageSize - 1]!);
  const cursor: GradingCursor = {
    v: 1,
    scope,
    at: at.toISOString(),
    attemptId,
  };
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

const submissionTuple = (row: {
  id: string;
  finalSubmittedAt: Date | null;
}) => ({
  attemptId: row.id,
  // The database requires finalSubmittedAt for each FINAL_SUBMITTED attempt.
  at: row.finalSubmittedAt!,
});

const instructorFinals = (ownerId: string): Prisma.AttemptWhereInput => ({
  status: "FINAL_SUBMITTED",
  exerciseVersion: { exercise: { authorId: ownerId } },
});
const learnerFinals = (learnerId: string): Prisma.AttemptWhereInput => ({
  status: "FINAL_SUBMITTED",
  learnerId,
});

const notFound = () =>
  new AppError(
    404,
    "NOT_FOUND",
    "Submission not found",
    undefined,
    "NOT_APPLIED",
  );

const versionDetail = {
  select: {
    expectedBehavior: true,
    exercise: { select: { title: true, description: true } },
  },
} satisfies Prisma.AttemptSelect["exerciseVersion"];

const detailSelect = {
  id: true,
  finalSubmittedAt: true,
  proposedCode: true,
  reasoning: true,
  exerciseVersion: versionDetail,
} satisfies Prisma.AttemptSelect;

const rowSelect = {
  id: true,
  finalSubmittedAt: true,
  exerciseVersion: { select: { exercise: { select: { title: true } } } },
} satisfies Prisma.AttemptSelect;

const instructorRowSelect = {
  ...rowSelect,
  learner: { select: { name: true } },
} satisfies Prisma.AttemptSelect;

const scoreSelect = { score: true };
const gradeSelect = {
  ...scoreSelect,
  revision: true,
  savedAt: true,
} satisfies Prisma.AttemptGradeSelect;

function projectSnapshot(
  row: Prisma.AttemptGetPayload<{ select: typeof detailSelect }>,
) {
  const { exercise, expectedBehavior } = row.exerciseVersion;
  return {
    attemptId: row.id,
    question: {
      title: exercise.title,
      problemStatement: exercise.description,
      expectedBehavior,
    },
    code: row.proposedCode,
    reasoning: row.reasoning,
    submittedAt: row.finalSubmittedAt!.toISOString(),
  };
}

function projectRow(
  row: Prisma.AttemptGetPayload<{ select: typeof rowSelect }>,
) {
  return {
    attemptId: row.id,
    questionTitle: row.exerciseVersion.exercise.title,
    submittedAt: row.finalSubmittedAt!.toISOString(),
  };
}

type StoredGrade = { score: number; revision: number; savedAt: Date };
function projectGrade(grade: StoredGrade) {
  return {
    score: grade.score,
    revision: grade.revision,
    savedAt: grade.savedAt.toISOString(),
  };
}

function afterSubmissionCursor(
  cursor: GradingCursor | null,
  comparison: "gt" | "lt",
): Prisma.AttemptWhereInput {
  if (!cursor) return {};
  const at = new Date(cursor.at);
  return {
    OR: [
      { finalSubmittedAt: { [comparison]: at } },
      { finalSubmittedAt: at, id: { [comparison]: cursor.attemptId } },
    ],
  };
}

function afterGradedCursor(
  cursor: GradingCursor | null,
): Prisma.AttemptGradeWhereInput {
  if (!cursor) return {};
  const at = new Date(cursor.at);
  return {
    OR: [
      { savedAt: { lt: at } },
      { savedAt: at, attemptId: { lt: cursor.attemptId } },
    ],
  };
}

async function read<T>(query: PromiseLike<T>): Promise<T> {
  try {
    return await query;
  } catch {
    throw new DependencyUnavailableError(
      "Submissions are temporarily unavailable",
    );
  }
}

const databaseClock = Prisma.sql`date_trunc('milliseconds', clock_timestamp() AT TIME ZONE 'UTC')`;

async function saveGrade(
  transaction: Prisma.TransactionClient,
  ownerId: string,
  attemptId: string,
  input: SaveSubmissionGradeRequest,
): Promise<SaveSubmissionGradeResponse> {
  // The final attempt is present for both initial saves and corrections, so
  // the same ownership-qualified row serializes writers in either case.
  const attempts = await transaction.$queryRaw<{ id: string }[]>`
    SELECT a."id"
    FROM "Attempt" AS a
    JOIN "ExerciseVersion" AS ev ON ev."id" = a."exerciseVersionId"
    JOIN "Exercise" AS e ON e."id" = ev."exerciseId"
    WHERE a."id" = ${attemptId}
      AND a."status" = 'FINAL_SUBMITTED'
      AND e."authorId" = ${ownerId}
    FOR UPDATE OF a
  `;
  if (!attempts.length) throw notFound();
  const current = await transaction.attemptGrade.findUnique({
    where: { attemptId },
    select: gradeSelect,
  });
  if ((current?.revision ?? null) !== input.expectedRevision) {
    throw new AppError(
      409,
      "CONFLICT",
      "The grade changed. Check the current grade before saving.",
      undefined,
      "NOT_APPLIED",
    );
  }
  if (current?.score === input.score) {
    return SaveSubmissionGradeResponseSchema.parse({
      grade: projectGrade(current),
    });
  }
  if (current && !GradeRevisionSchema.safeParse(current.revision + 1).success) {
    throw new AppError(
      409,
      "CONFLICT",
      "The grade changed. Check the current grade before saving.",
      [{ path: "revision", message: "The grade revision limit was reached." }],
      "NOT_APPLIED",
    );
  }

  const [grade] = current
    ? await transaction.$queryRaw<StoredGrade[]>`
        UPDATE "AttemptGrade"
        SET "score" = ${input.score},
            "revision" = "revision" + 1,
            "savedAt" = GREATEST(${databaseClock}, "savedAt" + INTERVAL '1 millisecond')
        WHERE "attemptId" = ${attemptId}
        RETURNING "score", "revision", "savedAt"
      `
    : await transaction.$queryRaw<StoredGrade[]>`
        INSERT INTO "AttemptGrade" ("attemptId", "score", "revision", "savedAt")
        VALUES (${attemptId}, ${input.score}, 1, ${databaseClock})
        RETURNING "score", "revision", "savedAt"
      `;
  if (!grade) {
    throw new AppError(
      500,
      "INTERNAL_ERROR",
      "The request could not be completed",
      undefined,
      "NOT_APPLIED",
    );
  }
  return SaveSubmissionGradeResponseSchema.parse({
    grade: projectGrade(grade),
  });
}

export function createGrading(prisma: DebugClinicPrisma): Grading {
  return {
    async getInstructorDetail(ownerId, attemptId) {
      const row = await read(
        prisma.attempt.findFirst({
          where: { ...instructorFinals(ownerId), id: attemptId },
          select: {
            ...detailSelect,
            learner: { select: { name: true } },
            grade: { select: gradeSelect },
          },
        }),
      );
      if (!row) throw notFound();
      return {
        submission: {
          ...projectSnapshot(row),
          learnerDisplayName: row.learner.name,
          grade: row.grade ? projectGrade(row.grade) : null,
        },
      };
    },
    async getInstructorGrade(ownerId, attemptId) {
      const row = await read(
        prisma.attempt.findFirst({
          where: { ...instructorFinals(ownerId), id: attemptId },
          select: { grade: { select: gradeSelect } },
        }),
      );
      if (!row) throw notFound();
      return { grade: row.grade ? projectGrade(row.grade) : null };
    },
    async saveInstructorGrade(ownerId, attemptId, input) {
      let commitRequested = false;
      try {
        return await prisma.$transaction(
          async (transaction) => {
            const response = await saveGrade(
              transaction,
              ownerId,
              attemptId,
              input,
            );
            commitRequested = true;
            return response;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
        );
      } catch (error) {
        if (error instanceof AppError && !commitRequested) throw error;
        const knownRollback =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034";
        const outcome =
          commitRequested && !knownRollback ? "UNKNOWN" : "NOT_APPLIED";
        if (error instanceof ZodError) {
          throw new AppError(
            500,
            "INTERNAL_ERROR",
            "The request could not be completed",
            undefined,
            outcome,
          );
        }
        throw new AppError(
          503,
          "DEPENDENCY_UNAVAILABLE",
          outcome === "UNKNOWN"
            ? "The grade outcome could not be confirmed"
            : "The grade could not be saved. Keep your score and try again.",
          undefined,
          outcome,
        );
      }
    },
    async getLearnerDetail(learnerId, attemptId) {
      const row = await read(
        prisma.attempt.findFirst({
          where: { ...learnerFinals(learnerId), id: attemptId },
          select: { ...detailSelect, grade: { select: scoreSelect } },
        }),
      );
      if (!row) throw notFound();
      return { submission: { ...projectSnapshot(row), grade: row.grade } };
    },
    async getLearnerGrade(learnerId, attemptId) {
      const row = await read(
        prisma.attempt.findFirst({
          where: { ...learnerFinals(learnerId), id: attemptId },
          select: { grade: { select: scoreSelect } },
        }),
      );
      if (!row) throw notFound();
      return { grade: row.grade };
    },
    async listInstructor(ownerId, view, cursor) {
      if (view === "graded") {
        // Keep ordering, the continuation and the score on the same grade
        // read even if a correction commits while relations are being loaded.
        const rows = await read(
          prisma.attemptGrade.findMany({
            where: {
              attempt: instructorFinals(ownerId),
              ...afterGradedCursor(cursor),
            },
            select: {
              attemptId: true,
              savedAt: true,
              ...scoreSelect,
              attempt: { select: instructorRowSelect },
            },
            orderBy: [{ savedAt: "desc" }, { attemptId: "desc" }],
            take: pageSize + 1,
          }),
        );
        return {
          items: rows.slice(0, pageSize).map(({ attempt, score }) => ({
            ...projectRow(attempt),
            learnerDisplayName: attempt.learner.name,
            grade: { score },
          })),
          nextCursor: nextCursor(rows, "instructor-graded", (row) => ({
            attemptId: row.attemptId,
            at: row.savedAt,
          })),
        };
      }

      const rows = await read(
        prisma.attempt.findMany({
          where: {
            ...instructorFinals(ownerId),
            grade: { is: null },
            ...afterSubmissionCursor(cursor, "gt"),
          },
          select: instructorRowSelect,
          orderBy: [{ finalSubmittedAt: "asc" }, { id: "asc" }],
          take: pageSize + 1,
        }),
      );
      return {
        items: rows.slice(0, pageSize).map((row) => ({
          ...projectRow(row),
          learnerDisplayName: row.learner.name,
          grade: null,
        })),
        nextCursor: nextCursor(rows, "instructor-awaiting", submissionTuple),
      };
    },
    async listLearner(learnerId, cursor) {
      const rows = await read(
        prisma.attempt.findMany({
          where: {
            ...learnerFinals(learnerId),
            ...afterSubmissionCursor(cursor, "lt"),
          },
          select: { ...rowSelect, grade: { select: { attemptId: true } } },
          orderBy: [{ finalSubmittedAt: "desc" }, { id: "desc" }],
          take: pageSize + 1,
        }),
      );
      return {
        items: rows.slice(0, pageSize).map((row) => ({
          ...projectRow(row),
          gradingStatus: row.grade ? "GRADED" : "AWAITING_GRADE",
        })),
        nextCursor: nextCursor(rows, "learner-submissions", submissionTuple),
      };
    },
  };
}
