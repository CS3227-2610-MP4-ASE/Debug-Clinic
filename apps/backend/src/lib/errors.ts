import type { ApiErrorCodeSchema } from "@debugclinic/contracts";
import type { z } from "zod";

type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: Array<{ path: string; message: string }>,
    public readonly mutationOutcome?: "NOT_APPLIED" | "UNKNOWN",
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class DependencyUnavailableError extends AppError {
  constructor(message = "A required service is temporarily unavailable") {
    super(503, "DEPENDENCY_UNAVAILABLE", message);
  }
}
