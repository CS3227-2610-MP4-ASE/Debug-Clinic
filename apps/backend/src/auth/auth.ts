import { betterAuth, type Auth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { oAuthProxy } from "better-auth/plugins";
import {
  APIError,
  addOAuthServerContext,
  createAuthMiddleware,
  getOAuthState,
} from "better-auth/api";
import { RoleSchema } from "@debugclinic/contracts";

import type { AppConfig } from "../config/env.js";
import { DEV_PREVIEW_ORIGIN_PATTERN } from "../config/deployment.js";
import type { DebugClinicPrisma } from "../db/client.js";
import { createAuthEmailSender, type AuthEmailSender } from "./email.js";
import { createLogger } from "../lib/logger.js";
import {
  createIntentStore,
  INTENT_SECONDS,
  normalizeEmail,
  pendingIntent,
  registrationRole,
} from "./policy.js";

type DebugClinicAuthOptions = BetterAuthOptions & {
  plugins: ReturnType<typeof oAuthProxy>[];
  user: {
    additionalFields: {
      role: {
        type: "string";
        required: false;
        input: false;
      };
    };
  };
};

export type DebugClinicAuth = Auth<DebugClinicAuthOptions>;

export function createDebugClinicAuth(
  config: AppConfig,
  prisma: DebugClinicPrisma,
  sendEmail: AuthEmailSender = createAuthEmailSender(config),
): DebugClinicAuth {
  const emailEnabled = Boolean(config.smtp && config.emailFrom);
  const logger = createLogger(config);
  const intents = createIntentStore(
    prisma,
    config.appOrigin,
    config.betterAuthUrl,
  );
  const deliver: AuthEmailSender = async (message) => {
    try {
      await sendEmail(message);
    } catch {
      logger.warn(
        { category: "auth_email_delivery_failed" },
        "Authentication delivery attempt failed",
      );
    }
  };
  const google =
    config.googleClientId && config.googleClientSecret
      ? {
          clientId: config.googleClientId,
          clientSecret: config.googleClientSecret,
          disableImplicitSignUp: true,
          mapProfileToUser: (profile: { email: string }) => ({
            email: normalizeEmail(profile.email),
          }),
        }
      : undefined;

  return betterAuth<DebugClinicAuthOptions>({
    appName: "DebugClinic",
    baseURL: config.betterAuthUrl,
    basePath: "/api/auth",
    secret: config.betterAuthSecret,
    database: prismaAdapter(prisma, {
      provider: "postgresql",
      transaction: true,
    }),
    logger: {
      level: "error",
      log: () => {
        logger.warn(
          { category: "auth_library_failure" },
          "Authentication operation failed",
        );
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: false,
        requireLocalEmailVerified: true,
        allowDifferentEmails: false,
        updateUserInfoOnLink: false,
        trustedProviders: [],
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const body: Record<string, unknown> = ctx.body ?? {};
        if (["/link-social", "/unlink-account"].includes(ctx.path)) {
          throw new APIError("FORBIDDEN", {
            code: "METHOD_NOT_ALLOWED",
            message: "Use verified sign-in or password recovery.",
          });
        }
        if (
          ctx.path === "/update-user" &&
          ("role" in body || "registrationRole" in body)
        ) {
          throw new APIError("FORBIDDEN", {
            code: "ROLE_IMMUTABLE",
            message: "Your role cannot be changed.",
          });
        }
        if (
          [
            "/sign-up/email",
            "/sign-in/email",
            "/send-verification-email",
            "/request-password-reset",
          ].includes(ctx.path)
        ) {
          if (typeof body["email"] === "string")
            body["email"] = normalizeEmail(body["email"]);
        }
        if (
          ["/send-verification-email", "/request-password-reset"].includes(
            ctx.path,
          ) &&
          !emailEnabled
        ) {
          throw new APIError("SERVICE_UNAVAILABLE", {
            code: "EMAIL_UNAVAILABLE",
            message: "Email service is unavailable. Try again later.",
          });
        }
        if (["/sign-up/email", "/send-verification-email"].includes(ctx.path))
          body["callbackURL"] = `${config.appOrigin}/verification/result`;
        if (ctx.path === "/request-password-reset")
          body["redirectTo"] = `${config.appOrigin}/reset-password`;
        if (ctx.path === "/sign-up/email") {
          const parsed = RoleSchema.safeParse(body["registrationRole"]);
          if (!parsed.success || "role" in body)
            throw new APIError("BAD_REQUEST", {
              code: "REGISTRATION_ROLE_REQUIRED",
              message: "Choose Learner or Instructor.",
            });
          if (
            typeof body["name"] !== "string" ||
            !body["name"].trim() ||
            body["name"].trim().length > 100
          )
            throw new APIError("BAD_REQUEST", {
              code: "INVALID_NAME",
              message: "Enter a name up to 100 characters.",
            });
          body["name"] = body["name"].trim();
          await registrationRole.set(parsed.data);
        }
        if (ctx.path === "/sign-in/social") {
          if (
            ctx.headers?.get("origin") !== config.appOrigin ||
            body["provider"] !== "google" ||
            "idToken" in body
          )
            throw new APIError("FORBIDDEN", {
              code: "GOOGLE_FLOW_INVALID",
              message: "Restart Google sign-in from this application.",
            });
          const registering = body["requestSignUp"] === true;
          const additional = body["additionalData"];
          const parsed = RoleSchema.safeParse(
            additional && typeof additional === "object"
              ? (additional as Record<string, unknown>)["registrationRole"]
              : undefined,
          );
          if (
            (registering && !parsed.success) ||
            (!registering && body["requestSignUp"] !== false)
          )
            throw new APIError("BAD_REQUEST", {
              code: "REGISTRATION_ROLE_REQUIRED",
              message: "Choose a registration role or use sign-in.",
            });
          const returnTo = body["returnTo"];
          const id = await intents.start({
            mode: registering ? "register" : "sign-in",
            ...(registering && parsed.success ? { role: parsed.data } : {}),
            ...(returnTo === "/learner" || returnTo === "/instructor"
              ? { returnTo }
              : {}),
          });
          await pendingIntent.set(id);
          await addOAuthServerContext({ debugClinicIntentId: id });
          body["callbackURL"] =
            `${config.appOrigin}/auth/complete${returnTo === "/learner" || returnTo === "/instructor" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
          body["errorCallbackURL"] = `${config.appOrigin}/auth/error`;
          body["newUserCallbackURL"] = body["callbackURL"];
        }
        return { context: { body } };
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (
          ctx.path === "/sign-in/social" &&
          !(ctx.context.returned instanceof APIError)
        ) {
          const id = await pendingIntent.get();
          if (id) {
            // Dispatch replaces before-hook response headers with endpoint headers.
            // Emit the browser binding after endpoint completion so it survives.
            const cookie = ctx.context.createAuthCookie("debugclinic_intent", {
              maxAge: INTENT_SECONDS,
            });
            await ctx.setSignedCookie(
              cookie.name,
              id,
              ctx.context.secret,
              cookie.attributes,
            );
          }
        }
        if (ctx.path === "/send-verification-email") {
          const returned: unknown = ctx.context.returned;
          if (
            !(returned instanceof APIError) ||
            ["EMAIL_ALREADY_VERIFIED", "EMAIL_MISMATCH"].includes(
              String(returned.body?.code),
            )
          )
            return Response.json({ status: true }, { status: 200 });
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const role = await registrationRole.get();
            if (!role)
              throw new APIError("FORBIDDEN", {
                code: "REGISTRATION_ROLE_REQUIRED",
                message: "Restart registration and choose a role.",
              });
            return {
              data: { ...user, email: normalizeEmail(user.email), role },
            };
          },
        },
        update: {
          before: async (user) => {
            if ("role" in user)
              throw new APIError("FORBIDDEN", {
                code: "ROLE_IMMUTABLE",
                message: "Your role cannot be changed.",
              });
            return {
              data: {
                ...user,
                ...(typeof user.email === "string"
                  ? { email: normalizeEmail(user.email) }
                  : {}),
              },
            };
          },
        },
      },
    },
    plugins: config.oauthProxy
      ? [
          oAuthProxy({
            productionURL: config.oauthProxy.url,
            currentURL: config.betterAuthUrl,
            secret: config.oauthProxy.secret,
            maxAge: 60,
          }),
        ]
      : [],
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
              await deliver({
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
            autoSignInAfterVerification: false,
            sendVerificationEmail: async ({
              user,
              url,
            }: {
              user: { email: string };
              url: string;
            }) => {
              await deliver({
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
    trustedOrigins: [
      ...new Set([
        config.appOrigin,
        ...config.corsOrigins,
        ...(config.oauthProxy
          ? [config.oauthProxy.url, DEV_PREVIEW_ORIGIN_PATTERN]
          : []),
      ]),
    ],
    user: {
      validateUserInfo: async ({ user, source }, ctx) => {
        if (source.method !== "oauth") return;
        if (
          source.oauth?.providerId !== "google" ||
          user.emailVerified !== true ||
          source.oauth.profile?.["email_verified"] !== true
        )
          return { error: "google_ownership_required" };
        const state = await getOAuthState();
        const id = state?.serverContext?.["debugClinicIntentId"];
        if (typeof id !== "string") return { error: "google_intent_invalid" };
        const cookie = ctx.context.createAuthCookie("debugclinic_intent", {
          maxAge: INTENT_SECONDS,
        });
        const signed = await ctx.getSignedCookie(
          cookie.name,
          ctx.context.secret,
        );
        const intent = await intents.claim(
          id,
          typeof signed === "string" ? signed : null,
        );
        if (
          !intent ||
          (source.action === "create-user" &&
            (intent.mode !== "register" || !intent.role))
        )
          return { error: "google_intent_invalid" };
        ctx.setCookie(cookie.name, "", { ...cookie.attributes, maxAge: 0 });
        if (source.action === "create-user" && intent.role)
          await registrationRole.set(intent.role);
      },
      additionalFields: {
        role: {
          type: "string",
          required: false,
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
