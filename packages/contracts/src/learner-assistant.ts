import { z } from "zod";
import { DraftIdSchema, RevisionSchema } from "./primitives.js";

const bounded = (maximum: number, minimum = 0) =>
  z
    .string()
    .refine((value) => value.length >= minimum && value.length <= maximum, {
      message: `Must contain between ${minimum} and ${maximum} UTF-16 code units`,
    });

export const AssistantActionSchema = z.enum(["MESSAGE", "NEXT_HINT"]);
export const AssistantContextSchema = z
  .object({
    shareCode: z.boolean(),
    shareReasoning: z.boolean(),
    shareOutput: z.boolean(),
  })
  .strict();
export const AssistantMessageRequestSchema = z
  .object({
    requestId: z.string().uuid(),
    expectedRevision: RevisionSchema,
    expectedExerciseVersionId: DraftIdSchema,
    action: AssistantActionSchema,
    message: bounded(2_000).optional(),
    context: AssistantContextSchema,
    sharedCode: bounded(20_000).optional(),
    sharedReasoning: bounded(5_000).optional(),
    sharedOutput: bounded(8_000).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.action === "MESSAGE" && !value.message?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["message"],
        message: "Message is required",
      });
    }
    if (value.action === "NEXT_HINT" && value.message !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["message"],
        message: "Next hint requests do not include a learner message",
      });
    }
    if (value.context.shareCode && value.sharedCode === undefined) {
      context.addIssue({
        code: "custom",
        path: ["sharedCode"],
        message: "Shared code is required",
      });
    }
    if (value.context.shareReasoning && value.sharedReasoning === undefined) {
      context.addIssue({
        code: "custom",
        path: ["sharedReasoning"],
        message: "Shared reasoning is required",
      });
    }
    if (value.context.shareOutput && value.sharedOutput === undefined) {
      context.addIssue({
        code: "custom",
        path: ["sharedOutput"],
        message: "Shared output is required",
      });
    }
    if (!value.context.shareCode && value.sharedCode !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["sharedCode"],
        message: "Unshared code must be omitted",
      });
    }
    if (!value.context.shareReasoning && value.sharedReasoning !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["sharedReasoning"],
        message: "Unshared reasoning must be omitted",
      });
    }
    if (!value.context.shareOutput && value.sharedOutput !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["sharedOutput"],
        message: "Unshared output must be omitted",
      });
    }
  });
export type AssistantMessageRequest = z.infer<
  typeof AssistantMessageRequestSchema
>;

export const AssistantMessageSchema = z
  .object({
    id: DraftIdSchema,
    sequence: z.number().int().positive(),
    role: z.enum(["LEARNER", "ASSISTANT"]),
    text: bounded(20_000, 1),
    level: z.number().int().min(1).max(3),
    requestId: z.string().uuid(),
    context: AssistantContextSchema,
    createdAt: z.string().datetime(),
  })
  .strict();
export const AssistantStateSchema = z
  .object({
    exerciseVersionId: DraftIdSchema,
    revision: RevisionSchema,
    unlockedLevel: z.number().int().min(1).max(3),
    hasSuccessfulReply: z.boolean(),
    readOnly: z.boolean(),
    expiresAt: z.string().datetime().nullable(),
    messages: z.array(AssistantMessageSchema).max(50),
  })
  .strict();
export const AssistantStateResponseSchema = z
  .object({ assistant: AssistantStateSchema })
  .strict();
export const AssistantMutationResponseSchema = z
  .object({
    assistant: AssistantStateSchema,
    reply: AssistantMessageSchema.optional(),
    retryAfterSeconds: z.number().int().positive().optional(),
  })
  .strict();
export const AssistantRequestResponseSchema = z
  .object({
    requestId: z.string().uuid(),
    status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "CANCELLED"]),
    reply: AssistantMessageSchema.nullable(),
  })
  .strict();
export const AssistantClearRequestSchema = z
  .object({
    requestId: z.string().uuid(),
    expectedRevision: RevisionSchema,
  })
  .strict();

export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;
export type AssistantState = z.infer<typeof AssistantStateSchema>;
