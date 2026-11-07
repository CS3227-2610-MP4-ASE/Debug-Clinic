import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../generated/prisma/client.js";
import { createLearnerAssistant } from "../../../../apps/backend/src/exercises/learner-assistant.js";
import { createLearnerAttempts } from "../../../../apps/backend/src/exercises/learner-attempts.js";
import {
  FakeAiProvider,
  type CoachingProviderInput,
  type CoachingProviderResult,
} from "../../../../apps/backend/src/ai/provider.js";
import {
  AssistantMessageRequestSchema,
  type AssistantMessageRequest,
} from "@debugclinic/contracts";
import { testDatabaseUrl } from "../../../../tests/support/database-target.js";

const url = testDatabaseUrl();
assert.equal(process.env.DATABASE_URL, url);
assert.equal(process.env.DATABASE_URL_POOLED, url);
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const results: Array<{ id: string; result: string; diagnostic?: string }> = [];
const okReply = (
  message = "Trace the values before the first difference.",
): CoachingProviderResult => ({
  message,
  attempts: 1,
  inputTokens: null,
  outputTokens: null,
});
const off = { shareCode: false, shareReasoning: false, shareOutput: false };
async function check(id: string, run: () => Promise<void>) {
  try {
    await run();
    results.push({ id, result: "pass" });
  } catch (e) {
    results.push({
      id,
      result: "fail",
      diagnostic:
        e instanceof assert.AssertionError
          ? e.message.slice(0, 300)
          : `Exception ${e instanceof Error ? e.name : "unknown"}; code=${(e as { code?: string }).code ?? "unknown"}`,
    });
  }
}
async function fixture() {
  const id = randomUUID();
  const learner = `learner-${id}`;
  const other = `other-${id}`;
  const teacher = `teacher-${id}`;
  await db.user.createMany({
    data: [learner, other, teacher].map((key) => ({
      id: key,
      name: key,
      email: `${key}@example.test`,
      role: key === teacher ? "INSTRUCTOR" : "LEARNER",
    })),
  });
  const exercise = `exercise-${id}`;
  const version = `version-${id}`;
  await db.exercise.create({
    data: {
      id: exercise,
      authorId: teacher,
      title: "List sum",
      description: "Debug why the last item is omitted.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      versions: {
        create: {
          id: version,
          version: 1,
          language: "python",
          topic: "slices",
          buggyCode: "def total(values):\n    return sum(values[:-1])",
          expectedBehavior: "Sum every value, including the last.",
          bugExplanation: "PRIVATE_REASON_SENTINEL",
          correctedSolution: "PRIVATE_SOLUTION_SENTINEL",
          generationProvenance: {
            generationId: "fixture",
            provider: "fake",
            model: null,
            promptVersion: "fixture-v1",
            generatedAt: new Date().toISOString(),
            association: "instructor-reported",
          },
        },
      },
    },
  });
  let calls = 0;
  const captured: CoachingProviderInput[] = [];
  let behavior = async (
    _input: CoachingProviderInput,
  ): Promise<CoachingProviderResult> => okReply();
  const provider = new FakeAiProvider();
  provider.generateCoaching = async (input) => {
    calls++;
    captured.push(input);
    return behavior(input);
  };
  const service = createLearnerAssistant(db, provider);
  const body = (
    revision = 0,
    extra: Partial<AssistantMessageRequest> = {},
  ): AssistantMessageRequest => ({
    requestId: randomUUID(),
    expectedRevision: revision,
    expectedExerciseVersionId: version,
    action: "MESSAGE",
    message: "What should I trace?",
    context: off,
    ...extra,
  });
  const conversation = () =>
    db.learnerAssistantConversation.findUniqueOrThrow({
      where: {
        learnerId_exerciseVersionId: {
          learnerId: learner,
          exerciseVersionId: version,
        },
      },
    });
  const setBehavior = (fn: typeof behavior) => {
    behavior = fn;
  };
  return {
    learner,
    other,
    teacher,
    exercise,
    version,
    service,
    provider,
    body,
    conversation,
    captured,
    setBehavior,
    calls: () => calls,
  };
}
async function pending(f: Awaited<ReturnType<typeof fixture>>, revision = 0) {
  let resolve!: (value: CoachingProviderResult) => void;
  let started!: () => void;
  const start = new Promise<void>((r) => {
    started = r;
  });
  f.setBehavior(async () => {
    started();
    return new Promise((r) => {
      resolve = r;
    });
  });
  const body = f.body(revision);
  const promise = f.service.send(f.learner, f.exercise, body);
  await start;
  return {
    body,
    promise,
    release: () => resolve(okReply("LATE_REPLY_SENTINEL")),
  };
}
try {
  await check("strict-client-role-level-context-rejection", async () => {
    const f = await fixture();
    const body = f.body();
    for (const patch of [
      { level: 3 },
      { role: "INSTRUCTOR" },
      { sharedCode: "unconsented" },
      { context: { ...off, shareOutput: true } },
      { message: "😀".repeat(1001) },
    ])
      assert.equal(
        AssistantMessageRequestSchema.safeParse({ ...body, ...patch }).success,
        false,
      );
  });
  await check("owner-version-publication-no-call", async () => {
    const f = await fixture();
    await f.service.send(f.learner, f.exercise, f.body());
    assert.equal((await f.service.get(f.other, f.exercise)).messages.length, 0);
    const ownRequest = (
      await db.learnerAssistantRequest.findFirstOrThrow({
        where: { learnerId: f.learner },
      })
    ).requestId;
    await assert.rejects(f.service.reconcile(f.other, f.exercise, ownRequest), {
      status: 404,
    });
    await assert.rejects(
      f.service.send(
        f.learner,
        f.exercise,
        f.body(1, { expectedExerciseVersionId: "forged-version" }),
      ),
      { status: 409 },
    );
    await db.exercise.update({
      where: { id: f.exercise },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });
    await assert.rejects(f.service.send(f.learner, f.exercise, f.body(1)), {
      status: 404,
    });
    assert.equal(f.calls(), 1);
  });
  await check(
    "server-progression-success-only-and-clear-retention",
    async () => {
      const f = await fixture();
      const next = (r: number) =>
        f.body(r, { action: "NEXT_HINT", message: undefined });
      await assert.rejects(f.service.send(f.learner, f.exercise, next(0)), {
        status: 409,
      });
      await f.service.send(f.learner, f.exercise, f.body());
      f.setBehavior(async () => {
        throw Error("synthetic");
      });
      await assert.rejects(f.service.send(f.learner, f.exercise, next(1)), {
        status: 503,
      });
      assert.equal(
        (await f.service.get(f.learner, f.exercise)).unlockedLevel,
        1,
      );
      f.setBehavior(async () => okReply());
      assert.equal(
        (await f.service.send(f.learner, f.exercise, next(1))).assistant
          .unlockedLevel,
        2,
      );
      assert.equal(
        (await f.service.send(f.learner, f.exercise, next(2))).assistant
          .unlockedLevel,
        3,
      );
      await assert.rejects(f.service.send(f.learner, f.exercise, next(3)), {
        status: 409,
      });
      const state = await f.service.clear(f.learner, f.exercise, {
        requestId: randomUUID(),
        expectedRevision: 3,
      });
      assert.equal(state.unlockedLevel, 3);
      assert.equal(state.hasSuccessfulReply, true);
      assert.equal(
        await db.attempt.count({ where: { learnerId: f.learner } }),
        0,
      );
    },
  );
  for (const category of ["Code", "Reasoning", "Output"] as const)
    await check(
      `whole-exchange-disabled-${category.toLowerCase()}`,
      async () => {
        const f = await fixture();
        const sentinel = `ONLY_SHARED_${category.toUpperCase()}_SENTINEL`;
        f.setBehavior(async () =>
          okReply(`Quoted ${sentinel}. Trace a small example.`),
        );
        const context = { ...off, [`share${category}`]: true };
        await f.service.send(
          f.learner,
          f.exercise,
          f.body(0, { context, [`shared${category}`]: sentinel }),
        );
        await f.service.send(f.learner, f.exercise, f.body(1));
        const assembled = JSON.stringify(f.captured.at(-1));
        assert.ok(!assembled.includes(sentinel));
        assert.ok(!assembled.includes("PRIVATE_REASON_SENTINEL"));
        assert.ok(!assembled.includes("PRIVATE_SOLUTION_SENTINEL"));
      },
    );
  await check("duplicate-id-conflict-and-single-dispatch", async () => {
    const f = await fixture();
    const p = await pending(f);
    await assert.rejects(f.service.send(f.learner, f.exercise, p.body), {
      status: 409,
    });
    p.release();
    await p.promise;
    await f.service.send(f.learner, f.exercise, p.body);
    assert.equal(f.calls(), 1);
    await assert.rejects(
      f.service.send(f.learner, f.exercise, { ...p.body, message: "changed" }),
      { status: 409 },
    );
  });
  await check("expired-duplicate-never-returns-reply", async () => {
    const f = await fixture();
    const body = f.body();
    await f.service.send(f.learner, f.exercise, body);
    await db.learnerAssistantConversation.update({
      where: { id: (await f.conversation()).id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    assert.equal(
      (await f.service.get(f.learner, f.exercise)).messages.length,
      0,
    );
    assert.equal(
      (await f.service.reconcile(f.learner, f.exercise, body.requestId)).reply,
      null,
    );
    const duplicate = await f.service.send(f.learner, f.exercise, body);
    assert.equal(
      duplicate.reply,
      undefined,
      "Expired duplicate returned deleted/expired advice separately from the empty state",
    );
  });
  for (const kind of [
    "clear",
    "expiry",
    "lease",
    "final",
    "archive",
    "version",
  ] as const)
    await check(`late-reply-${kind}-discarded`, async () => {
      const f = await fixture();
      const p = await pending(f);
      try {
        if (kind === "clear")
          await f.service.clear(f.learner, f.exercise, {
            requestId: randomUUID(),
            expectedRevision: 0,
          });
        if (kind === "expiry")
          await db.learnerAssistantConversation.update({
            where: { id: (await f.conversation()).id },
            data: { expiresAt: new Date(Date.now() - 1000) },
          });
        if (kind === "lease")
          await db.learnerAssistantRequest.updateMany({
            where: { learnerId: f.learner },
            data: { leaseExpiresAt: new Date(Date.now() - 1000) },
          });
        if (kind === "final")
          await createLearnerAttempts(db).submit(f.learner, f.exercise, {
            expectedRevision: null,
            code: "pass",
            reasoning: "Synthetic final submission",
          });
        if (kind === "archive")
          await db.exercise.update({
            where: { id: f.exercise },
            data: { status: "ARCHIVED", archivedAt: new Date() },
          });
        if (kind === "version") {
          const old = await db.exerciseVersion.findUniqueOrThrow({
            where: { id: f.version },
          });
          await db.exerciseVersion.update({
            where: { id: old.id },
            data: { version: 2 },
          });
          await db.exerciseVersion.create({
            data: {
              exerciseId: f.exercise,
              language: old.language,
              topic: old.topic,
              buggyCode: old.buggyCode,
              expectedBehavior: old.expectedBehavior,
              bugExplanation: old.bugExplanation,
              correctedSolution: old.correctedSolution,
              generationProvenance: {
                generationId: "fixture",
                provider: "fake",
                model: null,
                promptVersion: "fixture-v1",
                generatedAt: new Date().toISOString(),
                association: "instructor-reported",
              },
              id: randomUUID(),
              version: 1,
            },
          });
        }
      } finally {
        p.release();
      }
      await p.promise.catch((e) => {
        if (kind !== "archive" || e.status !== 404) throw e;
      });
      assert.equal(
        await db.learnerAssistantMessage.count({
          where: { conversationId: (await f.conversation()).id },
        }),
        0,
      );
      assert.notEqual(
        (
          await db.learnerAssistantRequest.findFirstOrThrow({
            where: { learnerId: f.learner, requestId: p.body.requestId },
          })
        ).status,
        "SUCCEEDED",
      );
    });
  await check("cross-exercise-final-quota-slot-two-services", async () => {
    const f = await fixture();
    const g = await fixture();
    await f.service.send(f.learner, f.exercise, f.body());
    const conversation = await f.conversation();
    for (let i = 0; i < 8; i++)
      await db.learnerAssistantRequest.create({
        data: {
          learnerId: f.learner,
          conversationId: conversation.id,
          requestId: randomUUID(),
          payloadDigest: "fixture",
          action: "MESSAGE",
          status: "FAILED",
          expectedRevision: 0,
          contentGeneration: 0,
          targetLevel: 1,
        },
      });
    const secondService = createLearnerAssistant(db, f.provider);
    const settled = await Promise.allSettled([
      f.service.send(f.learner, f.exercise, f.body(1)),
      secondService.send(f.learner, g.exercise, g.body()),
    ]);
    assert.equal(settled.filter((r) => r.status === "fulfilled").length, 1);
    const failure = settled.find(
      (r) => r.status === "rejected",
    ) as PromiseRejectedResult;
    assert.equal(failure.reason.status, 429);
    assert.ok(failure.reason.retryAfterSeconds > 0);
    assert.equal(f.calls(), 2);
  });
  await check(
    "physical-expiry-tombstone-cleanup-and-stage-retention",
    async () => {
      const f = await fixture();
      await f.service.send(f.learner, f.exercise, f.body());
      const c = await f.conversation();
      await db.learnerAssistantConversation.update({
        where: { id: c.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await db.learnerAssistantRequest.updateMany({
        where: { learnerId: f.learner },
        data: { createdAt: new Date(Date.now() - 31 * 86400000) },
      });
      assert.ok((await f.service.cleanupExpired()) >= 1);
      assert.equal(
        await db.learnerAssistantMessage.count({
          where: { conversationId: c.id },
        }),
        0,
      );
      assert.equal(
        await db.learnerAssistantRequest.count({
          where: { learnerId: f.learner },
        }),
        0,
      );
      assert.equal((await f.conversation()).hasSuccessfulReply, true);
    },
  );
  await check(
    "context-budget-evicts-oldest-before-rejecting-valid-current",
    async () => {
      const f = await fixture();
      for (let revision = 0; revision < 3; revision++) {
        await f.service.send(
          f.learner,
          f.exercise,
          f.body(revision, {
            context: { ...off, shareCode: true },
            sharedCode: "# synthetic code\n" + "x".repeat(19900),
          }),
        );
      }
      assert.equal(f.calls(), 3);
    },
  );
  console.log(
    JSON.stringify({ kind: "independent-real-pg-security", results }, null, 2),
  );
  if (results.some((r) => r.result === "fail")) process.exitCode = 1;
} finally {
  await db.$disconnect();
}
