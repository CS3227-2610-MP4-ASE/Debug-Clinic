import { z } from "zod";
import { DraftIdSchema, RevisionSchema } from "./primitives.js";
import { storageMessage, storageText } from "./storage-text.js";

const learnerText = (maximum: number) =>
  z
    .string()
    .refine(storageText, { message: storageMessage })
    .refine((value) => value.length <= maximum, {
      message: `Must contain at most ${maximum} characters`,
    });

const learnerRequiredText = (maximum: number) =>
  learnerText(maximum).refine((value) => value.trim().length > 0, {
    message: "Required content must not be blank",
  });

export const LearnerAttemptWriteSchema = z
  .object({
    code: learnerRequiredText(20_000),
    reasoning: learnerRequiredText(5_000),
    expectedRevision: RevisionSchema.nullable(),
  })
  .strict();
export type LearnerAttemptWrite = z.infer<typeof LearnerAttemptWriteSchema>;

export const LearnerAttemptSchema = z
  .object({
    id: DraftIdSchema,
    code: learnerText(20_000),
    reasoning: learnerText(5_000),
    status: z.enum(["DRAFT", "FINAL_SUBMITTED"]),
    revision: RevisionSchema,
    submittedAt: z.string().datetime().nullable(),
  })
  .strict();
export type LearnerAttempt = z.infer<typeof LearnerAttemptSchema>;

export const LearnerAttemptResponseSchema = z
  .object({
    attempt: LearnerAttemptSchema.nullable(),
  })
  .strict();
export type LearnerAttemptResponse = z.infer<
  typeof LearnerAttemptResponseSchema
>;
