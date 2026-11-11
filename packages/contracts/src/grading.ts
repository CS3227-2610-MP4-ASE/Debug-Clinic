import { z } from "zod";

import { DraftIdSchema, RevisionSchema } from "./primitives.js";
import { storageMessage, storageText } from "./storage-text.js";

export const GradingAttemptIdSchema = DraftIdSchema.refine(storageText, {
  message: storageMessage,
});
export const GradingTimestampSchema = z.iso.datetime({ precision: 3 });
export const GradingScoreSchema = z
  .number({ error: "Enter a whole number from 1 to 10." })
  .int({ error: "Enter a whole number from 1 to 10." })
  .min(1, { error: "Enter a whole number from 1 to 10." })
  .max(10, { error: "Enter a whole number from 1 to 10." });
export const GradeRevisionSchema = RevisionSchema.min(1);

export const InstructorSubmissionViewSchema = z.enum(["awaiting", "graded"]);
export type InstructorSubmissionView = z.infer<
  typeof InstructorSubmissionViewSchema
>;

const cursor = z.string().min(1).max(2048);
export const InstructorSubmissionListQuerySchema = z.strictObject({
  view: InstructorSubmissionViewSchema.default("awaiting"),
  cursor: cursor.optional(),
});
export const LearnerSubmissionListQuerySchema = z.strictObject({
  cursor: cursor.optional(),
});

export const LearnerGradeSchema = z.strictObject({ score: GradingScoreSchema });
export type LearnerGrade = z.infer<typeof LearnerGradeSchema>;

export const InstructorGradeSchema = LearnerGradeSchema.extend({
  revision: GradeRevisionSchema,
  savedAt: GradingTimestampSchema,
});
export type InstructorGrade = z.infer<typeof InstructorGradeSchema>;

const submissionIdentity = {
  attemptId: GradingAttemptIdSchema,
  submittedAt: GradingTimestampSchema,
};

export const InstructorSubmissionRowSchema = z.strictObject({
  ...submissionIdentity,
  questionTitle: z.string(),
  learnerDisplayName: z.string(),
  grade: LearnerGradeSchema.nullable(),
});
export type InstructorSubmissionRow = z.infer<
  typeof InstructorSubmissionRowSchema
>;

export const LearnerSubmissionRowSchema = z.strictObject({
  ...submissionIdentity,
  questionTitle: z.string(),
  gradingStatus: z.enum(["AWAITING_GRADE", "GRADED"]),
});
export type LearnerSubmissionRow = z.infer<typeof LearnerSubmissionRowSchema>;

export const LearnerSubmissionDetailSchema = z.strictObject({
  ...submissionIdentity,
  question: z.strictObject({
    title: z.string(),
    problemStatement: z.string(),
    expectedBehavior: z.string(),
  }),
  code: z.string(),
  reasoning: z.string(),
  grade: LearnerGradeSchema.nullable(),
});
export type LearnerSubmissionDetail = z.infer<
  typeof LearnerSubmissionDetailSchema
>;

export const InstructorSubmissionDetailSchema =
  LearnerSubmissionDetailSchema.extend({
    learnerDisplayName: z.string(),
    grade: InstructorGradeSchema.nullable(),
  });
export type InstructorSubmissionDetail = z.infer<
  typeof InstructorSubmissionDetailSchema
>;

export const InstructorSubmissionListResponseSchema = z.strictObject({
  items: z.array(InstructorSubmissionRowSchema).max(50),
  nextCursor: cursor.nullable(),
});
export type InstructorSubmissionListResponse = z.infer<
  typeof InstructorSubmissionListResponseSchema
>;

export const LearnerSubmissionListResponseSchema = z.strictObject({
  items: z.array(LearnerSubmissionRowSchema).max(50),
  nextCursor: cursor.nullable(),
});
export type LearnerSubmissionListResponse = z.infer<
  typeof LearnerSubmissionListResponseSchema
>;

export const InstructorSubmissionDetailResponseSchema = z.strictObject({
  submission: InstructorSubmissionDetailSchema,
});
export type InstructorSubmissionDetailResponse = z.infer<
  typeof InstructorSubmissionDetailResponseSchema
>;

export const LearnerSubmissionDetailResponseSchema = z.strictObject({
  submission: LearnerSubmissionDetailSchema,
});
export type LearnerSubmissionDetailResponse = z.infer<
  typeof LearnerSubmissionDetailResponseSchema
>;

export const InstructorSubmissionGradeResponseSchema = z.strictObject({
  grade: InstructorGradeSchema.nullable(),
});
export type InstructorSubmissionGradeResponse = z.infer<
  typeof InstructorSubmissionGradeResponseSchema
>;

export const LearnerSubmissionGradeResponseSchema = z.strictObject({
  grade: LearnerGradeSchema.nullable(),
});
export type LearnerSubmissionGradeResponse = z.infer<
  typeof LearnerSubmissionGradeResponseSchema
>;

export const SaveSubmissionGradeRequestSchema = z.strictObject({
  score: GradingScoreSchema,
  expectedRevision: GradeRevisionSchema.nullable(),
});
export type SaveSubmissionGradeRequest = z.infer<
  typeof SaveSubmissionGradeRequestSchema
>;

export const SaveSubmissionGradeResponseSchema = z.strictObject({
  grade: InstructorGradeSchema,
});
export type SaveSubmissionGradeResponse = z.infer<
  typeof SaveSubmissionGradeResponseSchema
>;
