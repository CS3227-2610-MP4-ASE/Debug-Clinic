import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../generated/prisma/client.js";
import { createInstructorQuestions } from "../../apps/backend/src/exercises/instructor-questions.js";
import { createInstructorDrafts } from "../../apps/backend/src/exercises/instructor-drafts.js";
import { FakeAiProvider } from "../../apps/backend/src/ai/provider.js";
import { readEnv } from "../../apps/backend/src/config/env.js";
import { createLogger } from "../../apps/backend/src/lib/logger.js";
import { testDatabaseUrl } from "../support/database-target.js";

const url = testDatabaseUrl();
for (const name of [
  "DATABASE_URL",
  "DATABASE_URL_POOLED",
  "E2E_TEST_DATABASE_URL",
]) {
  if (process.env[name] !== url)
    throw new Error("Explicit identical synthetic targets required");
}
const client = () =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const prisma = client(),
  concurrent = client();
const suffix = randomUUID();
const owner = `f02-owner-${suffix}`,
  other = `f02-other-${suffix}`;
const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://localhost:5173",
  CORS_ORIGINS: "http://localhost:5173",
  DATABASE_URL: url,
  DATABASE_URL_POOLED: url,
  BETTER_AUTH_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: "f02-synthetic-secret-at-least-32-characters",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "silent",
});
const logger = createLogger(config);
const questions = createInstructorQuestions({ prisma, logger });
const competitor = createInstructorQuestions({ prisma: concurrent, logger });
const drafts = createInstructorDrafts({
  prisma,
  logger,
  config,
  provider: new FakeAiProvider(),
});
const topic = "Python lists and for loops";
const fields = {
  title: "Sum all values",
  problemStatement:
    "Fix the function so every list value contributes to its sum.",
  buggyCode: "def total(values):\n    return sum(values[:-1])\n",
  expectedBehavior: "total([3, 5]) returns 8; total([]) returns 0.",
  bugExplanation: "F02_PRIVATE_EXPLANATION",
  correctedSolution:
    "# F02_PRIVATE_SOLUTION\ndef total(values):\n    return sum(values)\n",
};
async function fresh() {
  const generated = await drafts.generate(owner, topic);
  const saved = await drafts.save(owner, {
    topic,
    draft: fields,
    generationId: generated.generation.id,
  });
  return (await questions.getOwner(owner, saved.draft.id)).question;
}
beforeAll(async () => {
  expect(await prisma.$queryRaw`SELECT current_database() AS name`).toEqual([
    { name: decodeURIComponent(new URL(url).pathname.slice(1)) },
  ]);
  await prisma.user.createMany({
    data: [
      {
        id: owner,
        name: "Instructor A",
        email: `${owner}@example.test`,
        role: "INSTRUCTOR",
      },
      {
        id: other,
        name: "Instructor B",
        email: `${other}@example.test`,
        role: "INSTRUCTOR",
      },
    ],
  });
});
afterAll(async () => {
  await prisma.exercise.deleteMany({
    where: { authorId: { in: [owner, other] } },
  });
  await prisma.aiUsageEvent.deleteMany({
    where: { userId: { in: [owner, other] } },
  });
  await prisma.user.deleteMany({ where: { id: { in: [owner, other] } } });
  await Promise.all([prisma.$disconnect(), concurrent.$disconnect()]);
});
describe("F02 public module / real PostgreSQL", () => {
  it("B04 updates the same private identity and returns canonical fields", async () => {
    const original = await fresh();
    const edited = {
      ...fields,
      title: "  Count every value  ",
      buggyCode: "\n  print('x')  \r\n",
    };
    const saved = await questions.saveChanges(owner, original.id, {
      topic,
      expectedRevision: 0,
      draft: edited,
    });
    expect(saved.question).toMatchObject({
      id: original.id,
      versionId: original.versionId,
      revision: 1,
      status: "DRAFT",
      title: "Count every value",
      buggyCode: "\n  print('x')  \r\n",
    });
    expect((await questions.getOwner(owner, original.id)).question).toEqual(
      saved.question,
    );
    await expect(questions.getOwner(other, original.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(questions.getPublished(original.id)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("F02 reviewed publication and concurrency", () => {
  it("B07/B11/B15/B22/B25/B29 saved publication is immutable, public allowlisted, archived and replayed", async () => {
    const original = await fresh();
    const input = {
      source: "saved" as const,
      id: original.id,
      topic,
      expectedRevision: 0,
      draft: { ...fields, title: "Count every value" },
      reviewConfirmed: true as const,
    };
    const first = await questions.publish(owner, input);
    expect(first.outcome).toBe("published");
    expect(first.question).toMatchObject({
      id: original.id,
      versionId: original.versionId,
      status: "PUBLISHED",
      revision: 1,
      title: "Count every value",
      archivedAt: null,
    });
    expect(first.question.publishedAt).not.toBeNull();
    const exposed = (await questions.getPublished(original.id)).question;
    expect(Object.keys(exposed).sort()).toEqual(
      [
        "id",
        "versionId",
        "title",
        "topic",
        "instructorName",
        "publishedAt",
        "problemStatement",
        "buggyCode",
        "expectedBehavior",
      ].sort(),
    );
    expect(JSON.stringify(exposed)).not.toContain("F02_PRIVATE");
    expect(exposed.instructorName).toBe("Instructor A");
    expect(
      await questions.publish(owner, {
        ...input,
        draft: fields,
        expectedRevision: 123,
      }),
    ).toEqual({ question: first.question, outcome: "existing" });
    await expect(
      questions.saveChanges(owner, original.id, {
        topic,
        expectedRevision: 1,
        draft: fields,
      }),
    ).rejects.toMatchObject({ status: 409, mutationOutcome: "NOT_APPLIED" });
    const removed = await questions.remove(owner, original.id, {
      confirmed: true,
    });
    expect(removed.question).toEqual({
      ...first.question,
      status: "ARCHIVED",
      archivedAt: expect.any(String),
    });
    expect(
      await competitor.remove(owner, original.id, { confirmed: true }),
    ).toEqual(removed);
    expect(await questions.publish(owner, input)).toEqual({
      ...removed,
      outcome: "existing",
    });
    await expect(questions.getPublished(original.id)).rejects.toMatchObject({
      status: 404,
    });
  });
  it("B13/B14 two real clients race saves and save versus publish without mixed snapshots", async () => {
    for (const publish of [false, true]) {
      const original = await fresh();
      const a = {
        topic,
        expectedRevision: 0,
        draft: {
          ...fields,
          title: "Other tab saved this title",
          expectedBehavior: "Other tab behavior",
        },
      };
      const b = {
        topic,
        expectedRevision: 0,
        draft: {
          ...fields,
          title: "Count every value",
          expectedBehavior: "total([3, 5, 7]) returns 15.",
        },
      };
      const results = await Promise.allSettled([
        questions.saveChanges(owner, original.id, a),
        publish
          ? competitor.publish(owner, {
              ...b,
              source: "saved",
              id: original.id,
              reviewConfirmed: true,
            })
          : competitor.saveChanges(owner, original.id, b),
      ]);
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      const failure = results.find((result) => result.status === "rejected");
      expect(failure).toMatchObject({
        reason: { status: 409, mutationOutcome: "NOT_APPLIED" },
      });
      const current = (await questions.getOwner(owner, original.id)).question;
      expect(current.revision).toBe(1);
      expect([
        { title: a.draft.title, expectedBehavior: a.draft.expectedBehavior },
        { title: b.draft.title, expectedBehavior: b.draft.expectedBehavior },
      ]).toContainEqual({
        title: current.title,
        expectedBehavior: current.expectedBehavior,
      });
    }
  });
  it("B15 simultaneous saved publish resolves the same immutable authority", async () => {
    const original = await fresh();
    const input = {
      source: "saved" as const,
      id: original.id,
      topic,
      expectedRevision: 0,
      draft: fields,
      reviewConfirmed: true as const,
    };
    const [a, b] = await Promise.all([
      questions.publish(owner, input),
      competitor.publish(owner, {
        ...input,
        draft: { ...fields, title: "Other tab saved this title" },
      }),
    ]);
    expect(a.question).toEqual(b.question);
    expect([a.outcome, b.outcome].sort()).toEqual(["existing", "published"]);
    expect(a.question.revision).toBe(1);
  });
});

describe("F02 bound previews and fault atomicity", () => {
  it("B09/B16/B18/B40 concurrent same-key preview retains winner, topic binding, archived authority and owner isolation", async () => {
    const generated = await drafts.generate(owner, `  ${topic}  `);
    const usage = await prisma.aiUsageEvent.findUniqueOrThrow({
      where: { id: generated.generation.id },
    });
    expect(usage.generationTopicDigest).toBe(
      "de5dbdb878170e00b2c1e94381074058f02b9d3d50211d6e52175cfd591b7b98",
    );
    const input = {
      source: "preview" as const,
      previewKey: randomUUID(),
      generationId: generated.generation.id,
      topic,
      draft: fields,
      reviewConfirmed: true as const,
    };
    await expect(
      questions.publish(owner, { ...input, topic: "Different Python topic" }),
    ).rejects.toMatchObject({ status: 400, mutationOutcome: "NOT_APPLIED" });
    await expect(
      drafts.save(owner, {
        generationId: input.generationId,
        topic: "Different Python topic",
        draft: fields,
      }),
    ).rejects.toMatchObject({ status: 400 });
    const [first, second] = await Promise.all([
      questions.publish(owner, input),
      competitor.publish(owner, {
        ...input,
        draft: { ...fields, title: "Count every value" },
      }),
    ]);
    expect(first.question).toEqual(second.question);
    expect([first.outcome, second.outcome].sort()).toEqual([
      "existing",
      "published",
    ]);
    const changed = {
      ...input,
      generationId: "unavailable",
      topic: "Different Python topic",
      draft: { ...fields, title: "Must never overwrite" },
    };
    expect(await questions.publish(owner, changed)).toEqual({
      question: first.question,
      outcome: "existing",
    });
    await expect(questions.publish(other, changed)).rejects.toMatchObject({
      status: 400,
    });
    const archived = await questions.remove(owner, first.question.id, {
      confirmed: true,
    });
    expect(await competitor.publish(owner, changed)).toEqual({
      ...archived,
      outcome: "existing",
    });
    expect(
      (
        await questions.listOwner(owner, { status: "ARCHIVED", offset: 0 })
      ).questions.filter((q) => q.id === first.question.id),
    ).toHaveLength(1);
  });
  it("B40 legacy preview safely falls back through intentional fresh Saves and stored-topic publication", async () => {
    const usage = await prisma.aiUsageEvent.create({
      data: {
        userId: owner,
        requestId: randomUUID(),
        operation: "generate-question",
        provider: "fake",
        promptVersion: "legacy",
        status: "SUCCEEDED",
      },
    });
    const input = {
      source: "preview" as const,
      previewKey: randomUUID(),
      generationId: usage.id,
      topic,
      draft: fields,
      reviewConfirmed: true as const,
    };
    await expect(questions.publish(owner, input)).rejects.toMatchObject({
      status: 400,
      message:
        "This older preview cannot be published directly. Save draft and reopen it to publish, or generate a new question.",
      mutationOutcome: "NOT_APPLIED",
    });
    const a = await drafts.save(owner, {
      generationId: usage.id,
      topic,
      draft: fields,
    });
    const b = await drafts.save(owner, {
      generationId: usage.id,
      topic,
      draft: fields,
    });
    expect(a.draft.id).not.toBe(b.draft.id);
    const saved = await questions.publish(owner, {
      source: "saved",
      id: a.draft.id,
      topic,
      draft: fields,
      expectedRevision: 0,
      reviewConfirmed: true,
    });
    expect(saved.question.status).toBe("PUBLISHED");
    await expect(drafts.get(owner, a.draft.id)).rejects.toMatchObject({
      status: 404,
    });
  });
  it("B12/B19 real SQL failure after parent CAS rolls back content, revision and preview key", async () => {
    const original = await fresh();
    const trigger = `f02_fault_${suffix.replaceAll("-", "")}`;
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM "Exercise" WHERE id=NEW."exerciseId" AND "authorId"='${owner}') THEN RAISE EXCEPTION 'F02_PRIVATE_DATABASE_FAULT' USING ERRCODE='23514'; END IF; RETURN NEW; END $$`,
    );
    try {
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER "${trigger}" BEFORE INSERT OR UPDATE ON "ExerciseVersion" FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`,
      );
      for (const publish of [false, true]) {
        const input = {
          topic,
          draft: { ...fields, title: "Never committed" },
          expectedRevision: 0,
        };
        await expect(
          publish
            ? questions.publish(owner, {
                ...input,
                source: "saved",
                id: original.id,
                reviewConfirmed: true,
              })
            : questions.saveChanges(owner, original.id, input),
        ).rejects.toMatchObject({
          status: 503,
          mutationOutcome: "NOT_APPLIED",
        });
        expect((await questions.getOwner(owner, original.id)).question).toEqual(
          original,
        );
      }
      const generated = await drafts.generate(owner, topic);
      const input = {
        source: "preview" as const,
        previewKey: randomUUID(),
        generationId: generated.generation.id,
        topic,
        draft: fields,
        reviewConfirmed: true as const,
      };
      const before = await questions.listOwner(owner, {
        status: "PUBLISHED",
        offset: 0,
      });
      await expect(questions.publish(owner, input)).rejects.toMatchObject({
        status: 503,
        mutationOutcome: "NOT_APPLIED",
      });
      expect(
        await questions.listOwner(owner, { status: "PUBLISHED", offset: 0 }),
      ).toEqual(before);
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER "${trigger}" ON "ExerciseVersion"`,
      );
      expect((await questions.publish(owner, input)).outcome).toBe("published");
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS "${trigger}" ON "ExerciseVersion"`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${trigger}"()`);
    }
  });
});

it("B30 corrupt eligible stored contracts fail safely for owner and learner", async () => {
  const original = await fresh();
  await questions.publish(owner, {
    source: "saved",
    id: original.id,
    topic,
    expectedRevision: 0,
    draft: fields,
    reviewConfirmed: true,
  });
  await prisma.exerciseVersion.update({
    where: { id: original.versionId },
    data: { generationProvenance: { private: "F02_PRIVATE_PROVENANCE" } },
  });
  await expect(questions.getOwner(owner, original.id)).rejects.toMatchObject({
    status: 503,
  });
  await expect(questions.getPublished(original.id)).rejects.toMatchObject({
    status: 503,
  });
});
