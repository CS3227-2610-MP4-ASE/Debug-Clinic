import {
  ApiErrorSchema,
  AssistantMutationResponseSchema,
  AssistantRequestResponseSchema,
  AssistantStateResponseSchema,
  type AssistantMessageRequest,
} from "@debugclinic/contracts";
import type { ZodType } from "zod";

const base = import.meta.env["VITE_API_BASE_URL"] ?? "";
export class AssistantRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly outcome: "NOT_APPLIED" | "UNKNOWN",
    public readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  schema: ZodType<T>,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/${path}`, {
      method,
      credentials: "include",
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new AssistantRequestError(
      "Check your connection. Your message is still here.",
      0,
      "UNKNOWN",
    );
  }
  if (response.status === 401)
    window.dispatchEvent(new Event("debugclinic:session-expired"));
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(value);
    const retryAfter = Number(response.headers.get("Retry-After"));
    const retryAfterSeconds =
      Number.isSafeInteger(retryAfter) && retryAfter > 0 ? retryAfter : null;
    throw new AssistantRequestError(
      parsed.success
        ? `${parsed.data.error.message}${retryAfterSeconds ? ` Wait ${retryAfterSeconds} seconds before trying again.` : ""}`
        : "The assistant request could not be completed.",
      response.status,
      parsed.success
        ? (parsed.data.error.mutationOutcome ?? "UNKNOWN")
        : "UNKNOWN",
      retryAfterSeconds,
    );
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new AssistantRequestError(
      "The assistant response could not be read. Check status before retrying.",
      response.status,
      "UNKNOWN",
    );
  return parsed.data;
}

const questionPath = (id: string) =>
  `learner/questions/${encodeURIComponent(id)}/assistant`;
export const getLearnerAssistant = (id: string) =>
  request(`${questionPath(id)}`, AssistantStateResponseSchema);
export const sendLearnerAssistant = (
  id: string,
  input: AssistantMessageRequest,
) =>
  request(
    `${questionPath(id)}/messages`,
    AssistantMutationResponseSchema,
    "POST",
    input,
  );
export const clearLearnerAssistant = (
  id: string,
  input: { requestId: string; expectedRevision: number },
) =>
  request(
    `${questionPath(id)}/clear`,
    AssistantStateResponseSchema,
    "POST",
    input,
  );
export const reconcileLearnerAssistant = (id: string, requestId: string) =>
  request(
    `${questionPath(id)}/requests/${encodeURIComponent(requestId)}`,
    AssistantRequestResponseSchema,
  );
