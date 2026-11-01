import { z } from "zod";

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
