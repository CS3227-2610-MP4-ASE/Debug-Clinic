import pino, { type DestinationStream } from "pino";

import type { AppConfig } from "../config/env.js";

const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers.set-cookie",
  "res.headers.location",
  "password",
  "token",
  "apiKey",
  "clientSecret",
  "proposedCode",
  "reasoning",
];

/** Log routing information, never callback credentials or nested query URLs. */
export function sanitizeRequestUrl(rawUrl: string | undefined): string {
  if (!rawUrl?.startsWith("/")) return "[REDACTED_URL]";
  const path = rawUrl.split(/[?#]/, 1)[0]!;
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    return "[REDACTED_URL]";
  }
  const safePath = decodedPath.replace(
    /(\/reset-password\/).*/i,
    "$1[REDACTED]",
  );
  return `${safePath}${rawUrl.includes("?") ? "?[REDACTED]" : ""}`;
}

export function createLogger(
  config: AppConfig,
  destination?: DestinationStream,
) {
  return pino(
    {
      level: config.logLevel,
      redact: { paths: redactPaths, censor: "[REDACTED]" },
      base: { service: "debugclinic-api", environment: config.nodeEnv },
    },
    destination,
  );
}

export type AppLogger = ReturnType<typeof createLogger>;
