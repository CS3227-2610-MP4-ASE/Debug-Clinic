import { randomUUID } from "node:crypto";

import {
  DraftIdSchema,
  DraftListResponseSchema,
  DraftOffsetSchema,
  DraftProvenanceSchema,
  GenerateQuestionResponseSchema,
  QuestionGenerationResultSchema,
  QuestionTopicSchema,
  SaveDraftRequestSchema,
  SavedDraftResponseSchema,
  SavedDraftSchema,
  type DraftListResponse,
  type GenerateQuestionResponse,
  type QuestionGenerationResult,
  type QuestionOutput,
  type SaveDraftRequest,
  type SavedDraft,
  type SavedDraftResponse,
} from "@debugclinic/contracts";

import { Prisma } from "../../../../generated/prisma/client.js";
import type { AiProvider } from "../ai/provider.js";
import { QUESTION_PROMPT_VERSION } from "../ai/question-prompt.js";
import type { AppConfig } from "../config/env.js";
import type { DebugClinicPrisma } from "../db/client.js";
import { AppError, DependencyUnavailableError } from "../lib/errors.js";
import type { AppLogger } from "../lib/logger.js";
import { generationTopicDigest } from "./topic-digest.js";

export interface InstructorDrafts {
  generate(ownerId: string, topic: string): Promise<GenerateQuestionResponse>;
  save(ownerId: string, input: SaveDraftRequest): Promise<SavedDraftResponse>;
  list(ownerId: string, offset?: number): Promise<DraftListResponse>;
  get(ownerId: string, id: string): Promise<SavedDraftResponse>;
}

export interface InstructorDraftsOptions {
  prisma: DebugClinicPrisma;
  provider: AiProvider;
  config: AppConfig;
  logger: AppLogger;
}

const savedSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  createdAt: true,
  versions: {
    where: { version: 1, language: "python" },
    select: {
      topic: true,
      buggyCode: true,
      expectedBehavior: true,
      bugExplanation: true,
      correctedSolution: true,
      generationProvenance: true,
    },
  },
} satisfies Prisma.ExerciseSelect;
type SavedRow = Prisma.ExerciseGetPayload<{ select: typeof savedSelect }>;

function projectDraft(row: SavedRow): SavedDraft | null {
  const version = row.versions[0];
  if (!version) return null;
  const result = SavedDraftSchema.safeParse({
    id: row.id,
    status: row.status,
    title: row.title,
    problemStatement: row.description,
    topic: version.topic,
    buggyCode: version.buggyCode,
    expectedBehavior: version.expectedBehavior,
    bugExplanation: version.bugExplanation,
    correctedSolution: version.correctedSolution,
    provenance: version.generationProvenance,
    createdAt: row.createdAt.toISOString(),
  });
  return result.success ? result.data : null;
}

const refusalGuidance = {
  vague:
    "Please specify a Python concept or narrow the topic to one Python behavior",
  non_python: "Please enter a Python topic",
  unrelated: "Please enter a Python programming concept or task",
  unsuitable: "Please choose a safe, self-contained Python debugging exercise",
} satisfies Record<
  Extract<QuestionOutput, { kind: "rejected" }>["reason"],
  string
>;

const completeVersion: Prisma.ExerciseVersionWhereInput = {
  version: 1,
  language: "python",
  topic: { not: null },
  bugExplanation: { not: null },
  correctedSolution: { not: null },
  generationProvenance: { not: Prisma.DbNull },
};

/** Owns the private draft transition and hides provider, usage and persistence policy. */
export function createInstructorDrafts(
  options: InstructorDraftsOptions,
): InstructorDrafts {
  const { prisma, provider, config, logger } = options;
  const origin = {
    provider: config.aiProvider,
    model: config.aiProvider === "soc" ? (config.socLlmModel ?? null) : null,
    promptVersion:
      config.aiProvider === "soc"
        ? QUESTION_PROMPT_VERSION
        : "fake-question-v1",
  };

  return {
    async generate(ownerId, rawTopic) {
      const topic = QuestionTopicSchema.parse(rawTopic);
      const operationId = randomUUID();
      const started = Date.now();
      let result: QuestionGenerationResult | undefined;
      let generationError: AppError | undefined;
      try {
        if (!provider.generateQuestion) throw new DependencyUnavailableError();
        const parsed = QuestionGenerationResultSchema.safeParse(
          await provider.generateQuestion({ topic }),
        );
        if (!parsed.success) throw new DependencyUnavailableError();
        result = parsed.data;
        if (result.output.kind === "rejected") {
          generationError = new AppError(
            400,
            "BAD_REQUEST",
            "Please choose a supported Python topic",
            [{ path: "topic", message: refusalGuidance[result.output.reason] }],
          );
        }
      } catch {
        generationError = new DependencyUnavailableError(
          "Question generation is temporarily unavailable; try again",
        );
      }
      const latencyMs = Date.now() - started;
      let usage;
      try {
        usage = await prisma.aiUsageEvent.create({
          data: {
            requestId: operationId,
            userId: ownerId,
            attemptId: null,
            operation: "generate-question",
            generationTopicDigest: generationTopicDigest(topic),
            ...origin,
            status:
              result?.output.kind === "rejected"
                ? "REJECTED"
                : generationError
                  ? "FAILED"
                  : "SUCCEEDED",
            inputTokens: result?.inputTokens ?? null,
            outputTokens: result?.outputTokens ?? null,
            latencyMs,
            errorCode:
              result?.output.kind === "rejected"
                ? "TOPIC_REJECTED"
                : generationError
                  ? "GENERATION_FAILED"
                  : null,
          },
          select: { id: true, createdAt: true },
        });
      } catch {
        logger.error(
          { category: "USAGE_RECORDING_FAILED", operationId },
          "USAGE_RECORDING_FAILED",
        );
        throw (
          generationError ??
          new DependencyUnavailableError(
            "Question generation could not be recorded; try again",
          )
        );
      }
      if (generationError) throw generationError;
      if (!result || result.output.kind !== "draft")
        throw new DependencyUnavailableError();
      return GenerateQuestionResponseSchema.parse({
        topic,
        draft: result.output.draft,
        generation: {
          id: usage.id,
          ...origin,
          generatedAt: usage.createdAt.toISOString(),
        },
      });
    },

    async save(ownerId, rawInput) {
      const input = SaveDraftRequestSchema.parse(rawInput);
      try {
        const usage = await prisma.aiUsageEvent.findFirst({
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
            "The generation reference is not available for this draft",
          );
        if (
          usage.generationTopicDigest !== null &&
          usage.generationTopicDigest !== generationTopicDigest(input.topic)
        ) {
          throw new AppError(
            400,
            "BAD_REQUEST",
            "The topic must match the generated question",
            [{ path: "topic", message: "Use the original generated topic" }],
          );
        }
        const provenance = DraftProvenanceSchema.parse({
          generationId: usage.id,
          provider: usage.provider,
          model: usage.model,
          promptVersion: usage.promptVersion,
          generatedAt: usage.createdAt.toISOString(),
          association: "instructor-reported",
        });
        return await prisma.$transaction(async (transaction) => {
          const exercise = await transaction.exercise.create({
            data: {
              title: input.draft.title,
              description: input.draft.problemStatement,
              status: "DRAFT",
              authorId: ownerId,
              publishedAt: null,
            },
            select: { id: true },
          });
          await transaction.exerciseVersion.create({
            data: {
              exerciseId: exercise.id,
              version: 1,
              language: "python",
              buggyCode: input.draft.buggyCode,
              expectedBehavior: input.draft.expectedBehavior,
              topic: input.topic,
              bugExplanation: input.draft.bugExplanation,
              correctedSolution: input.draft.correctedSolution,
              generationProvenance: provenance,
            },
            select: { id: true },
          });
          const row = await transaction.exercise.findFirst({
            where: { id: exercise.id, authorId: ownerId, status: "DRAFT" },
            select: savedSelect,
          });
          const draft = row && projectDraft(row);
          if (!draft) throw new DependencyUnavailableError();
          return SavedDraftResponseSchema.parse({ draft });
        });
      } catch (error) {
        if (error instanceof AppError && error.status === 400) throw error;
        throw new DependencyUnavailableError(
          "The draft could not be saved; try again",
        );
      }
    },

    async list(ownerId, rawOffset = 0) {
      const offset = DraftOffsetSchema.parse(rawOffset);
      try {
        const rows = await prisma.exercise.findMany({
          where: {
            authorId: ownerId,
            status: "DRAFT",
            versions: { some: completeVersion },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: offset,
          take: 51,
          select: {
            id: true,
            title: true,
            createdAt: true,
            versions: {
              where: completeVersion,
              select: { topic: true, generationProvenance: true },
            },
          },
        });
        const nextOffset = rows.length > 50 ? offset + 50 : null;
        if (nextOffset !== null && nextOffset > 4_294_967_295) {
          throw new AppError(
            400,
            "BAD_REQUEST",
            "The requested draft page exceeds the supported pagination range",
          );
        }
        return DraftListResponseSchema.parse({
          drafts: rows.slice(0, 50).map((row) => {
            const version = row.versions[0];
            DraftProvenanceSchema.parse(version?.generationProvenance);
            return {
              id: row.id,
              title: row.title,
              topic: version?.topic,
              createdAt: row.createdAt.toISOString(),
            };
          }),
          nextOffset,
        });
      } catch (error) {
        if (error instanceof AppError && error.status === 400) throw error;
        throw new DependencyUnavailableError(
          "Your drafts could not be loaded; try again",
        );
      }
    },

    async get(ownerId, rawId) {
      const id = DraftIdSchema.parse(rawId);
      try {
        const row = await prisma.exercise.findFirst({
          where: {
            id,
            authorId: ownerId,
            status: "DRAFT",
            versions: { some: completeVersion },
          },
          select: savedSelect,
        });
        const draft = row && projectDraft(row);
        if (!draft) throw new AppError(404, "NOT_FOUND", "Draft not found");
        return SavedDraftResponseSchema.parse({ draft });
      } catch (error) {
        if (error instanceof AppError && error.status === 404) throw error;
        throw new DependencyUnavailableError(
          "The draft could not be loaded; try again",
        );
      }
    },
  };
}
