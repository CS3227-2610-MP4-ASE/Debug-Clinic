import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import type { AppConfig } from "../config/env.js";
import type { DebugClinicPrisma } from "../db/client.js";

export function createDebugClinicAuth(
  config: AppConfig,
  prisma: DebugClinicPrisma,
) {
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
    },
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
