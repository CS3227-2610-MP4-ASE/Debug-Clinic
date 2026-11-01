import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import type { AppConfig } from "../config/env.js";
import type { DebugClinicPrisma } from "../db/client.js";
import { createAuthEmailSender, type AuthEmailSender } from "./email.js";

export function createDebugClinicAuth(
  config: AppConfig,
  prisma: DebugClinicPrisma,
  sendEmail: AuthEmailSender = createAuthEmailSender(config),
) {
  const emailEnabled = Boolean(config.resendApiKey && config.emailFrom);
  const google =
    config.googleClientId && config.googleClientSecret
      ? {
          clientId: config.googleClientId,
          clientSecret: config.googleClientSecret,
        }
      : undefined;

  return betterAuth({
    appName: "DebugClinic",
    baseURL: config.betterAuthUrl,
    basePath: "/api/auth",
    secret: config.betterAuthSecret,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      requireEmailVerification: emailEnabled,
      ...(emailEnabled
        ? {
            sendResetPassword: async ({
              user,
              url,
            }: {
              user: { email: string };
              url: string;
            }) => {
              await sendEmail({
                to: user.email,
                subject: "Reset your DebugClinic password",
                text: `Reset your password using this link: ${url}\nIf you did not request this, ignore this email.`,
              });
            },
          }
        : {}),
    },
    ...(emailEnabled
      ? {
          emailVerification: {
            sendOnSignUp: true,
            sendOnSignIn: true,
            sendVerificationEmail: async ({
              user,
              url,
            }: {
              user: { email: string };
              url: string;
            }) => {
              await sendEmail({
                to: user.email,
                subject: "Verify your DebugClinic email",
                text: `Verify your email using this link: ${url}`,
              });
            },
          },
        }
      : {}),
    ...(google ? { socialProviders: { google } } : {}),
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    trustedOrigins: [...new Set([config.appOrigin, ...config.corsOrigins])],
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "LEARNER",
          input: false,
        },
      },
    },
    advanced: {
      useSecureCookies: config.nodeEnv === "production",
      defaultCookieAttributes: {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "lax",
      },
      database: { joins: true },
    },
  });
}

export type DebugClinicAuth = ReturnType<typeof createDebugClinicAuth>;
