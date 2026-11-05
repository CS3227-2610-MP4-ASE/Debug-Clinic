import { z } from "zod";

export const RoleSchema = z.enum(["LEARNER", "INSTRUCTOR"]);
export type Role = z.infer<typeof RoleSchema>;

export const ApiErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "DEPENDENCY_UNAVAILABLE",
  "INTERNAL_ERROR",
]);

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string().min(1),
    requestId: z.string().min(1),
    details: z
      .array(z.object({ path: z.string(), message: z.string() }))
      .optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const CurrentUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: RoleSchema,
});
export type CurrentUser = z.infer<typeof CurrentUserSchema>;

export const CurrentUserResponseSchema = z.object({ user: CurrentUserSchema });

export const ProfileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
  })
  .strict();

export const HintStageSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const AiHintRequestSchema = z
  .object({
    attemptId: z.string().min(1),
    proposedCode: z.string().min(1).max(20_000),
    reasoning: z.string().min(1).max(5_000),
    stage: HintStageSchema,
  })
  .strict();
export type AiHintRequest = z.infer<typeof AiHintRequestSchema>;

export const AiHintResponseSchema = z.object({
  requestId: z.string().min(1),
  stage: HintStageSchema,
  kind: z.enum(["HINT", "ADVISORY"]),
  message: z.string().min(1).max(2_000),
  promptVersion: z.string().min(1),
});
export type AiHintResponse = z.infer<typeof AiHintResponseSchema>;

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "ready"]),
  service: z.literal("debugclinic-api"),
  timestamp: z.string().datetime(),
});

// F01 wire contracts. Code is kept verbatim; prose is normalized at the boundary.
const prose = (maximum: number) =>
  z
    .string()
    .trim()
    .min(1)
    .refine((value) => value.length <= maximum, {
      message: `Must contain at most ${maximum} characters`,
    });
const code = (maximum: number) =>
  z
    .string()
    .refine((value) => value.length <= maximum, {
      message: `Must contain at most ${maximum} characters`,
    })
    .refine((value) => value.trim().length > 0, {
      message: "Required content must not be blank",
    });
export const DraftIdSchema = z
  .string()
  .min(1)
  .refine((value) => value.length <= 128, {
    message: "Must contain at most 128 characters",
  });
export const QuestionTopicSchema = prose(300);
export const QuestionFieldsSchema = z
  .object({
    title: prose(120),
    problemStatement: prose(2000),
    buggyCode: code(4000),
    expectedBehavior: prose(1500),
    bugExplanation: prose(2000),
    correctedSolution: code(4000),
  })
  .strict();
export type QuestionFields = z.infer<typeof QuestionFieldsSchema>;

export const QuestionOutputSchema = z.discriminatedUnion("kind", [
  z
    .object({
      schemaVersion: z.literal("f01-question-v1"),
      kind: z.literal("draft"),
      language: z.literal("python"),
      level: z.literal("beginner-undergraduate"),
      draft: QuestionFieldsSchema,
    })
    .strict(),
  z
    .object({
      schemaVersion: z.literal("f01-question-v1"),
      kind: z.literal("rejected"),
      reason: z.enum([
        "vague",
        "non_python",
        "out_of_level",
        "unrelated",
        "unsuitable",
      ]),
    })
    .strict(),
]);
export type QuestionOutput = z.infer<typeof QuestionOutputSchema>;
export const QuestionGenerationResultSchema = z
  .object({
    output: QuestionOutputSchema,
    inputTokens: z.number().int().min(0).max(2_147_483_647).nullable(),
    outputTokens: z.number().int().min(0).max(2_147_483_647).nullable(),
  })
  .strict();
export type QuestionGenerationResult = z.infer<
  typeof QuestionGenerationResultSchema
>;

export const GenerateQuestionRequestSchema = z
  .object({ topic: QuestionTopicSchema })
  .strict();
export type GenerateQuestionRequest = z.infer<
  typeof GenerateQuestionRequestSchema
>;
const GenerationMetadataSchema = z
  .object({
    id: DraftIdSchema,
    provider: DraftIdSchema,
    model: z.string().nullable(),
    promptVersion: DraftIdSchema,
    generatedAt: z.string().datetime(),
  })
  .strict();
export const GenerateQuestionResponseSchema = z
  .object({
    topic: QuestionTopicSchema,
    draft: QuestionFieldsSchema,
    generation: GenerationMetadataSchema,
  })
  .strict();
export type GenerateQuestionResponse = z.infer<
  typeof GenerateQuestionResponseSchema
>;
export const SaveDraftRequestSchema = z
  .object({
    topic: QuestionTopicSchema,
    draft: QuestionFieldsSchema,
    generationId: DraftIdSchema,
  })
  .strict();
export type SaveDraftRequest = z.infer<typeof SaveDraftRequestSchema>;
export const DraftProvenanceSchema = z
  .object({
    generationId: DraftIdSchema,
    provider: DraftIdSchema,
    model: z.string().nullable(),
    promptVersion: DraftIdSchema,
    generatedAt: z.string().datetime(),
    association: z.literal("instructor-reported"),
  })
  .strict();
export const SavedDraftSchema = QuestionFieldsSchema.extend({
  id: DraftIdSchema,
  status: z.literal("DRAFT"),
  topic: QuestionTopicSchema,
  provenance: DraftProvenanceSchema,
  createdAt: z.string().datetime(),
}).strict();
export type SavedDraft = z.infer<typeof SavedDraftSchema>;
export const SavedDraftResponseSchema = z
  .object({ draft: SavedDraftSchema })
  .strict();
export type SavedDraftResponse = z.infer<typeof SavedDraftResponseSchema>;
export const DraftOffsetSchema = z.number().int().min(0).max(4_294_967_295);
export const DraftListQuerySchema = z
  .object({
    offset: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(DraftOffsetSchema)
      .default(0),
  })
  .strict();
export const DraftListResponseSchema = z
  .object({
    drafts: z
      .array(
        z
          .object({
            id: DraftIdSchema,
            title: prose(120),
            topic: QuestionTopicSchema,
            createdAt: z.string().datetime(),
          })
          .strict(),
      )
      .max(50),
    nextOffset: DraftOffsetSchema.nullable(),
  })
  .strict();
export type DraftListResponse = z.infer<typeof DraftListResponseSchema>;
