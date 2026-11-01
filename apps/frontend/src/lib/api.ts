import {
  ApiErrorSchema,
  CurrentUserResponseSchema,
  type CurrentUser,
} from "@debugclinic/contracts";

const apiBaseUrl = import.meta.env["VITE_API_BASE_URL"] ?? "";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super(message);
  }
}

export async function getCurrentUser(
  signal?: AbortSignal,
): Promise<CurrentUser | null> {
  const response = await fetch(`${apiBaseUrl}/api/v1/me`, {
    credentials: "include",
    headers: { accept: "application/json" },
    ...(signal ? { signal } : {}),
  });
  if (response.status === 401) return null;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = ApiErrorSchema.safeParse(body);
    throw new ApiClientError(
      error.success ? error.data.error.message : "Unable to load your session",
      response.status,
      error.success ? error.data.error.requestId : undefined,
    );
  }
  return CurrentUserResponseSchema.parse(body).user;
}
