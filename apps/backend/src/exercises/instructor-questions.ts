import {
  DraftIdSchema,
  DraftOffsetSchema,
  DraftProvenanceSchema,
  OwnerQuestionSchema,
  OwnerQuestionResponseSchema,
  OwnerQuestionListResponseSchema,
  PublishQuestionRequestSchema,
  PublishQuestionResponseSchema,
  PublishedQuestionSchema,
  PublishedQuestionListResponseSchema,
  SaveQuestionChangesRequestSchema,
  RemoveQuestionRequestSchema,
  type OwnerQuestion,
  type OwnerQuestionResponse,
  type OwnerQuestionListQuery,
  type OwnerQuestionListResponse,
  type PublishQuestionRequest,
  type PublishQuestionResponse,
  type PublishedQuestionListQuery,
  type PublishedQuestionListResponse,
  type PublishedQuestionResponse,
  type SaveQuestionChangesRequest,
  type RemoveQuestionRequest,
  type QuestionFields,
} from "@debugclinic/contracts";
import { Prisma } from "../../../../generated/prisma/client.js";
import type { DebugClinicPrisma } from "../db/client.js";
import { AppError } from "../lib/errors.js";
import type { AppLogger } from "../lib/logger.js";
import { generationTopicDigest } from "./topic-digest.js";

export interface InstructorQuestions {
  listOwner(
    ownerId: string,
    query: OwnerQuestionListQuery,
  ): Promise<OwnerQuestionListResponse>;
  getOwner(ownerId: string, id: string): Promise<OwnerQuestionResponse>;
  saveChanges(
    ownerId: string,
    id: string,
    input: SaveQuestionChangesRequest,
  ): Promise<OwnerQuestionResponse>;
  publish(
    ownerId: string,
    input: PublishQuestionRequest,
  ): Promise<PublishQuestionResponse>;
  remove(
    ownerId: string,
    id: string,
    input: RemoveQuestionRequest,
  ): Promise<OwnerQuestionResponse>;
  listPublished(
    query: PublishedQuestionListQuery,
  ): Promise<PublishedQuestionListResponse>;
  getPublished(id: string): Promise<PublishedQuestionResponse>;
}
export interface InstructorQuestionsOptions {
  prisma: DebugClinicPrisma;
  logger: AppLogger;
}
type Transaction = Prisma.TransactionClient;
const completeVersion = {
  version: 1,
  language: "python",
  topic: { not: null },
  bugExplanation: { not: null },
  correctedSolution: { not: null },
  generationProvenance: { not: Prisma.DbNull },
} satisfies Prisma.ExerciseVersionWhereInput;
const ownerSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  editRevision: true,
  createdAt: true,
  publishedAt: true,
  archivedAt: true,
  versions: {
    where: completeVersion,
    select: {
      id: true,
      topic: true,
      buggyCode: true,
      expectedBehavior: true,
      bugExplanation: true,
      correctedSolution: true,
      generationProvenance: true,
    },
  },
} satisfies Prisma.ExerciseSelect;
type OwnerRow = Prisma.ExerciseGetPayload<{ select: typeof ownerSelect }>;
const publicSelect = {
  ...ownerSelect,
  author: { select: { name: true } },
} satisfies Prisma.ExerciseSelect;
type PublicRow = Prisma.ExerciseGetPayload<{ select: typeof publicSelect }>;
const eligible = {
  status: { in: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
  versions: { some: completeVersion },
} satisfies Prisma.ExerciseWhereInput;
const published = {
  status: "PUBLISHED",
  versions: { some: completeVersion },
} satisfies Prisma.ExerciseWhereInput;
const notFound = () =>
  new AppError(
    404,
    "NOT_FOUND",
    "Question not found",
    undefined,
    "NOT_APPLIED",
  );
const stale = () =>
  new AppError(
    409,
    "CONFLICT",
    "This draft changed. Reload to review the latest version.",
    undefined,
    "NOT_APPLIED",
  );
const unavailable = (outcome: "NOT_APPLIED" | "UNKNOWN" = "NOT_APPLIED") =>
  new AppError(
    503,
    "DEPENDENCY_UNAVAILABLE",
    outcome === "UNKNOWN"
      ? "Publication outcome is unconfirmed. Retry to resolve the same reviewed question."
      : "The question operation could not be completed; retain your edits and try again",
    undefined,
    outcome,
  );
function projectOwner(row: OwnerRow): OwnerQuestion {
  const version = row.versions[0];
  return OwnerQuestionSchema.parse({
    id: row.id,
    versionId: version?.id,
    title: row.title,
    problemStatement: row.description,
    status: row.status,
    revision: row.editRevision,
    createdAt: row.createdAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    topic: version?.topic,
    buggyCode: version?.buggyCode,
    expectedBehavior: version?.expectedBehavior,
    bugExplanation: version?.bugExplanation,
    correctedSolution: version?.correctedSolution,
    provenance: version?.generationProvenance,
  });
}
function projectPublic(row: PublicRow) {
  // Eligibility includes the complete stored contract. Only the explicit public
  // projection below crosses the wire; corrupt private metadata never does.
  projectOwner(row);
  const version = row.versions[0];
  return PublishedQuestionSchema.parse({
    id: row.id,
    title: row.title,
    topic: version?.topic,
    instructorName: row.author.name,
    publishedAt: row.publishedAt?.toISOString(),
    versionId: version?.id,
    problemStatement: row.description,
    buggyCode: version?.buggyCode,
    expectedBehavior: version?.expectedBehavior,
  });
}
function nextOffset(offset: number, count: number): number | null {
  return count > 50 ? DraftOffsetSchema.parse(offset + 50) : null;
}
function knownAbort(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return (
    [
      "P2000",
      "P2002",
      "P2003",
      "P2004",
      "P2011",
      "P2020",
      "P2025",
      "P2034",
    ].includes(error.code) ||
    (error.code === "P2010" &&
      typeof error.meta?.["code"] === "string" &&
      /^(22|23|40|P0)/.test(error.meta["code"]))
  );
}
function previewKeyCollision(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  )
    return false;
  const target = error.meta?.["target"];
  const adapter = error.meta?.["driverAdapterError"] as
    { cause?: { constraint?: { index?: unknown } } } | undefined;
  if (
    adapter?.cause?.constraint?.index ===
    "Exercise_authorId_previewPublicationKey_key"
  )
    return true;
  return (
    (Array.isArray(target) &&
      target.length === 2 &&
      target[0] === "authorId" &&
      target[1] === "previewPublicationKey") ||
    target === "Exercise_authorId_previewPublicationKey_key"
  );
}
async function databaseTime(transaction: Transaction): Promise<Date> {
  const rows = await transaction.$queryRaw<
    Array<{ now: Date }>
  >`SELECT (clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3) AS now`;
  if (!rows[0]) throw unavailable();
  return rows[0].now;
}
function versionFields(draft: QuestionFields) {
  return {
    buggyCode: draft.buggyCode,
    expectedBehavior: draft.expectedBehavior,
    bugExplanation: draft.bugExplanation,
    correctedSolution: draft.correctedSolution,
  };
}

/** PostgreSQL owns atomic state, revision claims and durable replay authority. */
export function createInstructorQuestions({
  prisma,
  logger,
}: InstructorQuestionsOptions): InstructorQuestions {
  async function readOwner(
    client: Transaction | DebugClinicPrisma,
    ownerId: string,
    id: string,
  ) {
    const row = await client.exercise.findFirst({
      where: { ...eligible, id, authorId: ownerId },
      select: ownerSelect,
    });
    if (!row) throw notFound();
    return projectOwner(row);
  }
  async function readKey(
    ownerId: string,
    key: string,
    client: Transaction | DebugClinicPrisma = prisma,
  ) {
    const row = await client.exercise.findFirst({
      where: { ...eligible, authorId: ownerId, previewPublicationKey: key },
      select: ownerSelect,
    });
    return row ? projectOwner(row) : null;
  }
  async function mutation<T>(
    operation: (transaction: Transaction) => Promise<T>,
    replay?: { ownerId: string; key: string },
  ): Promise<T> {
    let callbackComplete = false;
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const result = await operation(transaction);
          callbackComplete = true;
          return result;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    } catch (error) {
      if (replay && previewKeyCollision(error)) {
        // Exactly one root reread; no operation retry after the aborted transaction.
        try {
          const question = await readKey(replay.ownerId, replay.key);
          if (question)
            return PublishQuestionResponseSchema.parse({
              question,
              outcome: "existing",
            }) as T;
        } catch {
          /* Authority remains unresolved; same-key retry is safe. */
        }
        throw unavailable("UNKNOWN");
      }
      if (error instanceof AppError) throw error;
      logger.warn(
        { category: "QUESTION_PERSISTENCE_FAILURE" },
        "Question persistence unavailable",
      );
      // A completed callback may be followed by a lost COMMIT acknowledgment.
      throw unavailable(
        !callbackComplete || knownAbort(error) ? "NOT_APPLIED" : "UNKNOWN",
      );
    }
  }
  async function retrieval<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw unavailable();
    }
  }
  async function writeSaved(
    transaction: Transaction,
    ownerId: string,
    id: string,
    input: SaveQuestionChangesRequest,
    publish: boolean,
  ) {
    const current = await readOwner(transaction, ownerId, id);
    if (publish && current.status !== "DRAFT")
      return { question: current, outcome: "existing" as const };
    if (current.status !== "DRAFT")
      throw new AppError(
        409,
        "CONFLICT",
        "This question is no longer editable/removable. Reload its current state.",
        undefined,
        "NOT_APPLIED",
      );
    if (current.topic !== input.topic)
      throw new AppError(
        400,
        "BAD_REQUEST",
        "The topic cannot be changed",
        [{ path: "topic", message: "Use the saved topic" }],
        "NOT_APPLIED",
      );
    if (current.revision === 2_147_483_647)
      throw new AppError(
        409,
        "CONFLICT",
        "This draft reached its revision limit. Contact support.",
        undefined,
        "NOT_APPLIED",
      );
    const time = publish ? await databaseTime(transaction) : null;
    const claim = await transaction.exercise.updateMany({
      where: {
        id,
        authorId: ownerId,
        status: "DRAFT",
        editRevision: input.expectedRevision,
      },
      data: {
        title: input.draft.title,
        description: input.draft.problemStatement,
        editRevision: { increment: 1 },
        ...(publish ? { status: "PUBLISHED", publishedAt: time } : {}),
      },
    });
    if (claim.count !== 1) {
      const winner = await readOwner(transaction, ownerId, id);
      if (publish && winner.status !== "DRAFT")
        return { question: winner, outcome: "existing" as const };
      throw stale();
    }
    await transaction.exerciseVersion.update({
      where: { id: current.versionId },
      data: versionFields(input.draft),
    });
    return {
      question: await readOwner(transaction, ownerId, id),
      outcome: "published" as const,
    };
  }
  return {
    getOwner(ownerId, rawId) {
      const id = DraftIdSchema.parse(rawId);
      return retrieval(async () =>
        OwnerQuestionResponseSchema.parse({
          question: await readOwner(prisma, ownerId, id),
        }),
      );
    },
    listOwner(ownerId, query) {
      return retrieval(async () => {
        const offset = DraftOffsetSchema.parse(query.offset ?? 0);
        const order =
          query.status === "DRAFT"
            ? "createdAt"
            : query.status === "PUBLISHED"
              ? "publishedAt"
              : "archivedAt";
        const rows = await prisma.exercise.findMany({
          where: { ...eligible, authorId: ownerId, status: query.status },
          orderBy: [{ [order]: "desc" }, { id: "desc" }],
          skip: offset,
          take: 51,
          select: ownerSelect,
        });
        return OwnerQuestionListResponseSchema.parse({
          questions: rows.slice(0, 50).map((row) => {
            const q = projectOwner(row);
            return {
              id: q.id,
              title: q.title,
              topic: q.topic,
              status: q.status,
              createdAt: q.createdAt,
              publishedAt: q.publishedAt,
              archivedAt: q.archivedAt,
            };
          }),
          nextOffset: nextOffset(offset, rows.length),
        });
      });
    },
    saveChanges(ownerId, rawId, rawInput) {
      const id = DraftIdSchema.parse(rawId),
        input = SaveQuestionChangesRequestSchema.parse(rawInput);
      return mutation(async (transaction) => {
        const { question } = await writeSaved(
          transaction,
          ownerId,
          id,
          input,
          false,
        );
        return OwnerQuestionResponseSchema.parse({ question });
      });
    },
    publish(ownerId, rawInput) {
      const input = PublishQuestionRequestSchema.parse(rawInput);
      if (input.source === "saved")
        return mutation(async (transaction) =>
          PublishQuestionResponseSchema.parse(
            await writeSaved(transaction, ownerId, input.id, input, true),
          ),
        );
      return mutation(
        async (transaction) => {
          const existing = await readKey(
            ownerId,
            input.previewKey,
            transaction,
          );
          if (existing)
            return PublishQuestionResponseSchema.parse({
              question: existing,
              outcome: "existing",
            });
          const usage = await transaction.aiUsageEvent.findFirst({
            where: {
              id: input.generationId,
              userId: ownerId,
              operation: "generate-question",
              status: "SUCCEEDED",
            },
            select: {
              id: true,
              provider: true,
              model: true,
              promptVersion: true,
              createdAt: true,
              generationTopicDigest: true,
            },
          });
          if (!usage)
            throw new AppError(
              400,
              "BAD_REQUEST",
              "The generation reference is not available for this question",
              undefined,
              "NOT_APPLIED",
            );
          if (usage.generationTopicDigest === null)
            throw new AppError(
              400,
              "BAD_REQUEST",
              "This older preview cannot be published directly. Save draft and reopen it to publish, or generate a new question.",
              undefined,
              "NOT_APPLIED",
            );
          if (
            usage.generationTopicDigest !== generationTopicDigest(input.topic)
          )
            throw new AppError(
              400,
              "BAD_REQUEST",
              "The topic must match the generated question",
              [{ path: "topic", message: "Use the original generated topic" }],
              "NOT_APPLIED",
            );
          const provenance = DraftProvenanceSchema.parse({
            generationId: usage.id,
            provider: usage.provider,
            model: usage.model,
            promptVersion: usage.promptVersion,
            generatedAt: usage.createdAt.toISOString(),
            association: "instructor-reported",
          });
          const exercise = await transaction.exercise.create({
            data: {
              authorId: ownerId,
              title: input.draft.title,
              description: input.draft.problemStatement,
              status: "PUBLISHED",
              editRevision: 1,
              previewPublicationKey: input.previewKey,
              publishedAt: await databaseTime(transaction),
            },
            select: { id: true },
          });
          await transaction.exerciseVersion.create({
            data: {
              exerciseId: exercise.id,
              version: 1,
              language: "python",
              topic: input.topic,
              ...versionFields(input.draft),
              generationProvenance: provenance,
            },
          });
          return PublishQuestionResponseSchema.parse({
            question: await readOwner(transaction, ownerId, exercise.id),
            outcome: "published",
          });
        },
        { ownerId, key: input.previewKey },
      );
    },
    remove(ownerId, rawId, rawInput) {
      const id = DraftIdSchema.parse(rawId);
      RemoveQuestionRequestSchema.parse(rawInput);
      return mutation(async (transaction) => {
        const current = await readOwner(transaction, ownerId, id);
        if (current.status === "DRAFT")
          throw new AppError(
            409,
            "CONFLICT",
            "This question is no longer editable/removable. Reload its current state.",
            undefined,
            "NOT_APPLIED",
          );
        if (current.status === "PUBLISHED")
          await transaction.exercise.updateMany({
            where: { id, authorId: ownerId, status: "PUBLISHED" },
            data: {
              status: "ARCHIVED",
              archivedAt: await databaseTime(transaction),
            },
          });
        return OwnerQuestionResponseSchema.parse({
          question: await readOwner(transaction, ownerId, id),
        });
      });
    },
    listPublished(query) {
      return retrieval(async () => {
        const offset = DraftOffsetSchema.parse(query.offset ?? 0);
        const rows = await prisma.exercise.findMany({
          where: published,
          orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
          skip: offset,
          take: 51,
          select: publicSelect,
        });
        return PublishedQuestionListResponseSchema.parse({
          questions: rows.slice(0, 50).map((row) => {
            const q = projectPublic(row);
            return {
              id: q.id,
              title: q.title,
              topic: q.topic,
              instructorName: q.instructorName,
              publishedAt: q.publishedAt,
            };
          }),
          nextOffset: nextOffset(offset, rows.length),
        });
      });
    },
    getPublished(rawId) {
      const id = DraftIdSchema.parse(rawId);
      return retrieval(async () => {
        const row = await prisma.exercise.findFirst({
          where: { ...published, id },
          select: publicSelect,
        });
        if (!row) throw notFound();
        return { question: projectPublic(row) };
      });
    },
  };
}
