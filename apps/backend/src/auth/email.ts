import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import type { AppConfig } from "../config/env.js";
import { DependencyUnavailableError } from "../lib/errors.js";

export interface AuthEmail {
  to: string;
  subject: string;
  text: string;
}

export type AuthEmailSender = (email: AuthEmail) => Promise<void>;

interface MailTransport {
  sendMail(
    message: AuthEmail & { from: string },
  ): Promise<{ accepted?: unknown[]; rejected?: unknown[] }>;
}
export type MailTransportFactory = (
  options: SMTPTransport.Options,
) => MailTransport;

export function smtpTransportOptions(config: AppConfig): SMTPTransport.Options {
  if (!config.smtp)
    throw new DependencyUnavailableError("Email delivery is not configured");
  return {
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    requireTLS: !config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.password },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
    dnsTimeout: 10_000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

export function createAuthEmailSender(
  config: AppConfig,
  createTransport: MailTransportFactory = (options) =>
    nodemailer.createTransport(options),
): AuthEmailSender {
  const transport =
    config.smtp && config.emailFrom
      ? createTransport(smtpTransportOptions(config))
      : undefined;
  return async (email) => {
    if (!transport || !config.emailFrom) {
      throw new DependencyUnavailableError("Email delivery is not configured");
    }
    try {
      const result = await transport.sendMail({
        ...email,
        from: config.emailFrom,
      });
      if (!result.accepted?.length || result.rejected?.length)
        throw new Error("recipient rejected");
    } catch {
      throw new DependencyUnavailableError(
        "Email delivery is temporarily unavailable",
      );
    }
  };
}
