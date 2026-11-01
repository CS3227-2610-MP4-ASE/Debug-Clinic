import type { AppConfig } from "../config/env.js";
import { DependencyUnavailableError } from "../lib/errors.js";

export interface AuthEmail {
  to: string;
  subject: string;
  text: string;
}

export type AuthEmailSender = (email: AuthEmail) => Promise<void>;

export function createAuthEmailSender(
  config: AppConfig,
  transport: typeof fetch = fetch,
): AuthEmailSender {
  return async (email) => {
    if (!config.resendApiKey || !config.emailFrom) {
      throw new DependencyUnavailableError("Email delivery is not configured");
    }
    try {
      const response = await transport("https://api.resend.com/emails", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.emailFrom,
          to: [email.to],
          subject: email.subject,
          text: email.text,
        }),
      });
      if (!response.ok) throw new Error("delivery failed");
      await response.body?.cancel();
    } catch {
      throw new DependencyUnavailableError(
        "Email delivery is temporarily unavailable",
      );
    }
  };
}
