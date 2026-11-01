import { randomUUID } from "node:crypto";

import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { ZodError, type ZodType } from "zod";

import {
  AiHintRequestSchema,
  ApiErrorSchema,
  CurrentUserResponseSchema,
  HealthResponseSchema,
  ProfileUpdateSchema,
  type CurrentUser,
  type Role,
} from "@debugclinic/contracts";

import {
  createAiProvider,
  validateAiResponse,
  type AiProvider,
} from "./ai/provider.js";
import { createSessionResolver, type SessionResolver } from "./auth/session.js";
import type { DebugClinicAuth } from "./auth/auth.js";
import type { AppConfig } from "./config/env.js";
import { AppError, DependencyUnavailableError } from "./lib/errors.js";
import { createLogger, type AppLogger } from "./lib/logger.js";

export interface DatabaseProbe {
  $queryRawUnsafe<T>(query: string): Promise<T>;
}

export type ProfileUpdater = (
  userId: string,
  name: string,
) => Promise<CurrentUser>;

export interface CreateAppOptions {
  config: AppConfig;
  database: DatabaseProbe;
  auth?: DebugClinicAuth;
  sessionResolver?: SessionResolver;
  aiProvider?: AiProvider;
  profileUpdater: ProfileUpdater;
  logger?: AppLogger;
}

declare global {
  namespace Express {
    interface Locals {
      requestId: string;
      user?: CurrentUser;
    }
  }
}

function asyncHandler(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (request, _response, next) => {
    try {
      request.body = schema.parse(request.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

function requireUser(sessionResolver: SessionResolver): RequestHandler {
  return asyncHandler(async (request, response, next) => {
    const user = await sessionResolver(request);
    if (!user)
      throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue");
    response.locals.user = user;
    next();
  });
}

function requireRole(role: Role): RequestHandler {
  return (_request, response, next) => {
    if (response.locals.user?.role !== role) {
      next(
        new AppError(
          403,
          "FORBIDDEN",
          "You do not have permission to perform this action",
        ),
      );
      return;
    }
    next();
  };
}

function createErrorHandler(logger: AppLogger): ErrorRequestHandler {
  return (error: unknown, _request, response, _next) => {
    const requestId = response.locals.requestId;
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof ZodError) {
      appError = new AppError(
        400,
        "BAD_REQUEST",
        "The request was invalid",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    } else {
      logger.error({ err: error, requestId }, "Unhandled request error");
      appError = new AppError(
        500,
        "INTERNAL_ERROR",
        "The request could not be completed",
      );
    }

    const payload = ApiErrorSchema.parse({
      error: {
        code: appError.code,
        message: appError.message,
        requestId,
        ...(appError.details ? { details: appError.details } : {}),
      },
    });
    response.status(appError.status).json(payload);
  };
}

export function createApp(options: CreateAppOptions) {
  const logger = options.logger ?? createLogger(options.config);
  const sessionResolver =
    options.sessionResolver ??
    (options.auth
      ? createSessionResolver(options.auth)
      : async () => {
          return null;
        });
  const aiProvider = options.aiProvider ?? createAiProvider(options.config);
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use((request, response, next) => {
    const requestId =
      request.header("x-request-id")?.slice(0, 128) || randomUUID();
    response.locals.requestId = requestId;
    response.setHeader("x-request-id", requestId);
    next();
  });
  app.use(
    pinoHttp({
      logger,
      customProps: (_request, response) => ({
        requestId: response.locals.requestId,
      }),
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || options.config.corsOrigins.includes(origin))
          callback(null, true);
        else callback(new AppError(403, "FORBIDDEN", "Origin is not allowed"));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: options.config.nodeEnv === "test" ? 10_000 : 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (_request, _response, next) =>
        next(
          new AppError(
            429,
            "RATE_LIMITED",
            "Too many requests; try again shortly",
          ),
        ),
    }),
  );

  if (options.auth) app.all("/api/auth/*splat", toNodeHandler(options.auth));

  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", (_request, response) => {
    response.json(
      HealthResponseSchema.parse({
        status: "ok",
        service: "debugclinic-api",
        timestamp: new Date().toISOString(),
      }),
    );
  });

  app.get(
    "/api/ready",
    asyncHandler(async (_request, response) => {
      try {
        await options.database.$queryRawUnsafe("SELECT 1");
      } catch {
        throw new DependencyUnavailableError("The database is not ready");
      }
      response.json(
        HealthResponseSchema.parse({
          status: "ready",
          service: "debugclinic-api",
          timestamp: new Date().toISOString(),
        }),
      );
    }),
  );

  app.get("/api/v1/me", requireUser(sessionResolver), (_request, response) => {
    response.json(
      CurrentUserResponseSchema.parse({ user: response.locals.user }),
    );
  });

  app.patch(
    "/api/v1/profile",
    requireUser(sessionResolver),
    validateBody(ProfileUpdateSchema),
    asyncHandler(async (request, response) => {
      const user = response.locals.user;
      if (!user)
        throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue");
      const updated = await options.profileUpdater(
        user.id,
        request.body.name as string,
      );
      response.json(CurrentUserResponseSchema.parse({ user: updated }));
    }),
  );

  app.get(
    "/api/v1/instructor/ping",
    requireUser(sessionResolver),
    requireRole("INSTRUCTOR"),
    (_request, response) => response.json({ ok: true }),
  );

  app.post(
    "/api/v1/ai/hint-preview",
    requireUser(sessionResolver),
    requireRole("LEARNER"),
    validateBody(AiHintRequestSchema),
    asyncHandler(async (request, response) => {
      const user = response.locals.user;
      if (!user)
        throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue");
      try {
        const result = await aiProvider.generateHint(request.body, {
          requestId: response.locals.requestId,
          user,
        });
        response.json(validateAiResponse(result));
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new DependencyUnavailableError(
          "AI coaching is temporarily unavailable",
        );
      }
    }),
  );

  app.use((_request, _response, next) => {
    next(new AppError(404, "NOT_FOUND", "Route not found"));
  });
  app.use(createErrorHandler(logger));

  return app;
}
