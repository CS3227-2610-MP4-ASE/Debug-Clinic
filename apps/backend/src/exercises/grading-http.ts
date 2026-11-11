import {
  Router,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import { rateLimit, type ValueDeterminingMiddleware } from "express-rate-limit";
import { z, type ZodType } from "zod";

import {
  GradingAttemptIdSchema,
  InstructorSubmissionDetailResponseSchema,
  InstructorSubmissionGradeResponseSchema,
  InstructorSubmissionListQuerySchema,
  InstructorSubmissionListResponseSchema,
  LearnerSubmissionDetailResponseSchema,
  LearnerSubmissionGradeResponseSchema,
  LearnerSubmissionListQuerySchema,
  LearnerSubmissionListResponseSchema,
  SaveSubmissionGradeRequestSchema,
  SaveSubmissionGradeResponseSchema,
  type ApiError,
} from "@debugclinic/contracts";

import { AppError, DependencyUnavailableError } from "../lib/errors.js";
import { parseGradingCursor, type Grading } from "./grading.js";

const instructorSubmissions = "/api/v1/instructor/submissions";
const learnerSubmissions = "/api/v1/learner/submissions";
const emptyQuery = z.strictObject({});

export interface GradingRequest {
  route: string;
  mutation: boolean;
  compactRead: boolean;
  compactBudgetStarted?: boolean;
  writeStarted?: boolean;
  failure?: ApiError["error"]["code"];
}

export function gradingRequest(
  path: string,
  method: string,
): GradingRequest | undefined {
  const prefix = /^\/api\/v1\/(instructor|learner)\/submissions(?=\/|$)/i.exec(
    path,
  );
  if (!prefix) return;
  const instructor = prefix[1]?.toLowerCase() === "instructor";
  const base = instructor ? instructorSubmissions : learnerSubmissions;
  const suffix = path.slice(prefix[0].length);
  const isGrade = /^\/[^/]+\/grade\/?$/i.test(suffix);
  let route = "grading";
  if (isGrade) route = base + "/:attemptId/grade";
  else if (/^\/[^/]+\/?$/.test(suffix)) route = base + "/:attemptId";
  else if (suffix === "" || suffix === "/") route = base;
  return {
    route,
    mutation: instructor && isGrade && method === "PUT",
    compactRead: !instructor && isGrade && method === "GET",
  };
}

function attemptId(request: Request): string {
  emptyQuery.parse(request.query);
  return GradingAttemptIdSchema.parse(request.params["attemptId"]);
}

export function sendGradingJson(response: Response, payload: unknown): void {
  // Sending directly bypasses Express's automatic ETag and conditional 304.
  response.type("application/json; charset=utf-8").end(JSON.stringify(payload));
}

function sendValidated<T>(
  response: Response,
  schema: ZodType<T>,
  payload: unknown,
): void {
  const parsed = schema.safeParse(payload);
  if (!parsed.success)
    throw new AppError(
      500,
      "INTERNAL_ERROR",
      "The request could not be completed",
    );
  sendGradingJson(response, parsed.data);
}

const requireActor: RequestHandler = (request, response, next) => {
  const actor = request.header("X-DebugClinic-Actor");
  if (actor !== undefined && actor !== response.locals.user?.id) {
    next(new AppError(403, "FORBIDDEN", "The signed-in account changed"));
    return;
  }
  next();
};

export function rateLimitError(): AppError {
  return new AppError(
    429,
    "RATE_LIMITED",
    "Too many requests; try again shortly",
  );
}

function pollLimit(
  identifier: string,
  limit: number,
  keyGenerator?: ValueDeterminingMiddleware<string>,
) {
  return rateLimit({
    identifier,
    windowMs: 60_000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (_request, _response, next) => next(rateLimitError()),
  });
}

export function createCompactGradeIpLimit() {
  return pollLimit("grading-poll-ip", 600);
}

export function createGradingRouter(
  grading: Grading | undefined,
  instructor: RequestHandler[],
  learner: RequestHandler[],
  requireMutationTransport: RequestHandler,
) {
  const router = Router();
  const learnerBudget = pollLimit(
    "grading-poll-learner",
    120,
    (_request, response) => response.locals.user!.id,
  );
  const service = () => {
    if (!grading)
      throw new DependencyUnavailableError(
        "Submissions are temporarily unavailable",
      );
    return grading;
  };

  router.get(
    instructorSubmissions,
    ...instructor,
    requireActor,
    async (request, response) => {
      const query = InstructorSubmissionListQuerySchema.parse(request.query);
      const cursor = parseGradingCursor(
        query.cursor,
        query.view === "awaiting" ? "instructor-awaiting" : "instructor-graded",
      );
      sendValidated(
        response,
        InstructorSubmissionListResponseSchema,
        await service().listInstructor(
          response.locals.user!.id,
          query.view,
          cursor,
        ),
      );
    },
  );
  router.get(
    instructorSubmissions + "/:attemptId",
    ...instructor,
    requireActor,
    async (request, response) => {
      const id = attemptId(request);
      sendValidated(
        response,
        InstructorSubmissionDetailResponseSchema,
        await service().getInstructorDetail(response.locals.user!.id, id),
      );
    },
  );
  router.get(
    instructorSubmissions + "/:attemptId/grade",
    ...instructor,
    requireActor,
    async (request, response) => {
      const id = attemptId(request);
      sendValidated(
        response,
        InstructorSubmissionGradeResponseSchema,
        await service().getInstructorGrade(response.locals.user!.id, id),
      );
    },
  );
  router.put(
    instructorSubmissions + "/:attemptId/grade",
    ...instructor,
    requireActor,
    requireMutationTransport,
    async (request, response) => {
      const id = attemptId(request);
      const result = SaveSubmissionGradeRequestSchema.safeParse(request.body);
      if (!result.success) {
        if (result.error.issues.some((issue) => issue.path[0] === "score")) {
          throw new AppError(
            400,
            "BAD_REQUEST",
            "Enter a whole number from 1 to 10.",
          );
        }
        throw result.error;
      }
      const submissions = service();
      response.locals.grading!.writeStarted = true;
      sendValidated(
        response,
        SaveSubmissionGradeResponseSchema,
        await submissions.saveInstructorGrade(
          response.locals.user!.id,
          id,
          result.data,
        ),
      );
    },
  );
  router.get(
    learnerSubmissions,
    ...learner,
    requireActor,
    async (request, response) => {
      const query = LearnerSubmissionListQuerySchema.parse(request.query);
      const cursor = parseGradingCursor(query.cursor, "learner-submissions");
      sendValidated(
        response,
        LearnerSubmissionListResponseSchema,
        await service().listLearner(response.locals.user!.id, cursor),
      );
    },
  );
  router.get(
    learnerSubmissions + "/:attemptId",
    ...learner,
    requireActor,
    async (request, response) => {
      const id = attemptId(request);
      sendValidated(
        response,
        LearnerSubmissionDetailResponseSchema,
        await service().getLearnerDetail(response.locals.user!.id, id),
      );
    },
  );
  router.get(
    learnerSubmissions + "/:attemptId/grade",
    ...learner,
    requireActor,
    (request, response, next) => {
      // Validate the path and query before spending the learner's allowance.
      attemptId(request);
      if (response.locals.grading?.compactRead) {
        return learnerBudget(request, response, next);
      } else {
        next();
      }
    },
    async (request, response) => {
      const id = attemptId(request);
      sendValidated(
        response,
        LearnerSubmissionGradeResponseSchema,
        await service().getLearnerGrade(response.locals.user!.id, id),
      );
    },
  );
  return router;
}
