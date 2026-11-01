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
