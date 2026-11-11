import {
  ApiErrorSchema,
  InstructorSubmissionDetailResponseSchema,
  InstructorSubmissionGradeResponseSchema,
  InstructorSubmissionListResponseSchema,
  LearnerSubmissionDetailResponseSchema,
  LearnerSubmissionGradeResponseSchema,
  LearnerSubmissionListResponseSchema,
  SaveSubmissionGradeResponseSchema,
  type ApiError,
  type InstructorSubmissionView,
  type SaveSubmissionGradeRequest,
} from "@debugclinic/contracts";
import type { ZodType } from "zod";

const base = import.meta.env["VITE_API_BASE_URL"] ?? "";
const defaultFailure = "The request could not be completed. Please try again.";
const definitiveWriteCodes: Partial<Record<number, ApiError["error"]["code"]>> =
  {
    400: "BAD_REQUEST",
    403: "FORBIDDEN",
    409: "CONFLICT",
    413: "BAD_REQUEST",
    429: "RATE_LIMITED",
    503: "DEPENDENCY_UNAVAILABLE",
  };

export class GradingRequestError extends Error {
  constructor(
    message = defaultFailure,
    public readonly status = 0,
    public readonly outcome: "UNKNOWN" | "NOT_APPLIED" = "UNKNOWN",
    public readonly accessDenied?: 401 | 403 | 404,
    public readonly revisionLimit = false,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}

type Request = { actorId: string; signal: AbortSignal };

function retryAfterMs(header: string | null): number | undefined {
  if (!header) return;
  if (/^\d+$/.test(header)) return Number(header) * 1_000;
  const date = new Date(header);
  if (date.toUTCString() === header)
    return Math.max(0, date.getTime() - Date.now());
}

function responseError(response: Response, value?: unknown) {
  const status = response.status;
  const parsed = ApiErrorSchema.safeParse(value);
  const error = parsed.success ? parsed.data.error : undefined;
  const known =
    error?.code === definitiveWriteCodes[status] &&
    error?.mutationOutcome === "NOT_APPLIED";
  const originFailure =
    status === 403 &&
    known &&
    (error?.message === "An allowed Origin is required" ||
      error?.message === "Origin is not allowed");
  const denial =
    status === 401 || status === 404 || (status === 403 && !originFailure)
      ? status
      : undefined;
  const revisionLimit =
    status === 409 &&
    known &&
    Boolean(
      error?.details?.some(
        ({ path, message }) =>
          path === "revision" &&
          message === "The grade revision limit was reached.",
      ),
    );
  const message = originFailure
    ? error?.message
    : revisionLimit
      ? "The grade revision limit was reached."
      : defaultFailure;
  return new GradingRequestError(
    message,
    status,
    known ? "NOT_APPLIED" : "UNKNOWN",
    denial,
    revisionLimit,
    status === 429
      ? retryAfterMs(response.headers.get("Retry-After"))
      : undefined,
  );
}

async function request<T>(
  { actorId, signal }: Request,
  path: string,
  schema: ZodType<T>,
  body?: SaveSubmissionGradeRequest,
): Promise<T> {
  signal.throwIfAborted();
  const controller = new AbortController();
  const deadline = body ? 10_000 : 4_000;
  const expiresAt = performance.now() + deadline;
  const deadlineError = new GradingRequestError(
    "The request timed out. Please try again.",
  );
  let response: Response | undefined;
  const timeout = setTimeout(() => controller.abort(deadlineError), deadline);
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  const interrupted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => {
        // Known denials take precedence if the error body stalls.
        if (
          response &&
          [401, 403, 404, 429].includes(response.status) &&
          !signal.aborted
        )
          reject(responseError(response));
        else reject(controller.signal.reason);
      },
      { once: true },
    );
  });
  const read = async () => {
    response = await fetch(`${base}/api/v1/${path}`, {
      method: body ? "PUT" : "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        accept: "application/json",
        "X-DebugClinic-Actor": actorId,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    controller.signal.throwIfAborted();
    if (
      response.status !== 200 &&
      (!body || response.status === 401 || response.status === 404)
    )
      throw responseError(response);
    const value: unknown = await response.json().catch(() => null);
    controller.signal.throwIfAborted();
    if (response.status !== 200) throw responseError(response, value);
    const parsed = schema.safeParse(value);
    if (performance.now() >= expiresAt) throw deadlineError;
    if (!parsed.success)
      throw new GradingRequestError(
        "The response could not be loaded. Please try again.",
      );
    return parsed.data;
  };
  try {
    return await Promise.race([read(), interrupted]);
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}

const attemptPath = (role: "instructor" | "learner", id: string) =>
  `${role}/submissions/${encodeURIComponent(id)}`;

export function listInstructorSubmissions(
  access: Request,
  view: InstructorSubmissionView,
  cursor: string | null,
) {
  const query = new URLSearchParams({ view });
  if (cursor) query.set("cursor", cursor);
  return request(
    access,
    `instructor/submissions?${query}`,
    InstructorSubmissionListResponseSchema,
  );
}

export function listLearnerSubmissions(access: Request, cursor: string | null) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return request(
    access,
    `learner/submissions${query}`,
    LearnerSubmissionListResponseSchema,
  );
}

export async function readInstructorSubmission(access: Request, id: string) {
  const { submission } = await request(
    access,
    attemptPath("instructor", id),
    InstructorSubmissionDetailResponseSchema,
  );
  if (submission.attemptId !== id) throw new GradingRequestError();
  return submission;
}

export async function readLearnerSubmission(access: Request, id: string) {
  const { submission } = await request(
    access,
    attemptPath("learner", id),
    LearnerSubmissionDetailResponseSchema,
  );
  if (submission.attemptId !== id) throw new GradingRequestError();
  return submission;
}

export const readInstructorGrade = (access: Request, id: string) =>
  request(
    access,
    `${attemptPath("instructor", id)}/grade`,
    InstructorSubmissionGradeResponseSchema,
  );

export const readLearnerGrade = (access: Request, id: string) =>
  request(
    access,
    `${attemptPath("learner", id)}/grade`,
    LearnerSubmissionGradeResponseSchema,
  );

export async function saveSubmissionGrade(
  access: Request,
  id: string,
  body: SaveSubmissionGradeRequest,
) {
  const result = await request(
    access,
    `${attemptPath("instructor", id)}/grade`,
    SaveSubmissionGradeResponseSchema,
    body,
  );
  const { score, revision } = result.grade;
  const expected = body.expectedRevision;
  if (
    score !== body.score ||
    (expected === null
      ? revision !== 1
      : revision !== expected && revision !== expected + 1)
  )
    throw new GradingRequestError();
  return result;
}
