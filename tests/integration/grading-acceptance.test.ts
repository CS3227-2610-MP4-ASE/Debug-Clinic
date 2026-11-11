import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { Server } from "node:http";
import { setTimeout } from "node:timers/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../generated/prisma/client.js";
import { createApp } from "../../apps/backend/src/app.js";
import { createDebugClinicAuth } from "../../apps/backend/src/auth/auth.js";
import { readEnv } from "../../apps/backend/src/config/env.js";
import { createGrading } from "../../apps/backend/src/exercises/grading.js";
import { createInstructorQuestions } from "../../apps/backend/src/exercises/instructor-questions.js";
import { createLearnerAttempts } from "../../apps/backend/src/exercises/learner-attempts.js";
import { createLogger } from "../../apps/backend/src/lib/logger.js";
import { cookies, post } from "../support/auth-fixture.js";
import { testDatabaseUrl } from "../support/database-target.js";
import { f01Saved, f01Topic } from "../support/f01-fixtures.js";

const url = testDatabaseUrl();
if (
  process.env["DATABASE_URL"] !== url ||
  process.env["DATABASE_URL_POOLED"] !== url
)
  throw new Error("Explicit matching synthetic database targets required");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const origin = "http://127.0.0.1:5173";
const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: origin,
  CORS_ORIGINS: origin,
  DATABASE_URL: url,
  DATABASE_URL_POOLED: url,
  BETTER_AUTH_URL: origin,
  BETTER_AUTH_SECRET: "grading-acceptance-synthetic-secret-at-least-32",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "silent",
});
const auth = createDebugClinicAuth(config, prisma, async () => {});
const logs: string[] = [];
const logger = createLogger(
  { ...config, logLevel: "info" },
  {
    write(chunk) {
      logs.push(chunk);
    },
  },
);
const instructorList = "/api/v1/instructor/submissions";
const learnerList = "/api/v1/learner/submissions";
const question = {
  title: "Count every item",
  problemStatement: "Fix the function to count every item.",
  expectedBehavior: "count([2, 4]) returns 2.",
};
const code = "def count(items):\n    return len(items)\n";
const reasoning =
  "Use the collection length.\n\n<grade-sentinel>Zero for empty.</grade-sentinel>\n";
const submittedAt = "2026-10-21T03:44:12.031Z";
const legacyComment = "GRD_PRIVATE_LEGACY_REVIEW";
const privateSolution = "GRD_PRIVATE_REFERENCE_SOLUTION";
const ownedUsers: string[] = [];
type Identity = { id: string; name: string; email: string; cookie: string };
type Grade = { score: number; revision: number; savedAt: string };
type Fixture = Awaited<ReturnType<typeof seedFinal>>;
let owner: Identity,
  otherOwner: Identity,
  learner: Identity,
  otherLearner: Identity;
let oldFinal: Fixture;

async function signIn(
  name: string,
  registrationRole: "INSTRUCTOR" | "LEARNER",
): Promise<Identity> {
  const email = `grading-${randomUUID()}@example.test`;
  const signed = await post(auth, "/sign-up/email", {
    name,
    email,
    password: "Grading-synthetic-password-12345",
    registrationRole,
  });
  expect(signed.status).toBe(200);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  ownedUsers.push(user.id);
  const cookie = cookies(signed);
  expect(cookie).not.toBe("");
  return { id: user.id, name, email, cookie };
}

async function seedFinal(
  authorId: string,
  learnerId: string,
  options: {
    status?: "PUBLISHED" | "ARCHIVED";
    draft?: boolean;
    title?: string;
    at?: string;
    id?: string;
  } = {},
) {
  const status = options.status ?? "PUBLISHED";
  const questionTitle = options.title ?? question.title;
  const exercise = await prisma.exercise.create({
    data: {
      authorId,
      status,
      title: questionTitle,
      description: question.problemStatement,
      publishedAt: new Date("2026-10-20T00:00:00.000Z"),
      archivedAt:
        status === "ARCHIVED" ? new Date("2026-10-22T00:00:00.000Z") : null,
      versions: {
        create: {
          version: 1,
          topic: f01Topic,
          buggyCode: "def count(items):\n    return 0\n",
          expectedBehavior: question.expectedBehavior,
          correctedSolution: privateSolution,
          bugExplanation: "The original value always returns zero.",
          generationProvenance: f01Saved.provenance,
        },
      },
    },
    select: { id: true, versions: { select: { id: true } } },
  });
  const attempt = await prisma.attempt.create({
    data: {
      ...(options.id ? { id: options.id } : {}),
      learnerId,
      exerciseVersionId: exercise.versions[0]!.id,
      proposedCode: options.draft ? "GRD_PRIVATE_DRAFT_CODE" : code,
      reasoning,
      revision: 4,
      status: options.draft ? "DRAFT" : "FINAL_SUBMITTED",
      finalSubmittedAt: options.draft
        ? null
        : new Date(options.at ?? submittedAt),
    },
  });
  return { attempt, exerciseId: exercise.id, questionTitle };
}

function createTestApp(normalLimits = false) {
  return createApp({
    config: normalLimits ? { ...config, nodeEnv: "development" } : config,
    database: prisma,
    auth,
    logger: normalLimits ? createLogger(config) : logger,
    learnerAttempts: createLearnerAttempts(prisma),
    instructorQuestions: createInstructorQuestions({ prisma, logger }),
    grading: createGrading(prisma),
    profileUpdater: async () => {
      throw new Error("Unused");
    },
  });
}
const app = request(createTestApp());
const loadServers: Server[] = [];

async function listenForLoadCheck() {
  // Reuse one listening server for simultaneous requests. Supertest's
  // auto-listen lifecycle is designed for an individual request.
  const server = createTestApp(true).listen(0, "127.0.0.1");
  loadServers.push(server);
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing load test loopback port");
  return request(`http://127.0.0.1:${address.port}`);
}
function asUser<T extends request.Test>(operation: T, user: Identity): T {
  operation.set("cookie", user.cookie).set("x-debugclinic-actor", user.id);
  return operation;
}
const detail = (base: string, fixture: Fixture) =>
  `${base}/${fixture.attempt.id}`;
const gradePath = (base: string, fixture: Fixture) =>
  `${detail(base, fixture)}/grade`;
function put(
  user: Identity,
  fixture: Fixture,
  score: number,
  expectedRevision: number | null,
) {
  return asUser(app.put(gradePath(instructorList, fixture)), user)
    .set("origin", origin)
    .send({ score, expectedRevision });
}
function readGrade(fixture: Fixture, user = learner) {
  return asUser(app.get(gradePath(learnerList, fixture)), user);
}

beforeAll(async () => {
  const [target] = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT current_database() AS name`;
  expect(target?.name).toBe(new URL(url).pathname.slice(1));
  owner = await signIn("Instructor One", "INSTRUCTOR");
  otherOwner = await signIn("Instructor Two", "INSTRUCTOR");
  learner = await signIn("Learner One", "LEARNER");
  otherLearner = await signIn("Learner Two", "LEARNER");
  oldFinal = await seedFinal(owner.id, learner.id);
  await prisma.review.create({
    data: {
      attemptId: oldFinal.attempt.id,
      instructorId: owner.id,
      decision: "APPROVED",
      comment: legacyComment,
    },
  });
}, 30_000);

afterAll(async () => {
  await Promise.all(
    loadServers.map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  );
  try {
    if (ownedUsers.length) {
      const [table] = await prisma.$queryRaw<Array<{ present: boolean }>>`
        SELECT to_regclass('"AttemptGrade"') IS NOT NULL AS present
      `;
      if (table?.present)
        await prisma.$executeRaw`
          DELETE FROM "AttemptGrade" WHERE "attemptId" IN
            (SELECT "id" FROM "Attempt" WHERE "learnerId" = ANY(${ownedUsers}))
        `;
      await prisma.review.deleteMany({
        where: { instructorId: { in: ownedUsers } },
      });
      await prisma.attempt.deleteMany({
        where: { learnerId: { in: ownedUsers } },
      });
      await prisma.exercise.deleteMany({
        where: { authorId: { in: ownedUsers } },
      });
      await prisma.user.deleteMany({ where: { id: { in: ownedUsers } } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

describe("independent grading acceptance through real cookie HTTP", () => {
  it("H01 reads an existing owned final with an independent legacy review", async () => {
    const response = await asUser(
      app.get(detail(instructorList, oldFinal)),
      owner,
    ).expect(200);
    expect(response.body).toEqual({
      submission: {
        attemptId: oldFinal.attempt.id,
        question,
        code,
        reasoning,
        submittedAt,
        learnerDisplayName: learner.name,
        grade: null,
      },
    });
    expect(response.text).not.toContain(learner.email);
    expect(response.text).not.toContain(legacyComment);
    expect(response.text).not.toContain(privateSolution);
  });

  it("H03 saves boundaries and corrections while preserving the immutable attempt", async () => {
    const maximum = await seedFinal(owner.id, learner.id, {
      title: "Revision limit",
    });
    await put(owner, maximum, 10, null).expect(200);
    await prisma.$executeRaw`
      UPDATE "AttemptGrade" SET "revision" = 2147483647 WHERE "attemptId" = ${maximum.attempt.id}
    `;
    const terminal = await put(owner, maximum, 9, 2_147_483_647).expect(409);
    expect(terminal.body.error).toMatchObject({
      code: "CONFLICT",
      mutationOutcome: "NOT_APPLIED",
      details: [
        { path: "revision", message: "The grade revision limit was reached." },
      ],
    });
    expect((await readGrade(maximum).expect(200)).body).toEqual({
      grade: { score: 10 },
    });
    const attemptPath = `/api/v1/learner/questions/${oldFinal.exerciseId}/attempt`;
    const baseline = await asUser(app.get(attemptPath), learner).expect(200);
    expect(baseline.body).toEqual({
      attempt: {
        id: oldFinal.attempt.id,
        code,
        reasoning,
        submittedAt,
        revision: 4,
        status: "FINAL_SUBMITTED",
      },
    });
    const first = await put(owner, oldFinal, 1, null).expect(200);
    const initial = first.body.grade as Grade;
    expect(initial).toEqual({
      score: 1,
      revision: 1,
      savedAt: expect.stringMatching(/\.\d{3}Z$/),
    });
    expect((await readGrade(oldFinal).expect(200)).body).toEqual({
      grade: { score: 1 },
    });
    for (const invalid of [
      { score: "8", expectedRevision: 1 },
      { score: 2.5, expectedRevision: 1 },
      { score: 0, expectedRevision: 1 },
      { score: 11, expectedRevision: 1 },
      { score: 8, expectedRevision: 0 },
      { score: 8, expectedRevision: 2_147_483_648 },
      { score: 8 },
      { score: 8, expectedRevision: 1, comment: "GRD_PRIVATE_EXTRA_INPUT" },
    ]) {
      const rejected = await asUser(
        app.put(gradePath(instructorList, oldFinal)),
        owner,
      )
        .set("origin", origin)
        .send(invalid)
        .expect(400);
      expect(rejected.body.error).toMatchObject({
        code: "BAD_REQUEST",
        mutationOutcome: "NOT_APPLIED",
      });
    }
    expect((await readGrade(oldFinal).expect(200)).body).toEqual({
      grade: { score: 1 },
    });
    const corrected = (await put(owner, oldFinal, 10, 1).expect(200)).body
      .grade as Grade;
    expect(corrected).toEqual({
      score: 10,
      revision: 2,
      savedAt: expect.stringMatching(/\.\d{3}Z$/),
    });
    expect(Date.parse(corrected.savedAt)).toBeGreaterThan(
      Date.parse(initial.savedAt),
    );
    expect((await put(owner, oldFinal, 10, 2).expect(200)).body).toEqual({
      grade: corrected,
    });
    expect((await readGrade(oldFinal).expect(200)).body).toEqual({
      grade: { score: 10 },
    });
    expect(
      (await asUser(app.get(attemptPath), learner).expect(200)).body,
    ).toEqual(baseline.body);
    expect(
      (
        await asUser(app.post(`${attemptPath}/submit`), learner)
          .set("origin", origin)
          .send({ code, reasoning, expectedRevision: 3 })
          .expect(200)
      ).body,
    ).toEqual(baseline.body);
  });

  it("H04 serializes competing creators and corrections and rejects stale identical requests", async () => {
    const final = await seedFinal(owner.id, learner.id, {
      title: "Competing grades",
    });
    const secondCookie = cookies(
      await post(auth, "/sign-in/email", {
        email: owner.email,
        password: "Grading-synthetic-password-12345",
      }),
    );
    expect(secondCookie).not.toBe("");
    const secondOwnerSession = { ...owner, cookie: secondCookie };
    const concurrent = async (
      expectedRevision: number | null,
      scores: [number, number],
    ) => {
      const results = await Promise.all([
        put(owner, final, scores[0], expectedRevision),
        put(secondOwnerSession, final, scores[1], expectedRevision),
      ]);
      expect(results.map((response) => response.status).sort()).toEqual([
        200, 409,
      ]);
      const [winner] = results.filter((response) => response.status === 200);
      const [loser] = results.filter((response) => response.status === 409);
      expect(loser!.body.error).toMatchObject({
        code: "CONFLICT",
        mutationOutcome: "NOT_APPLIED",
      });
      const grade = winner!.body.grade as Grade;
      expect(scores).toContain(grade.score);
      expect(grade.revision).toBe((expectedRevision ?? 0) + 1);
      expect((await readGrade(final).expect(200)).body).toEqual({
        grade: { score: grade.score },
      });
      expect(
        (await put(owner, final, grade.score, expectedRevision).expect(409))
          .body.error,
      ).toMatchObject({ code: "CONFLICT", mutationOutcome: "NOT_APPLIED" });
      return grade;
    };
    const first = await concurrent(null, [6, 8]);
    const corrected = await concurrent(first.revision, [4, 7]);
    expect(Date.parse(corrected.savedAt)).toBeGreaterThan(
      Date.parse(first.savedAt),
    );
  });

  it("H06 keeps archived results private with scoped transport, CORS and log handling", async () => {
    const archived = await seedFinal(owner.id, learner.id, {
      status: "ARCHIVED",
      title: "Archived grading",
    });
    const draft = await seedFinal(owner.id, learner.id, { draft: true });
    const target = detail(instructorList, archived);
    const grade = gradePath(instructorList, archived);
    const hostile = "GRD_PRIVATE_CALLER_REQUEST_ID";
    logs.length = 0;
    const cache = (response: request.Response) => {
      expect(response.headers["cache-control"]).toBe("private, no-store");
      expect(String(response.headers["vary"]).toLowerCase()).toContain(
        "cookie",
      );
    };
    const approved = await asUser(app.get(target), owner)
      .set("origin", origin)
      .expect(200);
    cache(approved);
    expect(approved.body.submission).toMatchObject({
      question: { ...question, title: archived.questionTitle },
      submittedAt,
      code,
      reasoning,
      grade: null,
    });
    const requestId = approved.headers["x-request-id"] as string;
    expect(requestId).toBeTruthy();
    const conditional = await asUser(app.get(target), owner)
      .set(
        "if-none-match",
        (approved.headers["etag"] as string | undefined) ?? "*",
      )
      .set("if-modified-since", "Tue, 01 Dec 2099 00:00:00 GMT")
      .expect(200);
    expect(conditional.body).toEqual(approved.body);
    const foreignQueues = [
      await asUser(app.get(instructorList), otherOwner).expect(200),
      await asUser(app.get(learnerList), otherLearner).expect(200),
    ];
    for (const queue of foreignQueues)
      expect(queue.text).not.toContain(archived.attempt.id);

    const preflight = await app
      .options(grade)
      .set("origin", origin)
      .set("access-control-request-method", "PUT")
      .set("access-control-request-headers", "content-type,x-debugclinic-actor")
      .expect(204);
    expect(
      String(preflight.headers["access-control-allow-headers"]).toLowerCase(),
    ).toContain("x-debugclinic-actor");
    expect(preflight.headers["access-control-allow-credentials"]).toBe("true");
    expect(preflight.text).toBe("");
    cache(preflight);
    await app
      .options(grade)
      .set("origin", "https://foreign.example.test")
      .expect(403);

    const guest = await app
      .get(target)
      .set("x-request-id", hostile)
      .expect(401);
    cache(guest);
    expect(guest.body.error.requestId).toBe(guest.headers["x-request-id"]);
    expect(guest.body.error.requestId).not.toBe(hostile);
    expect(guest.body.error.requestId).not.toBe(requestId);
    await asUser(app.get(target), learner).expect(403);
    await asUser(app.get(detail(learnerList, archived)), owner).expect(403);
    await asUser(app.get(target), owner)
      .set("x-debugclinic-actor", otherOwner.id)
      .expect(403);
    const foreign = await asUser(app.get(target), otherOwner).expect(404);
    for (const denied of [
      foreign,
      await asUser(app.get(detail(instructorList, draft)), owner).expect(404),
      await asUser(
        app.get(`${instructorList}/missing-${randomUUID()}`),
        owner,
      ).expect(404),
      await asUser(app.get(detail(learnerList, archived)), otherLearner).expect(
        404,
      ),
      await readGrade(archived, otherLearner).expect(404),
    ]) {
      cache(denied);
      expect(denied.body).toEqual({
        error: {
          code: "NOT_FOUND",
          message: "Submission not found",
          requestId: expect.any(String),
        },
      });
    }
    for (const rejected of [
      await app
        .put(grade)
        .set("origin", origin)
        .send({ score: 8, expectedRevision: null })
        .expect(401),
      await put(learner, archived, 8, null).expect(403),
      await put(otherOwner, archived, 8, null).expect(404),
      await asUser(app.put(grade), owner)
        .send({ score: 8, expectedRevision: null })
        .expect(403),
      await put(owner, archived, 8, null)
        .set("origin", "https://foreign.example.test")
        .expect(403),
      await asUser(app.put(grade), owner)
        .set("origin", origin)
        .type("text")
        .send("8")
        .expect(400),
      await asUser(app.put(grade), owner)
        .set("origin", origin)
        .type("json")
        .send("{")
        .expect(400),
      await asUser(app.put(grade), owner)
        .set("origin", origin)
        .send({ score: "x".repeat(66_000) })
        .expect(413),
    ]) {
      cache(rejected);
      expect(rejected.body.error.mutationOutcome).toBe("NOT_APPLIED");
    }
    expect((await readGrade(archived).expect(200)).body).toEqual({
      grade: null,
    });
    await put(owner, archived, 6, null).expect(200);
    await put(owner, archived, 8, 1).expect(200);
    expect((await readGrade(archived).expect(200)).body).toEqual({
      grade: { score: 8 },
    });
    const learnerDetail = await asUser(
      app.get(detail(learnerList, archived)),
      learner,
    ).expect(200);
    expect(learnerDetail.body).toEqual({
      submission: {
        attemptId: archived.attempt.id,
        question: { ...question, title: archived.questionTitle },
        code,
        reasoning,
        submittedAt,
        grade: { score: 8 },
      },
    });
    const captured = logs.join("");
    expect(captured).toContain(guest.body.error.requestId);
    for (const sentinel of [
      hostile,
      archived.attempt.id,
      learner.email,
      learner.id,
      privateSolution,
      code.trim(),
      "grade-sentinel",
    ])
      expect(captured).not.toContain(sentinel);

    const publicPath = `/api/v1/learner/questions/${archived.exerciseId}`;
    await asUser(app.get(publicPath), learner).expect(404);
    await asUser(app.put(`${publicPath}/attempt`), otherLearner)
      .set("origin", origin)
      .send({ code, reasoning, expectedRevision: null })
      .expect(404);
  });

  it("H02 paginates tied rows by ID and keeps cursor scope and list projection private", async () => {
    const prefix = `paging-${randomUUID()}`;
    const tied: Fixture[] = [];
    for (let index = 0; index < 51; index++) {
      tied.push(
        await seedFinal(otherOwner.id, otherLearner.id, {
          title: `Paging fixture ${index}`,
          id: `${prefix}-${String(index).padStart(2, "0")}`,
        }),
      );
    }
    await seedFinal(otherOwner.id, otherLearner.id, { draft: true });
    const expectedRows = tied.map(({ attempt, questionTitle }) => ({
      attemptId: attempt.id,
      questionTitle,
      learnerDisplayName: otherLearner.name,
      submittedAt,
      grade: null,
    }));
    const awaiting = await asUser(app.get(instructorList), otherOwner).expect(
      200,
    );
    expect(awaiting.body).toEqual({
      items: expectedRows.slice(0, 50),
      nextCursor: expect.any(String),
    });
    const cursor = awaiting.body.nextCursor as string;
    const firstSave = await put(otherOwner, tied[49]!, 6, null).expect(200);
    const continuation = await asUser(
      app.get(instructorList).query({ cursor }),
      otherOwner,
    ).expect(200);
    expect(continuation.body).toEqual({
      items: [expectedRows[50]],
      nextCursor: null,
    });
    const replay = await asUser(
      app.get(instructorList).query({ cursor }),
      owner,
    ).expect(200);
    expect(replay.text).not.toContain(prefix);
    await asUser(
      app.get(instructorList).query({ view: "graded", cursor }),
      otherOwner,
    ).expect(400);
    for (const query of [
      "cursor=invalid!",
      `cursor=${"A".repeat(2049)}`,
      "view=awaiting&view=graded",
      "offset=0",
    ]) {
      await asUser(app.get(`${instructorList}?${query}`), otherOwner).expect(
        400,
      );
    }
    await setTimeout(5);
    const secondSave = await put(otherOwner, tied[48]!, 7, null).expect(200);
    expect(secondSave.body.grade.savedAt > firstSave.body.grade.savedAt).toBe(
      true,
    );
    const beforeCorrection = await asUser(
      app.get(instructorList).query({ view: "graded" }),
      otherOwner,
    ).expect(200);
    expect(beforeCorrection.body).toEqual({
      items: [
        { ...expectedRows[48], grade: { score: 7 } },
        { ...expectedRows[49], grade: { score: 6 } },
      ],
      nextCursor: null,
    });
    await setTimeout(5);
    const correction = await put(otherOwner, tied[49]!, 8, 1).expect(200);
    expect(correction.body.grade.savedAt > secondSave.body.grade.savedAt).toBe(
      true,
    );
    const graded = await asUser(
      app.get(instructorList).query({ view: "graded" }),
      otherOwner,
    ).expect(200);
    expect(graded.body).toEqual({
      items: [
        { ...expectedRows[49], grade: { score: 8 } },
        { ...expectedRows[48], grade: { score: 7 } },
      ],
      nextCursor: null,
    });
    const learnerRows = expectedRows
      .toReversed()
      .map(({ attemptId, questionTitle }) => ({
        attemptId,
        questionTitle,
        submittedAt,
        gradingStatus: [tied[48]!.attempt.id, tied[49]!.attempt.id].includes(
          attemptId,
        )
          ? "GRADED"
          : "AWAITING_GRADE",
      }));
    const results = await asUser(app.get(learnerList), otherLearner).expect(
      200,
    );
    expect(results.body).toEqual({
      items: learnerRows.slice(0, 50),
      nextCursor: expect.any(String),
    });
    const finalResult = await asUser(
      app.get(learnerList).query({ cursor: results.body.nextCursor as string }),
      otherLearner,
    ).expect(200);
    expect(finalResult.body).toEqual({
      items: [learnerRows[50]],
      nextCursor: null,
    });
  }, 30_000);

  it("H07 isolates ordinary traffic, each learner and the dedicated shared-IP ceiling", async () => {
    const ip = "192.0.2.71";
    const cohort = await Promise.all(
      Array.from({ length: 11 }, async (_, index) => {
        const user = await signIn(`Polling learner ${index}`, "LEARNER");
        return { user, final: await seedFinal(owner.id, user.id) };
      }),
    );
    const poll = (
      lane: Awaited<ReturnType<typeof listenForLoadCheck>>,
      member: (typeof cohort)[number],
    ) =>
      asUser(
        lane
          .get(gradePath(learnerList, member.final))
          .set("x-forwarded-for", ip),
        member.user,
      );
    const ordinary = (lane: Awaited<ReturnType<typeof listenForLoadCheck>>) =>
      asUser(lane.get("/api/v1/me").set("x-forwarded-for", ip), learner);

    const lane = await listenForLoadCheck();
    // Compress twelve rounds into one normal limiter window. C04 measures the
    // actual scheduled browser cadence separately.
    const began = performance.now();
    for (let round = 0; round < 12; round++) {
      const reads = await Promise.all(
        cohort.map((member) => poll(lane, member)),
      );
      expect(reads.map(({ status, body }) => ({ status, body }))).toEqual(
        Array.from({ length: 11 }, () => ({
          status: 200,
          body: { grade: null },
        })),
      );
      await ordinary(lane).expect(200);
    }
    const [first, peer] = cohort;
    for (let remaining = 108; remaining > 0; remaining--)
      await poll(lane, first!).expect(200);
    const limited = await poll(lane, first!).expect(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    await poll(lane, peer!).expect(200);
    await ordinary(lane).expect(200);
    expect(performance.now() - began).toBeLessThan(60_000);

    const edge = await listenForLoadCheck();
    for (let total = 0; total < 600; total += 10) {
      const results = await Promise.all(
        Array.from({ length: 10 }, (_, index) =>
          poll(edge, cohort[(total + index) % cohort.length]!),
        ),
      );
      expect(results.map(({ status }) => status)).toEqual(
        Array<number>(10).fill(200),
      );
    }
    await poll(edge, first!).expect(429);
    await ordinary(edge).expect(200);

    const rejects = await listenForLoadCheck();
    const guest = () =>
      rejects
        .get(gradePath(learnerList, first!.final))
        .set("x-forwarded-for", ip);
    for (let count = 0; count < 120; count++) await guest().expect(401);
    await guest().expect(429);
    await ordinary(rejects).expect(429);
  }, 60_000);
});
