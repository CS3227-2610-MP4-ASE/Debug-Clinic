import { createHash } from "node:crypto";
import {
  AssistantMessageSchema,
  AssistantStateSchema,
  type AssistantMessageRequest,
  type AssistantState,
} from "@debugclinic/contracts";
import { Prisma } from "../../../../generated/prisma/client.js";
import { z } from "zod";
import type { DebugClinicPrisma } from "../db/client.js";
import {
  assembledCoachingPromptUnits,
  type AiProvider,
  type CoachingProviderInput,
} from "../ai/provider.js";
import {
  coachingMessageForProvider,
  coachingOutputViolation,
} from "../ai/coaching-output-policy.js";
import { AppError, DependencyUnavailableError } from "../lib/errors.js";
import { findCanonicalPublishedQuestion } from "./instructor-questions.js";

const notFound = () => new AppError(404, "NOT_FOUND", "Question not found");
const conflict = (
  message = "This assistant conversation changed. Reload it and try again.",
) => new AppError(409, "CONFLICT", message, undefined, "NOT_APPLIED");
const unavailable = () =>
  new DependencyUnavailableError(
    "AI coaching is temporarily unavailable; keep your message and try again",
  );
const coachingResultSchema = z
  .object({
    message: z
      .string()
      .refine((value) => value.trim().length > 0 && value.length <= 2_000),
    inputTokens: z.number().int().min(0).nullable(),
    outputTokens: z.number().int().min(0).nullable(),
    attempts: z.number().int().min(1).max(2),
  })
  .strict();
const asLevel = (level: number): 1 | 2 | 3 =>
  level === 2 ? 2 : level === 3 ? 3 : 1;

type Transaction = Prisma.TransactionClient;
type Conversation = {
  id: string;
  learnerId: string;
  exerciseVersionId: string;
  unlockedLevel: number;
  revision: number;
  contentGeneration: number;
  hasSuccessfulReply: boolean;
  lastActivityAt: Date | null;
  expiresAt: Date | null;
};
type MessageRow = {
  id: string;
  sequence: number;
  role: string;
  text: string;
  level: number;
  requestId: string;
  shareCode: boolean;
  shareReasoning: boolean;
  shareOutput: boolean;
  codeSnapshot: string | null;
  reasoningSnapshot: string | null;
  outputSnapshot: string | null;
  createdAt: Date;
};

function publicMessage(row: MessageRow) {
  return AssistantMessageSchema.parse({
    id: row.id,
    sequence: row.sequence,
    role: row.role,
    text: row.text,
    level: row.level,
    requestId: row.requestId,
    context: {
      shareCode: row.shareCode,
      shareReasoning: row.shareReasoning,
      shareOutput: row.shareOutput,
    },
    createdAt: row.createdAt.toISOString(),
  });
}

function projectState(
  versionId: string,
  conversation: Conversation | null,
  messages: MessageRow[],
  final: boolean,
  now: Date,
): AssistantState {
  const expired = Boolean(
    conversation?.expiresAt && conversation.expiresAt <= now,
  );
  return AssistantStateSchema.parse({
    exerciseVersionId: versionId,
    revision: (conversation?.revision ?? 0) + (expired ? 1 : 0),
    unlockedLevel: conversation?.unlockedLevel ?? 1,
    hasSuccessfulReply: conversation?.hasSuccessfulReply ?? false,
    readOnly: final,
    expiresAt: expired
      ? null
      : (conversation?.expiresAt?.toISOString() ?? null),
    messages: expired ? [] : messages.map(publicMessage),
  });
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function includedHistory(
  prisma: Pick<Transaction, "learnerAssistantMessage">,
  conversationId: string,
  enabled: AssistantMessageRequest["context"],
): Promise<CoachingProviderInput["history"]> {
  const pairs: CoachingProviderInput["history"] = [];
  const exchangeRows = new Map<string, MessageRow[]>();
  let beforeSequence: number | undefined;
  while (pairs.length < 8) {
    const rows = await prisma.learnerAssistantMessage.findMany({
      where: {
        conversationId,
        ...(beforeSequence === undefined
          ? {}
          : { sequence: { lt: beforeSequence } }),
      },
      orderBy: { sequence: "desc" },
      take: 50,
    });
    if (!rows.length) break;
    beforeSequence = rows.at(-1)!.sequence;
    for (const row of rows) {
      const exchange = exchangeRows.get(row.requestId) ?? [];
      exchange.push(row);
      exchangeRows.set(row.requestId, exchange);
      if (exchange.length !== 2) continue;
      const learner = exchange.find((message) => message.role === "LEARNER");
      const coach = exchange.find((message) => message.role === "ASSISTANT");
      if (!learner || !coach) continue;
      if (
        (learner.shareCode && !enabled.shareCode) ||
        (learner.shareReasoning && !enabled.shareReasoning) ||
        (learner.shareOutput && !enabled.shareOutput)
      )
        continue;
      pairs.push({
        learner: JSON.stringify({
          text: coachingMessageForProvider(learner.text),
          ...(learner.shareCode ? { code: learner.codeSnapshot } : {}),
          ...(learner.shareReasoning
            ? { reasoning: learner.reasoningSnapshot }
            : {}),
          ...(learner.shareOutput ? { output: learner.outputSnapshot } : {}),
        }),
        assistant: coach.text,
      });
      if (pairs.length === 8) break;
    }
    if (rows.length < 50) break;
  }
  return pairs.reverse();
}

function currentInput(input: AssistantMessageRequest) {
  return {
    message:
      input.action === "MESSAGE"
        ? input.message!
        : "Give the next progressive hint.",
    ...(input.context.shareCode ? { code: input.sharedCode! } : {}),
    ...(input.context.shareReasoning
      ? { reasoning: input.sharedReasoning! }
      : {}),
    ...(input.context.shareOutput ? { output: input.sharedOutput! } : {}),
  };
}

function singaporeDayStart(now: Date) {
  const localDate = new Date(now.getTime() + 8 * 60 * 60_000)
    .toISOString()
    .slice(0, 10);
  return new Date(`${localDate}T00:00:00+08:00`);
}

export interface LearnerAssistant {
  get(learnerId: string, exerciseId: string): Promise<AssistantState>;
  send(
    learnerId: string,
    exerciseId: string,
    input: AssistantMessageRequest,
  ): Promise<{
    assistant: AssistantState;
    reply?: ReturnType<typeof publicMessage>;
    retryAfterSeconds?: number;
  }>;
  clear(
    learnerId: string,
    exerciseId: string,
    input: { requestId: string; expectedRevision: number },
  ): Promise<AssistantState>;
  reconcile(
    learnerId: string,
    exerciseId: string,
    requestId: string,
  ): Promise<{
    requestId: string;
    status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
    reply: ReturnType<typeof publicMessage> | null;
  }>;
  cleanupExpired(now?: Date): Promise<number>;
}

export function createLearnerAssistant(
  prisma: DebugClinicPrisma,
  provider: AiProvider,
): LearnerAssistant {
  async function transaction<T>(
    run: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    try {
      return await prisma.$transaction(run, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw unavailable();
    }
  }

  async function lockExercise(
    tx: Transaction,
    exerciseId: string,
    versionId: string,
  ) {
    const locked = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT "id" FROM "Exercise" WHERE "id" = ${exerciseId} AND "status" = 'PUBLISHED' FOR UPDATE`;
    if (!locked.length) throw notFound();
    const question = await findCanonicalPublishedQuestion(tx, exerciseId);
    if (!question || question.versionId !== versionId)
      throw conflict(
        "This exercise version changed. Reload before asking for coaching.",
      );
    return question;
  }

  async function readState(
    learnerId: string,
    exerciseId: string,
    expectedVersion?: string,
  ) {
    const question = await findCanonicalPublishedQuestion(prisma, exerciseId);
    if (
      !question ||
      (expectedVersion && expectedVersion !== question.versionId)
    )
      throw notFound();
    const [conversation, attempt] = await Promise.all([
      prisma.learnerAssistantConversation.findUnique({
        where: {
          learnerId_exerciseVersionId: {
            learnerId,
            exerciseVersionId: question.versionId,
          },
        },
      }),
      prisma.attempt.findUnique({
        where: {
          learnerId_exerciseVersionId: {
            learnerId,
            exerciseVersionId: question.versionId,
          },
        },
        select: { status: true },
      }),
    ]);
    const messages =
      conversation &&
      (!conversation.expiresAt || conversation.expiresAt > new Date())
        ? await prisma.learnerAssistantMessage.findMany({
            where: { conversationId: conversation.id },
            orderBy: { sequence: "desc" },
            take: 50,
          })
        : [];
    return projectState(
      question.versionId,
      conversation,
      messages.reverse(),
      attempt?.status === "FINAL_SUBMITTED",
      new Date(),
    );
  }

  return {
    get: readState,

    async send(learnerId, exerciseId, input) {
      const bodyDigest = digest(input);
      const reserved = await transaction(async (tx) => {
        await tx.$executeRaw`INSERT INTO "LearnerAssistantQuota" ("learnerId") VALUES (${learnerId}) ON CONFLICT ("learnerId") DO NOTHING`;
        await tx.$queryRaw`SELECT "learnerId" FROM "LearnerAssistantQuota" WHERE "learnerId" = ${learnerId} FOR UPDATE`;
        const question = await lockExercise(
          tx,
          exerciseId,
          input.expectedExerciseVersionId,
        );
        const nowRows = await tx.$queryRaw<
          Array<{ now: Date }>
        >`SELECT clock_timestamp() AS now`;
        const now = nowRows[0]?.now ?? new Date();
        let conversation = await tx.learnerAssistantConversation.findUnique({
          where: {
            learnerId_exerciseVersionId: {
              learnerId,
              exerciseVersionId: question.versionId,
            },
          },
        });
        if (!conversation)
          conversation = await tx.learnerAssistantConversation.create({
            data: { learnerId, exerciseVersionId: question.versionId },
          });
        await tx.$queryRaw`SELECT "id" FROM "LearnerAssistantConversation" WHERE "id" = ${conversation.id} FOR UPDATE`;
        conversation = await tx.learnerAssistantConversation.findUniqueOrThrow({
          where: { id: conversation.id },
        });

        if (conversation.expiresAt && conversation.expiresAt <= now) {
          await tx.learnerAssistantMessage.deleteMany({
            where: { conversationId: conversation.id },
          });
          await tx.learnerAssistantRequest.updateMany({
            where: { conversationId: conversation.id, status: "PENDING" },
            data: { status: "CANCELLED", leaseExpiresAt: null },
          });
          conversation = await tx.learnerAssistantConversation.update({
            where: { id: conversation.id },
            data: {
              contentGeneration: { increment: 1 },
              revision: { increment: 1 },
              lastActivityAt: null,
              expiresAt: null,
            },
          });
        }
        const prior = await tx.learnerAssistantRequest.findUnique({
          where: {
            learnerId_requestId: { learnerId, requestId: input.requestId },
          },
        });
        if (prior) {
          if (
            prior.conversationId !== conversation.id ||
            prior.payloadDigest !== bodyDigest
          )
            throw conflict(
              "This request ID was already used for different content.",
            );
          if (prior.status === "SUCCEEDED") {
            const reply = prior.replyMessageId
              ? await tx.learnerAssistantMessage.findUnique({
                  where: { id: prior.replyMessageId },
                })
              : null;
            return {
              duplicate: true as const,
              state: await stateInTransaction(
                tx,
                learnerId,
                question.versionId,
                conversation,
              ),
              reply: reply ? publicMessage(reply) : undefined,
            };
          }
          throw conflict(
            prior.status === "PENDING"
              ? "This request is still processing. Check its status before retrying."
              : "This request cannot be replayed. Start a new message.",
          );
        }
        await tx.learnerAssistantRequest.updateMany({
          where: { learnerId, status: "PENDING", leaseExpiresAt: { lte: now } },
          data: { status: "FAILED", leaseExpiresAt: null },
        });
        const attempt = await tx.attempt.findUnique({
          where: {
            learnerId_exerciseVersionId: {
              learnerId,
              exerciseVersionId: question.versionId,
            },
          },
          select: { status: true },
        });
        if (attempt?.status === "FINAL_SUBMITTED")
          throw conflict(
            "This submission is final; new coaching is read-only.",
          );
        if (input.expectedRevision !== conversation.revision) throw conflict();
        const targetLevel =
          input.action === "NEXT_HINT"
            ? conversation.unlockedLevel +
              (conversation.hasSuccessfulReply ? 1 : 0)
            : conversation.unlockedLevel;
        if (
          input.action === "NEXT_HINT" &&
          (!conversation.hasSuccessfulReply || conversation.unlockedLevel >= 3)
        )
          throw conflict(
            "A next hint is available after a successful reply, up to level 3.",
          );
        const pending = await tx.learnerAssistantRequest.findFirst({
          where: {
            conversationId: conversation.id,
            status: "PENDING",
            leaseExpiresAt: { gt: now },
          },
        });
        if (pending)
          throw conflict(
            "Wait for the current coaching reply before sending another message.",
          );

        const history = await includedHistory(
          tx,
          conversation.id,
          input.context,
        );
        const providerInput: CoachingProviderInput = {
          level: asLevel(targetLevel),
          question: {
            title: question.title,
            problemStatement: question.problemStatement,
            expectedBehavior: question.expectedBehavior,
            buggyCode: question.buggyCode,
          },
          current: currentInput(input),
          history,
        };
        providerInput.current.message = coachingMessageForProvider(
          providerInput.current.message,
        );
        while (
          history.length > 0 &&
          assembledCoachingPromptUnits(providerInput) > 48_000
        )
          history.shift();
        if (assembledCoachingPromptUnits(providerInput) > 48_000)
          throw new AppError(
            400,
            "BAD_REQUEST",
            "The shared context is too large. Turn off a category or send a shorter message.",
          );
        const privateSolution = await tx.exerciseVersion.findUnique({
          where: { id: question.versionId },
          select: { correctedSolution: true },
        });
        if (!privateSolution?.correctedSolution) throw unavailable();
        const previousAssistantMessages =
          await tx.learnerAssistantMessage.findMany({
            where: { conversationId: conversation.id, role: "ASSISTANT" },
            orderBy: { sequence: "desc" },
            take: 8,
            select: { text: true },
          });

        const dayStart = singaporeDayStart(now);
        const [rolling, daily, oldest] = await Promise.all([
          tx.learnerAssistantRequest.count({
            where: {
              learnerId,
              action: { in: ["MESSAGE", "NEXT_HINT"] },
              createdAt: { gt: new Date(now.getTime() - 10 * 60_000) },
            },
          }),
          tx.learnerAssistantRequest.count({
            where: {
              learnerId,
              action: { in: ["MESSAGE", "NEXT_HINT"] },
              createdAt: { gte: dayStart },
            },
          }),
          tx.learnerAssistantRequest.findFirst({
            where: {
              learnerId,
              action: { in: ["MESSAGE", "NEXT_HINT"] },
              createdAt: { gt: new Date(now.getTime() - 10 * 60_000) },
            },
            orderBy: { createdAt: "asc" },
            select: { createdAt: true },
          }),
        ]);
        if (rolling >= 10 || daily >= 100) {
          const rollingRetry =
            rolling >= 10 && oldest
              ? Math.max(
                  1,
                  Math.ceil(
                    (oldest.createdAt.getTime() + 10 * 60_000 - now.getTime()) /
                      1000,
                  ),
                )
              : 0;
          const dailyRetry =
            daily >= 100
              ? Math.ceil(
                  (dayStart.getTime() + 24 * 60 * 60_000 - now.getTime()) /
                    1000,
                )
              : 0;
          throw new AppError(
            429,
            "RATE_LIMITED",
            "Assistant limit reached. Try again after the indicated wait.",
            undefined,
            undefined,
            Math.max(rollingRetry, dailyRetry),
          );
        }
        const leaseExpiresAt = new Date(now.getTime() + 35_000);
        await tx.learnerAssistantRequest.create({
          data: {
            learnerId,
            conversationId: conversation.id,
            requestId: input.requestId,
            payloadDigest: bodyDigest,
            action: input.action,
            status: "PENDING",
            expectedRevision: input.expectedRevision,
            contentGeneration: conversation.contentGeneration,
            targetLevel,
            leaseExpiresAt,
            providerAttempts: 0,
          },
        });
        return {
          duplicate: false as const,
          conversation,
          question,
          now,
          targetLevel,
          requestId: input.requestId,
          leaseExpiresAt,
          providerInput,
          correctedSolution: privateSolution.correctedSolution,
          previousAssistantMessages: previousAssistantMessages
            .reverse()
            .map(({ text }) => text),
        };
      });
      if (reserved.duplicate)
        return {
          assistant: reserved.state,
          ...(reserved.reply ? { reply: reserved.reply } : {}),
        };

      const conversation = reserved.conversation;
      const targetLevel = asLevel(reserved.targetLevel);
      if (!provider.generateCoaching) {
        await failRequest(reserved.requestId, learnerId, conversation.id, 0);
        throw unavailable();
      }
      let result: Awaited<
        ReturnType<NonNullable<AiProvider["generateCoaching"]>>
      >;
      try {
        result = coachingResultSchema.parse(
          await provider.generateCoaching(reserved.providerInput),
        );
        const violation = coachingOutputViolation({
          message: result.message,
          level: targetLevel,
          buggyCode: reserved.question.buggyCode,
          correctedSolution: reserved.correctedSolution,
          previousAssistantMessages: reserved.previousAssistantMessages,
        });
        if (violation)
          throw new Error("Coaching output failed policy validation");
      } catch (failed) {
        const providerAttempts =
          failed &&
          typeof failed === "object" &&
          "providerAttempts" in failed &&
          typeof failed.providerAttempts === "number"
            ? failed.providerAttempts
            : 1;
        await failRequest(
          reserved.requestId,
          learnerId,
          conversation.id,
          providerAttempts,
        );
        throw unavailable();
      }
      const finalized = await transaction(async (tx) => {
        const locked = await tx.$queryRaw<
          Array<{ id: string }>
        >`SELECT "id" FROM "Exercise" WHERE "id" = ${exerciseId} AND "status" = 'PUBLISHED' FOR UPDATE`;
        await tx.$queryRaw`SELECT "id" FROM "LearnerAssistantConversation" WHERE "id" = ${conversation.id} FOR UPDATE`;
        const finalNow =
          (
            await tx.$queryRaw<
              Array<{ now: Date }>
            >`SELECT clock_timestamp() AS now`
          )[0]?.now ?? new Date();
        const current = await tx.learnerAssistantConversation.findUnique({
          where: { id: conversation.id },
        });
        const request = await tx.learnerAssistantRequest.findUnique({
          where: {
            learnerId_requestId: { learnerId, requestId: reserved.requestId },
          },
        });
        const question = locked.length
          ? await findCanonicalPublishedQuestion(tx, exerciseId)
          : null;
        const attempt = await tx.attempt.findUnique({
          where: {
            learnerId_exerciseVersionId: {
              learnerId,
              exerciseVersionId: conversation.exerciseVersionId,
            },
          },
          select: { status: true },
        });
        if (
          !current ||
          !request ||
          request.status !== "PENDING" ||
          !request.leaseExpiresAt ||
          request.leaseExpiresAt <= finalNow ||
          current.contentGeneration !== request.contentGeneration ||
          current.revision !== input.expectedRevision ||
          question?.versionId !== input.expectedExerciseVersionId ||
          attempt?.status === "FINAL_SUBMITTED" ||
          (current.expiresAt && current.expiresAt <= finalNow)
        ) {
          if (request?.status === "PENDING")
            await tx.learnerAssistantRequest.update({
              where: { id: request.id },
              data: {
                status: "CANCELLED",
                providerAttempts: result.attempts,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                leaseExpiresAt: null,
              },
            });
          return null;
        }
        const last = await tx.learnerAssistantMessage.aggregate({
          where: { conversationId: conversation.id },
          _max: { sequence: true },
        });
        const learner = await tx.learnerAssistantMessage.create({
          data: {
            conversationId: conversation.id,
            sequence: (last._max.sequence ?? 0) + 1,
            role: "LEARNER",
            text:
              input.action === "MESSAGE"
                ? input.message!
                : "Next hint requested.",
            level: conversation.unlockedLevel,
            requestId: input.requestId,
            shareCode: input.context.shareCode,
            shareReasoning: input.context.shareReasoning,
            shareOutput: input.context.shareOutput,
            codeSnapshot: input.context.shareCode ? input.sharedCode! : null,
            reasoningSnapshot: input.context.shareReasoning
              ? input.sharedReasoning!
              : null,
            outputSnapshot: input.context.shareOutput
              ? input.sharedOutput!
              : null,
          },
        });
        const reply = await tx.learnerAssistantMessage.create({
          data: {
            conversationId: conversation.id,
            sequence: learner.sequence + 1,
            role: "ASSISTANT",
            text: result.message,
            level: reserved.targetLevel,
            requestId: input.requestId,
            shareCode: input.context.shareCode,
            shareReasoning: input.context.shareReasoning,
            shareOutput: input.context.shareOutput,
          },
        });
        const updated = await tx.learnerAssistantConversation.update({
          where: { id: conversation.id },
          data: {
            revision: { increment: 1 },
            unlockedLevel: Math.max(
              conversation.unlockedLevel,
              reserved.targetLevel,
            ),
            hasSuccessfulReply: true,
            lastActivityAt: finalNow,
            expiresAt: new Date(finalNow.getTime() + 30 * 24 * 60 * 60_000),
          },
        });
        await tx.learnerAssistantRequest.update({
          where: { id: request.id },
          data: {
            status: "SUCCEEDED",
            replyMessageId: reply.id,
            providerAttempts: result.attempts,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            leaseExpiresAt: null,
          },
        });
        const all = await tx.learnerAssistantMessage.findMany({
          where: { conversationId: conversation.id },
          orderBy: { sequence: "desc" },
          take: 50,
        });
        return {
          state: projectState(
            question.versionId,
            updated,
            all.reverse(),
            false,
            finalNow,
          ),
          reply: publicMessage(reply),
        };
      });
      if (!finalized)
        return { assistant: await readState(learnerId, exerciseId) };
      return { assistant: finalized.state, reply: finalized.reply };
    },

    async clear(learnerId, exerciseId, input) {
      return transaction(async (tx) => {
        const lock = await tx.$queryRaw<
          Array<{ id: string }>
        >`SELECT "id" FROM "Exercise" WHERE "id" = ${exerciseId} AND "status" = 'PUBLISHED' FOR UPDATE`;
        if (!lock.length) throw notFound();
        const published = await findCanonicalPublishedQuestion(tx, exerciseId);
        if (!published) throw notFound();
        let conversation = await tx.learnerAssistantConversation.findUnique({
          where: {
            learnerId_exerciseVersionId: {
              learnerId,
              exerciseVersionId: published.versionId,
            },
          },
        });
        if (!conversation)
          return projectState(published.versionId, null, [], false, new Date());
        await tx.$queryRaw`SELECT "id" FROM "LearnerAssistantConversation" WHERE "id" = ${conversation.id} FOR UPDATE`;
        const existing = await tx.learnerAssistantRequest.findUnique({
          where: {
            learnerId_requestId: { learnerId, requestId: input.requestId },
          },
        });
        const clearDigest = digest({
          action: "CLEAR",
          expectedRevision: input.expectedRevision,
          versionId: published.versionId,
        });
        if (existing) {
          if (
            existing.payloadDigest !== clearDigest ||
            existing.action !== "CLEAR"
          )
            throw conflict(
              "This request ID was already used for different content.",
            );
        } else {
          if (input.expectedRevision !== conversation.revision)
            throw conflict();
          await tx.learnerAssistantRequest.create({
            data: {
              learnerId,
              conversationId: conversation.id,
              requestId: input.requestId,
              payloadDigest: clearDigest,
              action: "CLEAR",
              status: "SUCCEEDED",
              expectedRevision: input.expectedRevision,
              contentGeneration: conversation.contentGeneration,
              targetLevel: conversation.unlockedLevel,
            },
          });
          await tx.learnerAssistantMessage.deleteMany({
            where: { conversationId: conversation.id },
          });
          await tx.learnerAssistantRequest.updateMany({
            where: { conversationId: conversation.id, status: "PENDING" },
            data: { status: "CANCELLED", leaseExpiresAt: null },
          });
          conversation = await tx.learnerAssistantConversation.update({
            where: { id: conversation.id },
            data: {
              contentGeneration: { increment: 1 },
              revision: { increment: 1 },
            },
          });
        }
        return projectState(
          published.versionId,
          conversation,
          [],
          false,
          new Date(),
        );
      });
    },

    async reconcile(learnerId, exerciseId, requestId) {
      const question = await findCanonicalPublishedQuestion(prisma, exerciseId);
      if (!question) throw notFound();
      let request = await prisma.learnerAssistantRequest.findFirst({
        where: {
          learnerId,
          requestId,
          conversation: { exerciseVersionId: question.versionId },
        },
      });
      if (!request) throw notFound();
      if (
        request.status === "PENDING" &&
        request.leaseExpiresAt &&
        request.leaseExpiresAt <= new Date()
      ) {
        await prisma.learnerAssistantRequest.updateMany({
          where: {
            id: request.id,
            status: "PENDING",
            leaseExpiresAt: { lte: new Date() },
          },
          data: { status: "FAILED", leaseExpiresAt: null },
        });
        request = await prisma.learnerAssistantRequest.findUniqueOrThrow({
          where: { id: request.id },
        });
      }
      const conversation = await prisma.learnerAssistantConversation.findUnique(
        { where: { id: request.conversationId } },
      );
      const expired = Boolean(
        conversation?.expiresAt && conversation.expiresAt <= new Date(),
      );
      const reply =
        request.status === "SUCCEEDED" && !expired && request.replyMessageId
          ? await prisma.learnerAssistantMessage.findUnique({
              where: { id: request.replyMessageId },
            })
          : null;
      return {
        requestId,
        status: request.status as
          "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED",
        reply: reply ? publicMessage(reply) : null,
      };
    },

    async cleanupExpired(now = new Date()) {
      let total = 0;
      while (true) {
        const batch = await transaction(async (tx) => {
          const candidates = await tx.learnerAssistantConversation.findMany({
            where: { expiresAt: { lte: now } },
            select: { id: true, expiresAt: true },
            take: 500,
          });
          let removed = 0;
          for (const candidate of candidates) {
            await tx.$queryRaw`SELECT "id" FROM "LearnerAssistantConversation" WHERE "id" = ${candidate.id} FOR UPDATE`;
            const current = await tx.learnerAssistantConversation.findUnique({
              where: { id: candidate.id },
            });
            if (
              !current?.expiresAt ||
              current.expiresAt > now ||
              current.expiresAt.getTime() !== candidate.expiresAt?.getTime()
            )
              continue;
            await tx.learnerAssistantMessage.deleteMany({
              where: { conversationId: current.id },
            });
            await tx.learnerAssistantRequest.updateMany({
              where: { conversationId: current.id, status: "PENDING" },
              data: { status: "CANCELLED", leaseExpiresAt: null },
            });
            await tx.learnerAssistantConversation.update({
              where: { id: current.id },
              data: {
                contentGeneration: { increment: 1 },
                revision: { increment: 1 },
                lastActivityAt: null,
                expiresAt: null,
              },
            });
            removed++;
          }
          return { removed, full: candidates.length === 500 };
        });
        total += batch.removed;
        if (!batch.full || batch.removed === 0) break;
      }
      await prisma.learnerAssistantRequest.deleteMany({
        where: {
          createdAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60_000) },
        },
      });
      return total;
    },
  };

  async function failRequest(
    requestId: string,
    learnerId: string,
    conversationId: string,
    attempts: number,
  ) {
    await prisma.learnerAssistantRequest.updateMany({
      where: { learnerId, conversationId, requestId, status: "PENDING" },
      data: {
        status: "FAILED",
        providerAttempts: attempts,
        leaseExpiresAt: null,
      },
    });
  }

  async function stateInTransaction(
    tx: Transaction,
    learnerId: string,
    versionId: string,
    conversation: Conversation,
  ) {
    const [messages, attempt] = await Promise.all([
      tx.learnerAssistantMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { sequence: "desc" },
        take: 50,
      }),
      tx.attempt.findUnique({
        where: {
          learnerId_exerciseVersionId: {
            learnerId,
            exerciseVersionId: versionId,
          },
        },
        select: { status: true },
      }),
    ]);
    return projectState(
      versionId,
      conversation,
      messages.reverse(),
      attempt?.status === "FINAL_SUBMITTED",
      new Date(),
    );
  }
}
