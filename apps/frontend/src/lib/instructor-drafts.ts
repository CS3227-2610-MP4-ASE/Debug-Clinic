import {
  ApiErrorSchema,
  DraftListResponseSchema,
  GenerateQuestionRequestSchema,
  GenerateQuestionResponseSchema,
  SaveDraftRequestSchema,
  SavedDraftResponseSchema,
  type DraftListResponse,
  type GenerateQuestionResponse,
  type SaveDraftRequest,
  type SavedDraftResponse,
} from "@debugclinic/contracts";
import type { ZodType } from "zod";

const apiBaseUrl = import.meta.env["VITE_API_BASE_URL"] ?? "";

export class InstructorDraftError extends Error {}

async function request<T>(
  path: string,
  schema: ZodType<T>,
  body?: unknown,
): Promise<T> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/instructor${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "include",
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const value: unknown = await response.json().catch(() => null);
    if (response.status === 401)
      window.dispatchEvent(new Event("debugclinic:session-expired"));
    if (!response.ok) {
      const parsed = ApiErrorSchema.safeParse(value);
      if (parsed.success) {
        const error = parsed.data.error;
        throw new InstructorDraftError(
          [
            error.message,
            ...(error.details ?? []).map((detail) => detail.message),
          ].join(". "),
        );
      }
      throw new InstructorDraftError(
        "The request could not be completed. Please try again.",
      );
    }
    const parsed = schema.safeParse(value);
    if (!parsed.success)
      throw new InstructorDraftError(
        "The response could not be loaded. Please try again.",
      );
    return parsed.data;
  } catch (error) {
    if (error instanceof InstructorDraftError) throw error;
    throw new InstructorDraftError(
      "The request could not be completed. Check your connection and try again.",
    );
  }
}

export function generateQuestion(
  topic: string,
): Promise<GenerateQuestionResponse> {
  return request(
    "/questions/generate",
    GenerateQuestionResponseSchema,
    GenerateQuestionRequestSchema.parse({ topic }),
  );
}
export function saveDraft(
  input: SaveDraftRequest,
): Promise<SavedDraftResponse> {
  return request(
    "/drafts",
    SavedDraftResponseSchema,
    SaveDraftRequestSchema.parse(input),
  );
}
export function listDrafts(offset = 0): Promise<DraftListResponse> {
  return request(`/drafts?offset=${offset}`, DraftListResponseSchema);
}
export function getDraft(id: string): Promise<SavedDraftResponse> {
  return request(`/drafts/${encodeURIComponent(id)}`, SavedDraftResponseSchema);
}
export function draftFailure(error: unknown): string {
  return error instanceof InstructorDraftError
    ? error.message
    : "The request could not be completed. Please try again.";
}
