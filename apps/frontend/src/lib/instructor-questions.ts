import {
  ApiErrorSchema,
  OwnerQuestionResponseSchema,
  OwnerQuestionListResponseSchema,
  PublishQuestionResponseSchema,
  PublishedQuestionResponseSchema,
  PublishedQuestionListResponseSchema,
  LearnerAttemptResponseSchema,
  LearnerDashboardResponseSchema,
  type LearnerAttemptWrite,
  type OwnerQuestionListQuery,
  type PublishQuestionRequest,
  type SaveQuestionChangesRequest,
} from "@debugclinic/contracts";
import type { ZodType } from "zod";

const base = import.meta.env["VITE_API_BASE_URL"] ?? "";

export class QuestionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly outcome: "NOT_APPLIED" | "UNKNOWN",
    public readonly details: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  schema: ZodType<T>,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  try {
    const response = await fetch(`${base}/api/v1/${path}`, {
      method,
      credentials: "include",
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(signal ? { signal } : {}),
    });
    if (response.status === 401)
      window.dispatchEvent(new Event("debugclinic:session-expired"));
    const value: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const parsed = ApiErrorSchema.safeParse(value);
      throw new QuestionError(
        parsed.success
          ? parsed.data.error.message
          : "The request could not be completed. Please try again.",
        response.status,
        parsed.success
          ? (parsed.data.error.mutationOutcome ?? "UNKNOWN")
          : "UNKNOWN",
        parsed.success ? parsed.data.error.details : undefined,
      );
    }
    const parsed = schema.safeParse(value);
    if (!parsed.success)
      throw new QuestionError(
        "The response could not be loaded. Please try again.",
        response.status,
        "UNKNOWN",
      );
    return parsed.data;
  } catch (error) {
    if (error instanceof QuestionError) throw error;
    throw new QuestionError(
      "Check your connection and try again.",
      0,
      "UNKNOWN",
    );
  }
}

export const getOwnerQuestion = (id: string) =>
  request(
    `instructor/questions/${encodeURIComponent(id)}`,
    OwnerQuestionResponseSchema,
  );
export const listOwnerQuestions = (
  status: OwnerQuestionListQuery["status"],
  offset = 0,
) =>
  request(
    `instructor/questions?status=${status}&offset=${offset}`,
    OwnerQuestionListResponseSchema,
  );
export const saveQuestionChanges = (
  id: string,
  input: SaveQuestionChangesRequest,
) =>
  request(
    `instructor/questions/${encodeURIComponent(id)}`,
    OwnerQuestionResponseSchema,
    "PATCH",
    input,
  );
export const publishQuestion = (input: PublishQuestionRequest) =>
  request(
    "instructor/questions/publish",
    PublishQuestionResponseSchema,
    "POST",
    input,
  );
export const removeQuestion = (id: string) =>
  request(
    `instructor/questions/${encodeURIComponent(id)}/remove`,
    OwnerQuestionResponseSchema,
    "POST",
    { confirmed: true },
  );
export const listPublishedQuestions = (offset = 0, q?: string) =>
  request(
    `learner/questions?offset=${offset}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    PublishedQuestionListResponseSchema,
  );
export const getLearnerDashboard = (signal?: AbortSignal) =>
  request(
    "learner/dashboard",
    LearnerDashboardResponseSchema,
    "GET",
    undefined,
    signal,
  );
export const getPublishedQuestion = (id: string) =>
  request(
    `learner/questions/${encodeURIComponent(id)}`,
    PublishedQuestionResponseSchema,
  );
export const questionFailure = (error: unknown) =>
  error instanceof QuestionError
    ? error.message
    : "The request could not be completed. Please try again.";

export const getLearnerAttempt = (id: string) =>
  request(
    `learner/questions/${encodeURIComponent(id)}/attempt`,
    LearnerAttemptResponseSchema,
  );
export const saveLearnerAttempt = (id: string, input: LearnerAttemptWrite) =>
  request(
    `learner/questions/${encodeURIComponent(id)}/attempt`,
    LearnerAttemptResponseSchema,
    "PUT",
    input,
  );
export const submitLearnerAttempt = (id: string, input: LearnerAttemptWrite) =>
  request(
    `learner/questions/${encodeURIComponent(id)}/attempt/submit`,
    LearnerAttemptResponseSchema,
    "POST",
    input,
  );
