import pino from "pino";

import type { AppConfig } from "../config/env.js";

const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers.set-cookie",
  "password",
  "token",
  "apiKey",
  "clientSecret",
  "proposedCode",
  "reasoning",
];

export function createLogger(config: AppConfig) {
  return pino({
    level: config.logLevel,
    redact: { paths: redactPaths, censor: "[REDACTED]" },
    base: { service: "debugclinic-api", environment: config.nodeEnv },
  });
}

export type AppLogger = ReturnType<typeof createLogger>;
