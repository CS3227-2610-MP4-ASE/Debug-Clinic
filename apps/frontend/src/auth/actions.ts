import type { CurrentUser, Role } from "@debugclinic/contracts";
import { safeAuthMessage } from "./feedback-policy.js";

export const verificationAccepted =
  "Request accepted. If verification is needed, check your email. If no message arrives, try again.";
export const recoveryAccepted =
  "Request accepted. If recovery is available, check your email. If no message arrives, try again.";
export class AuthActionError extends Error {
  constructor(public readonly code: unknown) {
    super("Authentication request failed");
  }
}
export async function authRequest(
  path: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const base = import.meta.env["VITE_API_BASE_URL"] || "";
  const response = await fetch(`${base}/api/auth${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new AuthActionError(
      result && typeof result === "object" && "code" in result
        ? result.code
        : undefined,
    );
  return result && typeof result === "object"
    ? (result as Record<string, unknown>)
    : {};
}
export function failureMessage(error: unknown, fallback: string): string {
  return safeAuthMessage(
    error instanceof AuthActionError ? error.code : undefined,
    fallback,
  );
}
export function workspace(user: CurrentUser, requested?: unknown): string {
  const route = user.role === "INSTRUCTOR" ? "/instructor" : "/learner";
  return typeof requested === "string" && requested === route
    ? requested
    : route;
}
export async function startGoogle(
  role?: Role,
  returnTo?: unknown,
): Promise<void> {
  const result = await authRequest("/sign-in/social", {
    provider: "google",
    requestSignUp: role !== undefined,
    ...(role ? { additionalData: { registrationRole: role } } : {}),
    ...(returnTo === "/learner" || returnTo === "/instructor"
      ? { returnTo }
      : {}),
  });
  if (typeof result["url"] !== "string") throw new AuthActionError(undefined);
  const destination = new URL(result["url"]);
  if (
    destination.protocol !== "https:" ||
    destination.hostname !== "accounts.google.com"
  )
    throw new AuthActionError(undefined);
  window.location.assign(destination.href);
}
