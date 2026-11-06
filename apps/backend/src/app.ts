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
  DraftIdSchema,
  DraftListQuerySchema,
  DraftListResponseSchema,
  GenerateQuestionRequestSchema,
  GenerateQuestionResponseSchema,
  SaveDraftRequestSchema,
  SavedDraftResponseSchema,
  OwnerQuestionListQuerySchema,
  OwnerQuestionListResponseSchema,
  OwnerQuestionResponseSchema,
  SaveQuestionChangesRequestSchema,
  PublishQuestionRequestSchema,
  PublishQuestionResponseSchema,
  RemoveQuestionRequestSchema,
  PublishedQuestionListQuerySchema,
  PublishedQuestionListResponseSchema,
  PublishedQuestionResponseSchema,
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
import { classifyDatabaseFailure } from "./db/diagnostics.js";
import type { InstructorDrafts } from "./exercises/instructor-drafts.js";
import type { InstructorQuestions } from "./exercises/instructor-questions.js";
import { AppError, DependencyUnavailableError } from "./lib/errors.js";
import {
  createLogger,
  sanitizeRequestUrl,
  type AppLogger,
} from "./lib/logger.js";

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
  instructorDrafts?: InstructorDrafts;
  instructorQuestions?: InstructorQuestions;
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
  return (error: unknown, request, response, _next) => {
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
          message:
            issue.code === "unrecognized_keys"
              ? "Unexpected fields are not allowed"
              : issue.message,
        })),
      );
    } else if (
      error instanceof Error &&
      "type" in error &&
      "status" in error &&
      error.type === "entity.parse.failed" &&
      error.status === 400
    ) {
      appError = new AppError(
        400,
        "BAD_REQUEST",
        "The request body must be valid JSON",
      );
    } else if (
      error instanceof Error &&
      "type" in error &&
      "status" in error &&
      error.type === "entity.too.large" &&
      error.status === 413
    ) {
      appError = new AppError(
        413,
        "BAD_REQUEST",
        "The request body exceeds the 64kb limit",
      );
    } else {
      logger.error(
        { category: "UNHANDLED_REQUEST_ERROR", requestId },
        "Unhandled request error",
      );
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
        ...((request.method === "POST" || request.method === "PATCH") &&
        request.path.startsWith("/api/v1/instructor/questions")
          ? {
              mutationOutcome:
                appError.mutationOutcome ??
                (appError.status < 500 ||
                error instanceof DependencyUnavailableError
                  ? "NOT_APPLIED"
                  : "UNKNOWN"),
            }
          : {}),
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
      serializers: {
        // pino-http synthesizes an Error for 5xx responses. Never serialize its
        // stack, cause or arbitrary metadata; status and requestId are separate.
        err: () => ({ category: "HTTP_RESPONSE_ERROR" }),
        req: (request) => ({
          id: request.id,
          method: request.method,
          url: sanitizeRequestUrl(request.url),
          remoteAddress: request.remoteAddress,
          remotePort: request.remotePort,
        }),
      },
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
      } catch (error) {
        logger.warn(
          {
            category: "database_readiness_failure",
            reason: classifyDatabaseFailure(error),
            requestId: response.locals.requestId,
          },
          "Database readiness query failed",
        );
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

  const instructor = [requireUser(sessionResolver), requireRole("INSTRUCTOR")];
  const requireDraftMutation: RequestHandler = (request, _response, next) => {
    const origin = request.header("origin");
    if (!origin || !options.config.corsOrigins.includes(origin)) {
      next(new AppError(403, "FORBIDDEN", "An allowed Origin is required"));
    } else if (!request.is("application/json")) {
      next(
        new AppError(
          400,
          "BAD_REQUEST",
          "The request body must use application/json",
        ),
      );
    } else {
      next();
    }
  };
  const drafts = (): InstructorDrafts => {
    if (!options.instructorDrafts)
      throw new DependencyUnavailableError(
        "Instructor drafts are temporarily unavailable",
      );
    return options.instructorDrafts;
  };
  app.post(
    "/api/v1/instructor/questions/generate",
    ...instructor,
    requireDraftMutation,
    validateBody(GenerateQuestionRequestSchema),
    asyncHandler(async (request, response) => {
      const result = await drafts().generate(
        response.locals.user!.id,
        request.body.topic as string,
      );
      response.json(GenerateQuestionResponseSchema.parse(result));
    }),
  );
  app.post(
    "/api/v1/instructor/drafts",
    ...instructor,
    requireDraftMutation,
    validateBody(SaveDraftRequestSchema),
    asyncHandler(async (request, response) => {
      const result = await drafts().save(
        response.locals.user!.id,
        SaveDraftRequestSchema.parse(request.body),
      );
      response.status(201).json(SavedDraftResponseSchema.parse(result));
    }),
  );
  app.get(
    "/api/v1/instructor/drafts",
    ...instructor,
    asyncHandler(async (request, response) => {
      const { offset } = DraftListQuerySchema.parse(request.query);
      response.json(
        DraftListResponseSchema.parse(
          await drafts().list(response.locals.user!.id, offset),
        ),
      );
    }),
  );
  app.get(
    "/api/v1/instructor/drafts/:id",
    ...instructor,
    asyncHandler(async (request, response) => {
      const id = DraftIdSchema.parse(request.params["id"]);
      response.json(
        SavedDraftResponseSchema.parse(
          await drafts().get(response.locals.user!.id, id),
        ),
      );
    }),
  );

  const questions = (): InstructorQuestions => {
    if (!options.instructorQuestions)
      throw new DependencyUnavailableError(
        "Questions are temporarily unavailable",
      );
    return options.instructorQuestions;
  };
  app.get(
    "/api/v1/instructor/questions",
    ...instructor,
    asyncHandler(async (request, response) => {
      const query = OwnerQuestionListQuerySchema.parse(request.query);
      response.json(
        OwnerQuestionListResponseSchema.parse(
          await questions().listOwner(response.locals.user!.id, query),
        ),
      );
    }),
  );
  app.post(
    "/api/v1/instructor/questions/publish",
    ...instructor,
    requireDraftMutation,
    validateBody(PublishQuestionRequestSchema),
    asyncHandler(async (request, response) => {
      response.json(
        PublishQuestionResponseSchema.parse(
          await questions().publish(response.locals.user!.id, request.body),
        ),
      );
    }),
  );
  app.get(
    "/api/v1/instructor/questions/:id",
    ...instructor,
    asyncHandler(async (request, response) => {
      response.json(
        OwnerQuestionResponseSchema.parse(
          await questions().getOwner(
            response.locals.user!.id,
            DraftIdSchema.parse(request.params["id"]),
          ),
        ),
      );
    }),
  );
  app.patch(
    "/api/v1/instructor/questions/:id",
    ...instructor,
    requireDraftMutation,
    validateBody(SaveQuestionChangesRequestSchema),
    asyncHandler(async (request, response) => {
      response.json(
        OwnerQuestionResponseSchema.parse(
          await questions().saveChanges(
            response.locals.user!.id,
            DraftIdSchema.parse(request.params["id"]),
            request.body,
          ),
        ),
      );
    }),
  );
  app.post(
    "/api/v1/instructor/questions/:id/remove",
    ...instructor,
    requireDraftMutation,
    validateBody(RemoveQuestionRequestSchema),
    asyncHandler(async (request, response) => {
      response.json(
        OwnerQuestionResponseSchema.parse(
          await questions().remove(
            response.locals.user!.id,
            DraftIdSchema.parse(request.params["id"]),
            request.body,
          ),
        ),
      );
    }),
  );
  const learner = [requireUser(sessionResolver), requireRole("LEARNER")];
  app.get(
    "/api/v1/learner/questions",
    ...learner,
    asyncHandler(async (request, response) => {
      response.json(
        PublishedQuestionListResponseSchema.parse(
          await questions().listPublished(
            PublishedQuestionListQuerySchema.parse(request.query),
          ),
        ),
      );
    }),
  );
  app.get(
    "/api/v1/learner/questions/:id",
    ...learner,
    asyncHandler(async (request, response) => {
      response.json(
        PublishedQuestionResponseSchema.parse(
          await questions().getPublished(
            DraftIdSchema.parse(request.params["id"]),
          ),
        ),
      );
    }),
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
