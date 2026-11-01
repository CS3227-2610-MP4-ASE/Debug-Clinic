import { z } from "zod";
import { DEV_ORIGIN, isDevelopmentOrigin } from "./deployment.js";

const optionalString = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    APP_ORIGIN: z.string().url(),
    CORS_ORIGINS: z.string().min(1),
    DATABASE_URL: z.string().url(),
    DATABASE_URL_POOLED: optionalString.pipe(z.string().url().optional()),
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    OAUTH_PROXY_URL: optionalString.pipe(z.literal(DEV_ORIGIN).optional()),
    OAUTH_PROXY_SECRET: optionalString.pipe(z.string().min(32).optional()),
    SMTP_HOST: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(1).default("smtp.gmail.com"),
    ),
    SMTP_PORT: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().int().min(1).max(65_535).default(465),
    ),
    SMTP_SECURE: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum(["true", "false"]).default("true"),
    ),
    SMTP_USER: optionalString.pipe(z.string().email().optional()),
    SMTP_PASSWORD: optionalString,
    EMAIL_FROM: optionalString.pipe(z.string().email().optional()),
    AI_PROVIDER: z.enum(["fake", "soc"]).default("fake"),
    SOC_LLM_ENDPOINT: optionalString.pipe(z.string().url().optional()),
    SOC_LLM_MODEL: optionalString,
    SOC_LLM_API_KEY: optionalString,
    AI_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(10_000),
    AI_MAX_RETRIES: z.coerce.number().int().min(0).max(3).default(2),
    LOG_LEVEL: z
      .enum(["silent", "fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
  })
  .superRefine((value, context) => {
    if (Boolean(value.OAUTH_PROXY_URL) !== Boolean(value.OAUTH_PROXY_SECRET)) {
      context.addIssue({
        code: "custom",
        path: ["OAUTH_PROXY_URL"],
        message:
          "OAUTH_PROXY_URL and OAUTH_PROXY_SECRET must be configured together",
      });
    }
    if (
      value.OAUTH_PROXY_URL &&
      (!isDevelopmentOrigin(value.APP_ORIGIN) ||
        value.BETTER_AUTH_URL !== value.APP_ORIGIN)
    ) {
      context.addIssue({
        code: "custom",
        path: ["OAUTH_PROXY_URL"],
        message:
          "OAuth proxy is limited to the stable development site and its own PR previews with matching auth origins",
      });
    }
    if (
      value.APP_ORIGIN.startsWith("https://deploy-preview-") &&
      value.GOOGLE_CLIENT_ID &&
      !value.OAUTH_PROXY_URL
    ) {
      context.addIssue({
        code: "custom",
        path: ["OAUTH_PROXY_URL"],
        message:
          "Google login on a PR preview requires the development OAuth proxy",
      });
    }
    if (
      (value.NODE_ENV === "production" ||
        value.SMTP_USER ||
        value.SMTP_PASSWORD ||
        value.EMAIL_FROM) &&
      !(value.SMTP_USER && value.SMTP_PASSWORD)
    ) {
      context.addIssue({
        code: "custom",
        path: ["SMTP_USER"],
        message:
          "SMTP_USER and SMTP_PASSWORD must be configured together and are required in production",
      });
    }
    if (
      value.SMTP_HOST === "smtp.gmail.com" &&
      value.EMAIL_FROM &&
      value.SMTP_USER &&
      value.EMAIL_FROM.toLowerCase() !== value.SMTP_USER.toLowerCase()
    ) {
      context.addIssue({
        code: "custom",
        path: ["EMAIL_FROM"],
        message: "For Gmail SMTP, EMAIL_FROM must match SMTP_USER",
      });
    }
    if (
      (value.SMTP_PORT === 465 && value.SMTP_SECURE !== "true") ||
      (value.SMTP_PORT === 587 && value.SMTP_SECURE !== "false")
    ) {
      context.addIssue({
        code: "custom",
        path: ["SMTP_SECURE"],
        message:
          "Use SMTP_SECURE=true for port 465, or false for STARTTLS on port 587",
      });
    }
    if (
      value.SOC_LLM_ENDPOINT &&
      new URL(value.SOC_LLM_ENDPOINT).protocol !== "https:"
    ) {
      context.addIssue({
        code: "custom",
        path: ["SOC_LLM_ENDPOINT"],
        message: "SoC credentials require an HTTPS endpoint",
      });
    }
    if (
      Boolean(value.GOOGLE_CLIENT_ID) !== Boolean(value.GOOGLE_CLIENT_SECRET)
    ) {
      context.addIssue({
        code: "custom",
        path: ["GOOGLE_CLIENT_ID"],
        message:
          "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together",
      });
    }

    if (
      value.AI_PROVIDER === "soc" &&
      (!value.SOC_LLM_ENDPOINT ||
        !value.SOC_LLM_MODEL ||
        !value.SOC_LLM_API_KEY)
    ) {
      context.addIssue({
        code: "custom",
        path: ["AI_PROVIDER"],
        message: "SoC LLM configuration is incomplete",
      });
    }
  });

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  appOrigin: string;
  corsOrigins: string[];
  databaseUrl: string;
  runtimeDatabaseUrl: string;
  betterAuthUrl: string;
  betterAuthSecret: string;
  googleClientId?: string;
  googleClientSecret?: string;
  oauthProxy?: { url: string; secret: string };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
  };
  emailFrom?: string;
  aiProvider: "fake" | "soc";
  socLlmEndpoint?: string;
  socLlmModel?: string;
  socLlmApiKey?: string;
  aiTimeoutMs: number;
  aiMaxRetries: number;
  logLevel: "silent" | "fatal" | "error" | "warn" | "info" | "debug" | "trace";
}

export function readEnv(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(source);
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    appOrigin: parsed.APP_ORIGIN,
    corsOrigins: parsed.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    databaseUrl: parsed.DATABASE_URL,
    runtimeDatabaseUrl: parsed.DATABASE_URL_POOLED ?? parsed.DATABASE_URL,
    betterAuthUrl: parsed.BETTER_AUTH_URL,
    betterAuthSecret: parsed.BETTER_AUTH_SECRET,
    ...(parsed.GOOGLE_CLIENT_ID
      ? { googleClientId: parsed.GOOGLE_CLIENT_ID }
      : {}),
    ...(parsed.GOOGLE_CLIENT_SECRET
      ? { googleClientSecret: parsed.GOOGLE_CLIENT_SECRET }
      : {}),
    ...(parsed.OAUTH_PROXY_URL && parsed.OAUTH_PROXY_SECRET
      ? {
          oauthProxy: {
            url: parsed.OAUTH_PROXY_URL,
            secret: parsed.OAUTH_PROXY_SECRET,
          },
        }
      : {}),
    ...(parsed.SMTP_USER && parsed.SMTP_PASSWORD
      ? {
          smtp: {
            host: parsed.SMTP_HOST,
            port: parsed.SMTP_PORT,
            secure: parsed.SMTP_SECURE === "true",
            user: parsed.SMTP_USER,
            password: parsed.SMTP_PASSWORD,
          },
          emailFrom: parsed.EMAIL_FROM ?? parsed.SMTP_USER,
        }
      : {}),
    aiProvider: parsed.AI_PROVIDER,
    ...(parsed.SOC_LLM_ENDPOINT
      ? { socLlmEndpoint: parsed.SOC_LLM_ENDPOINT }
      : {}),
    ...(parsed.SOC_LLM_MODEL ? { socLlmModel: parsed.SOC_LLM_MODEL } : {}),
    ...(parsed.SOC_LLM_API_KEY ? { socLlmApiKey: parsed.SOC_LLM_API_KEY } : {}),
    aiTimeoutMs: parsed.AI_TIMEOUT_MS,
    aiMaxRetries: parsed.AI_MAX_RETRIES,
    logLevel: parsed.LOG_LEVEL,
  };
}
