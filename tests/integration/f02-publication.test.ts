import { randomUUID } from "node:crypto";
import { createServer, createConnection, type Socket } from "node:net";
import { PrismaPg } from "@prisma/adapter-pg";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../../generated/prisma/client.js";
import { createInstructorQuestions } from "../../apps/backend/src/exercises/instructor-questions.js";
import { createInstructorDrafts } from "../../apps/backend/src/exercises/instructor-drafts.js";
import { FakeAiProvider } from "../../apps/backend/src/ai/provider.js";
import { readEnv } from "../../apps/backend/src/config/env.js";
import { createLogger } from "../../apps/backend/src/lib/logger.js";
import { testDatabaseUrl } from "../support/database-target.js";
import { createApp } from "../../apps/backend/src/app.js";
import { createDebugClinicAuth } from "../../apps/backend/src/auth/auth.js";

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
const ownedUsers = [owner, other];
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
    where: { authorId: { in: ownedUsers } },
  });
  await prisma.aiUsageEvent.deleteMany({
    where: { userId: { in: ownedUsers } },
  });
  await prisma.user.deleteMany({ where: { id: { in: ownedUsers } } });
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
  await prisma.exerciseVersion.update({
    where: { id: original.versionId },
    data: { generationProvenance: original.provenance },
  });
});

describe("F02 real cookie HTTP authorization and input boundaries", () => {
  const logs: string[] = [];
  const httpLogger = createLogger(
    { ...config, logLevel: "info" },
    {
      write(chunk) {
        logs.push(chunk);
      },
    },
  );
  const auth = createDebugClinicAuth(config, prisma, async () => {});
  const app = createApp({
    config,
    database: prisma,
    auth,
    logger: httpLogger,
    instructorQuestions: createInstructorQuestions({
      prisma,
      logger: httpLogger,
    }),
    instructorDrafts: drafts,
    profileUpdater: async () => {
      throw new Error("Unused");
    },
  });
  const cookies: Record<string, string> = {};
  const identities: Record<string, string> = {};
  beforeAll(async () => {
    for (const [name, role] of [
      ["a", "INSTRUCTOR"],
      ["b", "INSTRUCTOR"],
      ["learner", "LEARNER"],
      ["learner2", "LEARNER"],
    ] as const) {
      const email = `f02-cookie-${name}-${suffix}@example.test`,
        password = "F02-synthetic-password-12345";
      await request(app)
        .post("/api/auth/sign-up/email")
        .set("origin", config.appOrigin)
        .send({
          name: `Instructor ${name}`,
          email,
          password,
          registrationRole: role,
        })
        .expect(200);
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      ownedUsers.push(user.id);
      identities[name] = user.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
      const signed = await request(app)
        .post("/api/auth/sign-in/email")
        .set("origin", config.appOrigin)
        .send({ email, password })
        .expect(200);
      cookies[name] = (signed.headers["set-cookie"] as unknown as string[])
        .map((value) => value.split(";")[0])
        .join("; ");
    }
  });
  it("B32 real cookies enforce guests, roles, ownership and expiry", async () => {
    const generated = await drafts.generate(identities["a"]!, topic);
    const saved = await drafts.save(identities["a"]!, {
      topic,
      draft: fields,
      generationId: generated.generation.id,
    });
    const path = `/api/v1/instructor/questions/${saved.draft.id}`;
    await request(app).get(path).expect(401);
    await request(app).get(path).set("cookie", cookies["learner"]!).expect(403);
    await request(app).get(path).set("cookie", cookies["b"]!).expect(404);
    await request(app).get(path).set("cookie", cookies["a"]!).expect(200);
    await request(app)
      .get("/api/v1/learner/questions")
      .set("cookie", cookies["a"]!)
      .expect(403);
    const body = {
      source: "saved",
      id: saved.draft.id,
      topic,
      draft: fields,
      expectedRevision: 0,
      reviewConfirmed: true,
    };
    const privateBefore = (
      await questions.getOwner(identities["a"]!, saved.draft.id)
    ).question;
    for (const identity of [undefined, "learner", "b"]) {
      let denied = request(app).patch(path).set("origin", config.appOrigin);
      if (identity) denied = denied.set("cookie", cookies[identity]!);
      const result = await denied
        .send({
          expectedRevision: 0,
          topic,
          draft: { ...fields, title: "Unauthorized edit" },
        })
        .expect(
          identity === undefined ? 401 : identity === "learner" ? 403 : 404,
        );
      expect(result.body.error.mutationOutcome).toBe("NOT_APPLIED");
      expect(
        (await questions.getOwner(identities["a"]!, saved.draft.id)).question,
      ).toEqual(privateBefore);
    }
    for (const identity of ["learner", "b"])
      await request(app)
        .post("/api/v1/instructor/questions/publish")
        .set("cookie", cookies[identity]!)
        .set("origin", config.appOrigin)
        .send(body)
        .expect(identity === "b" ? 404 : 403);
    await request(app)
      .post("/api/v1/instructor/questions/publish")
      .set("cookie", cookies["a"]!)
      .set("origin", config.appOrigin)
      .send(body)
      .expect(200);
    const exposed = await request(app)
      .get(`/api/v1/learner/questions/${saved.draft.id}`)
      .set("cookie", cookies["learner"]!)
      .expect(200);
    expect(JSON.stringify(exposed.body)).not.toMatch(
      /F02_PRIVATE|example.test|provenance|correctedSolution|bugExplanation/,
    );
    const publishedBefore = (
      await questions.getOwner(identities["a"]!, saved.draft.id)
    ).question;
    for (const identity of [undefined, "learner", "b"]) {
      let denied = request(app)
        .post(`${path}/remove`)
        .set("origin", config.appOrigin);
      if (identity) denied = denied.set("cookie", cookies[identity]!);
      const result = await denied
        .send({ confirmed: true })
        .expect(
          identity === undefined ? 401 : identity === "learner" ? 403 : 404,
        );
      expect(result.body.error.mutationOutcome).toBe("NOT_APPLIED");
      expect(
        (await questions.getOwner(identities["a"]!, saved.draft.id)).question,
      ).toEqual(publishedBefore);
      await questions.getPublished(saved.draft.id);
    }
    await prisma.session.updateMany({
      where: { userId: identities["a"]! },
      data: { expiresAt: new Date(0) },
    });
    const expired = await request(app)
      .post("/api/v1/instructor/questions/publish")
      .set("cookie", cookies["a"]!)
      .set("origin", config.appOrigin)
      .send(body)
      .expect(401);
    expect(expired.body.error.mutationOutcome).toBe("NOT_APPLIED");
  });
  it("B28 two unrelated real-cookie learners browse both instructors without enrollment", async () => {
    const first = (
      await questions.listOwner(identities["a"]!, {
        status: "PUBLISHED",
        offset: 0,
      })
    ).questions[0]!;
    const generation = await drafts.generate(identities["b"]!, topic);
    const second = await questions.publish(identities["b"]!, {
      source: "preview",
      previewKey: randomUUID(),
      generationId: generation.generation.id,
      topic,
      draft: { ...fields, title: "Instructor B publication" },
      reviewConfirmed: true,
    });
    for (const identity of ["learner", "learner2"]) {
      const listed = await request(app)
        .get("/api/v1/learner/questions")
        .set("cookie", cookies[identity]!)
        .expect(200);
      expect(listed.body.questions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: first.id,
            instructorName: "Instructor a",
          }),
          expect.objectContaining({
            id: second.question.id,
            instructorName: "Instructor b",
          }),
        ]),
      );
      for (const id of [first.id, second.question.id]) {
        const detail = await request(app)
          .get(`/api/v1/learner/questions/${id}`)
          .set("cookie", cookies[identity]!)
          .expect(200);
        expect(detail.body.question.id).toBe(id);
        expect(JSON.stringify(detail.body)).not.toMatch(
          /F02_PRIVATE|example.test|bugExplanation|correctedSolution|provenance/,
        );
      }
    }
  });
  it("B03/B33/B36 rejects raw body, origins, unknown keys and every unrepresentable field without mutation or log leakage", async () => {
    const generated = await drafts.generate(identities["b"]!, topic);
    const saved = await drafts.save(identities["b"]!, {
      topic,
      draft: fields,
      generationId: generated.generation.id,
    });
    const before = (await questions.getOwner(identities["b"]!, saved.draft.id))
      .question;
    const path = `/api/v1/instructor/questions/${saved.draft.id}`;
    const body = { topic, draft: fields, expectedRevision: 0 };
    for (const origin of [undefined, "https://foreign.example.test"]) {
      let req = request(app).patch(path).set("cookie", cookies["b"]!);
      if (origin) req = req.set("origin", origin);
      expect(
        (await req.send(body).expect(403)).body.error.mutationOutcome,
      ).toBe("NOT_APPLIED");
    }
    await request(app)
      .patch(path)
      .set("cookie", cookies["b"]!)
      .set("origin", config.appOrigin)
      .set("content-type", "text/plain")
      .send("F02_PRIVATE_BODY")
      .expect(400);
    for (const [raw, status] of [
      ["{", 400],
      [JSON.stringify({ private: "x".repeat(65536) }), 413],
    ] as const) {
      const response = await request(app)
        .patch(path)
        .set("cookie", cookies["b"]!)
        .set("origin", config.appOrigin)
        .set("content-type", "application/json")
        .send(raw)
        .expect(status);
      expect(response.body.error).toMatchObject({
        code: "BAD_REQUEST",
        mutationOutcome: "NOT_APPLIED",
        requestId: expect.any(String),
      });
    }
    for (const field of ["topic", ...Object.keys(fields)])
      for (const invalid of [
        "F02_PRIVATE_BODY\0",
        "F02_PRIVATE_BODY\ud800",
        "F02_PRIVATE_BODY\udc00",
      ]) {
        const input =
          field === "topic"
            ? { ...body, topic: invalid }
            : { ...body, draft: { ...fields, [field]: invalid } };
        const response = await request(app)
          .patch(path)
          .set("cookie", cookies["b"]!)
          .set("origin", config.appOrigin)
          .send(input)
          .expect(400);
        expect(response.body.error.mutationOutcome).toBe("NOT_APPLIED");
        expect(response.body.error.details).toContainEqual({
          path: field === "topic" ? "topic" : `draft.${field}`,
          message: expect.any(String),
        });
        expect(JSON.stringify(response.body)).not.toContain("F02_PRIVATE_BODY");
      }
    const unknown = await request(app)
      .patch(path)
      .set("cookie", cookies["b"]!)
      .set("origin", config.appOrigin)
      .send({ ...body, F02_PRIVATE_UNKNOWN: "private" })
      .expect(400);
    expect(JSON.stringify(unknown.body)).not.toContain("F02_PRIVATE_UNKNOWN");
    expect(
      (await questions.getOwner(identities["b"]!, saved.draft.id)).question,
    ).toEqual(before);
    expect(logs.join("\n")).not.toMatch(
      /F02_PRIVATE|generationTopicDigest|duplicate key|session_token|synthetic-password/,
    );
  });
});

it("B02/B03 all exact UTF16 field maxima persist and oversized or unrepresentable publications leave prior authority intact", async () => {
  for (const [field, max] of Object.entries({
    topic: 300,
    title: 120,
    problemStatement: 2000,
    buggyCode: 4000,
    expectedBehavior: 1500,
    bugExplanation: 2000,
    correctedSolution: 4000,
  })) {
    const boundTopic = field === "topic" ? "x".repeat(298) + "😀" : topic;
    const generated = await drafts.generate(owner, boundTopic);
    const draft =
      field === "topic"
        ? fields
        : { ...fields, [field]: "x".repeat(max - 2) + "😀" };
    const first = await drafts.save(owner, {
      topic: boundTopic,
      draft,
      generationId: generated.generation.id,
    });
    const before = (await questions.getOwner(owner, first.draft.id)).question;
    expect(
      field === "topic" ? before.topic : before[field as keyof typeof fields],
    ).toBe("x".repeat(max - 2) + "😀");
    const input = {
      source: "saved" as const,
      id: before.id,
      expectedRevision: 0,
      topic: boundTopic,
      draft,
      reviewConfirmed: true as const,
    };
    for (const invalid of [
      "x".repeat(max + 1),
      "x\0y",
      "x\ud800y",
      "x\udc00y",
    ]) {
      const invalidInput =
        field === "topic"
          ? { ...input, topic: invalid }
          : { ...input, draft: { ...draft, [field]: invalid } };
      await expect(async () =>
        questions.publish(owner, invalidInput),
      ).rejects.toThrow();
      expect((await questions.getOwner(owner, before.id)).question).toEqual(
        before,
      );
      await expect(questions.getPublished(before.id)).rejects.toMatchObject({
        status: 404,
      });
    }
    const published = await questions.publish(owner, input);
    expect(published.question.status).toBe("PUBLISHED");
    expect(
      field === "topic"
        ? published.question.topic
        : published.question[field as keyof typeof fields],
    ).toBe("x".repeat(max - 2) + "😀");
  }
});
it("B41 revision overflow rejects save/initial publication with support guidance and no mutation", async () => {
  const original = await fresh();
  await prisma.exercise.update({
    where: { id: original.id },
    data: { editRevision: 2147483647 },
  });
  const before = (await questions.getOwner(owner, original.id)).question;
  const input = {
    topic,
    expectedRevision: 2147483647,
    draft: { ...fields, title: "Never committed" },
  };
  for (const operation of [
    () => questions.saveChanges(owner, original.id, input),
    () =>
      questions.publish(owner, {
        ...input,
        source: "saved",
        id: original.id,
        reviewConfirmed: true,
      }),
  ]) {
    await expect(operation()).rejects.toMatchObject({
      status: 409,
      mutationOutcome: "NOT_APPLIED",
      message: expect.stringContaining("support"),
    });
    expect((await questions.getOwner(owner, original.id)).question).toEqual(
      before,
    );
  }
});
it("B21/B23 own state and learner pages filter before pagination with deterministic timestamp/id ties", async () => {
  // Isolate the public collection using transitions on this suite's own fixtures.
  for (const user of ownedUsers) {
    while (true) {
      const page = await questions.listOwner(user, {
        status: "PUBLISHED",
        offset: 0,
      });
      if (page.questions.length === 0) break;
      for (const question of page.questions)
        await questions.remove(user, question.id, { confirmed: true });
    }
  }
  expect(await questions.listPublished({ offset: 0 })).toEqual({
    questions: [],
    nextOffset: null,
  });
  const pagingOwner = `f02-pages-${suffix}`;
  ownedUsers.push(pagingOwner);
  await prisma.user.create({
    data: {
      id: pagingOwner,
      name: "Paging Instructor",
      email: `${pagingOwner}@example.test`,
      role: "INSTRUCTOR",
    },
  });
  const provenance = {
    generationId: "legacy-fixture",
    provider: "fake",
    model: null,
    promptVersion: "F02_PRIVATE_PROVENANCE",
    generatedAt: "2026-11-06T00:00:00.000Z",
    association: "instructor-reported",
  };
  for (const status of ["DRAFT", "PUBLISHED", "ARCHIVED"] as const)
    for (const count of [0, 1, 49, 50, 51, 101]) {
      const ids = Array.from(
        { length: count },
        (_, i) => `f02-page-${status}-${String(i).padStart(3, "0")}-${suffix}`,
      );
      const time = new Date("2030-01-01T00:00:00.000Z");
      await prisma.exercise.createMany({
        data: ids.map((id) => ({
          id,
          title: fields.title,
          description: fields.problemStatement,
          authorId: pagingOwner,
          status,
          createdAt: time,
          publishedAt: status === "DRAFT" ? null : time,
          archivedAt: status === "ARCHIVED" ? time : null,
        })),
      });
      await prisma.exerciseVersion.createMany({
        data: ids.map((id) => ({
          exerciseId: id,
          version: 1,
          language: "python",
          topic,
          buggyCode: fields.buggyCode,
          expectedBehavior: fields.expectedBehavior,
          bugExplanation: fields.bugExplanation,
          correctedSolution: fields.correctedSolution,
          generationProvenance: provenance,
        })),
      });
      const hidden = `f02-hidden-${status}-${count}-${suffix}`;
      await prisma.exercise.create({
        data: {
          id: hidden,
          authorId: pagingOwner,
          title: "Incomplete",
          description: "Hidden",
          status,
          createdAt: time,
          publishedAt: status === "DRAFT" ? null : time,
          archivedAt: status === "ARCHIVED" ? time : null,
        },
      });
      const expected = [...ids].reverse();
      for (const offset of [0, 49, 50, 51, 101]) {
        const result = await questions.listOwner(pagingOwner, {
          status,
          offset,
        });
        expect(result.questions.map((q) => q.id)).toEqual(
          expected.slice(offset, offset + 50),
        );
        expect(result.nextOffset).toBe(
          count > offset + 50 ? offset + 50 : null,
        );
      }
      if (status === "PUBLISHED") {
        for (const offset of [0, 49, 50, 51, 101]) {
          const result = await questions.listPublished({ offset });
          expect(result.questions.map((q) => q.id)).toEqual(
            expected.slice(offset, offset + 50),
          );
          expect(result.nextOffset).toBe(
            count > offset + 50 ? offset + 50 : null,
          );
          expect(JSON.stringify(result)).not.toContain("F02_PRIVATE");
        }
      }
      await prisma.exercise.deleteMany({ where: { authorId: pagingOwner } });
    }
  expect(
    await questions.listOwner(pagingOwner, {
      status: "DRAFT",
      offset: 4294967295,
    }),
  ).toEqual({ questions: [], nextOffset: null });
});

it("B44 real unrelated uniqueness abort never masquerades as replay; named collision does one authoritative reread", async () => {
  const faultOwner = `f02-unique-${suffix}`;
  ownedUsers.push(faultOwner);
  await prisma.user.create({
    data: {
      id: faultOwner,
      name: "Fault Instructor",
      email: `${faultOwner}@example.test`,
      role: "INSTRUCTOR",
    },
  });
  const generated = await drafts.generate(faultOwner, topic);
  const traced = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
    log: [{ emit: "event", level: "query" }],
  });
  let keyReads = 0;
  traced.$on("query", (event) => {
    if (
      event.query.startsWith("SELECT") &&
      event.query.includes('"previewPublicationKey"')
    )
      keyReads++;
  });
  const module = createInstructorQuestions({ prisma: traced, logger });
  const input = {
    source: "preview" as const,
    previewKey: randomUUID(),
    generationId: generated.generation.id,
    topic,
    draft: fields,
    reviewConfirmed: true as const,
  };
  await module.publish(faultOwner, input);
  const constraint = `f02_unique_${suffix.replaceAll("-", "")}`;
  const trigger = `f02_named_${suffix.replaceAll("-", "")}`;
  try {
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX "${constraint}" ON "Exercise" (title) WHERE "authorId"='${faultOwner}'`,
    );
    keyReads = 0;
    await expect(
      module.publish(faultOwner, { ...input, previewKey: randomUUID() }),
    ).rejects.toMatchObject({ status: 503, mutationOutcome: "NOT_APPLIED" });
    expect(keyReads).toBe(1);
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."authorId"='${faultOwner}' AND NEW.title='Named fault' THEN RAISE EXCEPTION 'safe injected collision' USING ERRCODE='23505',CONSTRAINT='Exercise_authorId_previewPublicationKey_key'; END IF; RETURN NEW; END $$`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER "${trigger}" BEFORE INSERT ON "Exercise" FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`,
    );
    keyReads = 0;
    await expect(
      module.publish(faultOwner, {
        ...input,
        previewKey: randomUUID(),
        draft: { ...fields, title: "Named fault" },
      }),
    ).rejects.toMatchObject({ status: 503, mutationOutcome: "UNKNOWN" });
    expect(keyReads).toBe(2);
    expect(
      (
        await questions.listOwner(faultOwner, {
          status: "PUBLISHED",
          offset: 0,
        })
      ).questions,
    ).toHaveLength(1);
  } finally {
    await prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS "${trigger}" ON "Exercise"`,
    );
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${trigger}"()`);
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${constraint}"`);
    await traced.$disconnect();
  }
});

it("B17/B44 real PostgreSQL transport faults retain UNKNOWN for unavailable reread and committed acknowledgment loss", async () => {
  const trigger = `f02_transport_${suffix.replaceAll("-", "")}`;
  const generated = await drafts.generate(owner, topic);
  await prisma.$executeRawUnsafe(
    `CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."authorId"='${owner}' AND NEW.title='F02_REREAD_FAULT' THEN RAISE EXCEPTION 'safe injected collision' USING ERRCODE='23505',CONSTRAINT='Exercise_authorId_previewPublicationKey_key'; END IF; RETURN NEW; END $$`,
  );
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER "${trigger}" BEFORE INSERT ON "Exercise" FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`,
    );
    for (const mode of ["reread", "commit"] as const) {
      const sockets = new Set<Socket>();
      let inserted = false,
        dropped = 0,
        keyReads = 0;
      const proxy = createServer((incoming) => {
        const upstream = createConnection({
          host: new URL(url).hostname,
          port: Number(new URL(url).port),
        });
        sockets.add(incoming);
        sockets.add(upstream);
        for (const socket of [incoming, upstream]) {
          socket.on("error", () => {
            incoming.destroy();
            upstream.destroy();
          });
          socket.on("close", () => sockets.delete(socket));
        }
        let clientBuffer = Buffer.alloc(0),
          serverBuffer = Buffer.alloc(0),
          startup = true;
        incoming.on("data", (data) => {
          clientBuffer = Buffer.concat([clientBuffer, data]);
          if (startup) {
            if (clientBuffer.length < 4) return;
            const length = clientBuffer.readInt32BE(0);
            if (clientBuffer.length < length) return;
            upstream.write(clientBuffer.subarray(0, length));
            clientBuffer = clientBuffer.subarray(length);
            startup = false;
          }
          while (clientBuffer.length >= 5) {
            const length = clientBuffer.readInt32BE(1) + 1;
            if (clientBuffer.length < length) return;
            const frame = clientBuffer.subarray(0, length);
            clientBuffer = clientBuffer.subarray(length);
            const kind = String.fromCharCode(frame[0]!);
            const payload = frame.subarray(5).toString("utf8");
            const sql =
              kind === "Q"
                ? payload
                : kind === "P"
                  ? payload.slice(payload.indexOf("\0") + 1)
                  : "";
            if (sql.startsWith("INSERT INTO") && sql.includes('"Exercise"'))
              inserted = true;
            if (
              sql.startsWith("SELECT") &&
              sql.includes('"previewPublicationKey"')
            ) {
              keyReads++;
              if (mode === "reread" && inserted) {
                dropped++;
                incoming.destroy();
                upstream.destroy();
                return;
              }
            }
            upstream.write(frame);
          }
        });
        upstream.on("data", (data) => {
          serverBuffer = Buffer.concat([serverBuffer, data]);
          while (serverBuffer.length >= 5) {
            const length = serverBuffer.readInt32BE(1) + 1;
            if (serverBuffer.length < length) return;
            const frame = serverBuffer.subarray(0, length);
            serverBuffer = serverBuffer.subarray(length);
            if (
              mode === "commit" &&
              inserted &&
              frame[0] === 67 &&
              frame.subarray(5).toString() === "COMMIT\0"
            ) {
              // PostgreSQL has committed; withhold its actual completion frame.
              dropped++;
              incoming.destroy();
              upstream.destroy();
              return;
            }
            incoming.write(frame);
          }
        });
      });
      await new Promise<void>((resolve) =>
        proxy.listen(0, "127.0.0.1", resolve),
      );
      const address = proxy.address();
      if (!address || typeof address === "string")
        throw new Error("Missing proxy port");
      const proxyUrl = new URL(url);
      proxyUrl.port = String(address.port);
      const faultClient = new PrismaClient({
        adapter: new PrismaPg({
          connectionString: testDatabaseUrl(proxyUrl.toString()),
          max: 1,
        }),
      });
      const faultModule = createInstructorQuestions({
        prisma: faultClient,
        logger,
      });
      const title =
        mode === "reread" ? "F02_REREAD_FAULT" : "F02_COMMIT_AUTHORITY";
      const input = {
        source: "preview" as const,
        previewKey: randomUUID(),
        generationId: generated.generation.id,
        topic,
        draft: { ...fields, title },
        reviewConfirmed: true as const,
      };
      try {
        await expect(faultModule.publish(owner, input)).rejects.toMatchObject({
          status: 503,
          mutationOutcome: "UNKNOWN",
        });
        expect(dropped).toBe(1);
        if (mode === "reread") {
          expect(keyReads).toBe(2);
          await prisma.$executeRawUnsafe(
            `DROP TRIGGER "${trigger}" ON "Exercise"`,
          );
        }
        const resolved = await questions.publish(owner, input);
        expect(resolved.outcome).toBe(
          mode === "commit" ? "existing" : "published",
        );
        expect(resolved.question.title).toBe(title);
      } finally {
        await faultClient.$disconnect();
        for (const socket of sockets) socket.destroy();
        await new Promise<void>((resolve, reject) =>
          proxy.close((error) => (error ? reject(error) : resolve())),
        );
      }
    }
  } finally {
    await prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS "${trigger}" ON "Exercise"`,
    );
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${trigger}"()`);
  }
}, 20000);

it("B10/B25/B37 concurrent actual Remove retains referenced content and invokes no external generation or hints", async () => {
  const learner = `f02-reference-learner-${suffix}`;
  ownedUsers.push(learner);
  await prisma.user.create({
    data: {
      id: learner,
      name: "Reference learner",
      email: `${learner}@example.test`,
      role: "LEARNER",
    },
  });
  const provider = new FakeAiProvider();
  const generationCalls = vi.spyOn(provider, "generateQuestion");
  const hintCalls = vi.spyOn(provider, "generateHint");
  const isolatedDrafts = createInstructorDrafts({
    prisma,
    logger,
    config,
    provider,
  });
  const generation = await isolatedDrafts.generate(owner, topic);
  const countsBefore = {
    generation: generationCalls.mock.calls.length,
    hint: hintCalls.mock.calls.length,
  };
  // Structural cardinality evidence around Save/Publish, before reference fixtures.
  const sideEffectCounts = async () => ({
    attempts: await prisma.attempt.count({
      where: { exerciseVersion: { exercise: { authorId: owner } } },
    }),
    hints: await prisma.hintStage.count({
      where: { exerciseVersion: { exercise: { authorId: owner } } },
    }),
    usage: await prisma.aiUsageEvent.count({ where: { userId: owner } }),
  });
  const sideEffectsBefore = await sideEffectCounts();
  const saved = await isolatedDrafts.save(owner, {
    topic,
    draft: fields,
    generationId: generation.generation.id,
  });
  const opened = (await questions.getOwner(owner, saved.draft.id)).question;
  await questions.saveChanges(owner, opened.id, {
    topic,
    draft: { ...fields, title: "Referenced publication" },
    expectedRevision: 0,
  });
  const published = await questions.publish(owner, {
    source: "saved",
    id: opened.id,
    topic,
    draft: { ...fields, title: "Referenced publication" },
    expectedRevision: 1,
    reviewConfirmed: true,
  });
  expect(await sideEffectCounts()).toEqual(sideEffectsBefore);
  // Structural fixtures deliberately attach existing references before Remove.
  const attempt = await prisma.attempt.create({
    data: {
      learnerId: learner,
      exerciseVersionId: opened.versionId,
      proposedCode: "print(1)",
      reasoning: "Synthetic retained reference",
    },
  });
  const review = await prisma.review.create({
    data: {
      attemptId: attempt.id,
      instructorId: other,
      decision: "APPROVED",
      comment: "Synthetic retained review",
    },
  });
  const hint = await prisma.hintStage.create({
    data: {
      exerciseVersionId: opened.versionId,
      stage: 1,
      title: "Existing hint",
      content: "F02_PRIVATE_HINT",
    },
  });
  const referenceCounts = async () => ({
    attempts: await prisma.attempt.count({
      where: { exerciseVersionId: opened.versionId },
    }),
    hints: await prisma.hintStage.count({
      where: { exerciseVersionId: opened.versionId },
    }),
    usage: await prisma.aiUsageEvent.count({ where: { userId: owner } }),
  });
  const structuralBefore = await referenceCounts();
  try {
    const [first, second] = await Promise.all([
      questions.remove(owner, opened.id, { confirmed: true }),
      competitor.remove(owner, opened.id, { confirmed: true }),
    ]);
    expect(first).toEqual(second);
    expect(first.question).toEqual({
      ...published.question,
      status: "ARCHIVED",
      archivedAt: expect.any(String),
    });
    expect(await competitor.getOwner(owner, opened.id)).toEqual(first);
    expect(
      await questions.remove(owner, opened.id, { confirmed: true }),
    ).toEqual(first);
    await expect(questions.getPublished(opened.id)).rejects.toMatchObject({
      status: 404,
    });
    await questions.listPublished({ offset: 0 });
    await questions.listOwner(owner, { status: "ARCHIVED", offset: 0 });
    expect({
      generation: generationCalls.mock.calls.length,
      hint: hintCalls.mock.calls.length,
    }).toEqual(countsBefore);
    // Structural FK/cardinality evidence, separate from public availability above.
    expect(await referenceCounts()).toEqual(structuralBefore);
    expect(
      await prisma.attempt.findUnique({ where: { id: attempt.id } }),
    ).toMatchObject({
      exerciseVersionId: opened.versionId,
      learnerId: learner,
    });
    expect(
      await prisma.review.findUnique({ where: { id: review.id } }),
    ).toMatchObject({ attemptId: attempt.id, instructorId: other });
    expect(
      await prisma.hintStage.findUnique({ where: { id: hint.id } }),
    ).toMatchObject({
      exerciseVersionId: opened.versionId,
      content: "F02_PRIVATE_HINT",
    });
    expect(
      await prisma.exerciseVersion.findUnique({
        where: { id: opened.versionId },
      }),
    ).toMatchObject({ exerciseId: opened.id });
  } finally {
    await prisma.review.deleteMany({ where: { id: review.id } });
    await prisma.attempt.deleteMany({ where: { id: attempt.id } });
    await prisma.hintStage.deleteMany({ where: { id: hint.id } });
  }
});

async function freshAuthenticatedComposition(email: string, register = false) {
  const freshClient = client();
  const freshAuth = createDebugClinicAuth(config, freshClient, async () => {});
  const freshQuestions = createInstructorQuestions({
    prisma: freshClient,
    logger,
  });
  const freshApp = createApp({
    config,
    database: freshClient,
    auth: freshAuth,
    logger,
    instructorQuestions: freshQuestions,
    instructorDrafts: createInstructorDrafts({
      prisma: freshClient,
      logger,
      config,
      provider: new FakeAiProvider(),
    }),
    profileUpdater: async () => {
      throw new Error("Unused");
    },
  });
  const password = "F02-durable-synthetic-password-12345";
  try {
    if (register) {
      await request(freshApp)
        .post("/api/auth/sign-up/email")
        .set("origin", config.appOrigin)
        .send({
          name: "Durable Instructor",
          email,
          password,
          registrationRole: "INSTRUCTOR",
        })
        .expect(200);
      const registered = await freshClient.user.findUniqueOrThrow({
        where: { email },
      });
      ownedUsers.push(registered.id);
      await freshClient.user.update({
        where: { id: registered.id },
        data: { emailVerified: true },
      });
    }
    const signIn = await request(freshApp)
      .post("/api/auth/sign-in/email")
      .set("origin", config.appOrigin)
      .send({ email, password })
      .expect(200);
    const cookie = (signIn.headers["set-cookie"] as unknown as string[])
      .map((value) => value.split(";")[0])
      .join("; ");
    const principal = await request(freshApp)
      .get("/api/v1/me")
      .set("cookie", cookie)
      .expect(200);
    let closed = false;
    return {
      app: freshApp,
      module: freshQuestions,
      ownerId: principal.body.user.id as string,
      cookie,
      close: async () => {
        if (closed) return;
        closed = true;
        try {
          await request(freshApp)
            .post("/api/auth/sign-out")
            .set("origin", config.appOrigin)
            .set("cookie", cookie)
            .send({})
            .expect(200);
        } finally {
          await freshClient.$disconnect();
        }
      },
    };
  } catch (error) {
    await freshClient.$disconnect();
    throw error;
  }
}

it("B26 definite real SQL Remove rollback preserves public availability and retry archives", async () => {
  const draft = await fresh();
  const published = await questions.publish(owner, {
    source: "saved",
    id: draft.id,
    topic,
    draft: fields,
    expectedRevision: 0,
    reviewConfirmed: true,
  });
  const publicBefore = await questions.getPublished(draft.id);
  const trigger = `f02_remove_abort_${suffix.replaceAll("-", "")}`;
  await prisma.$executeRawUnsafe(
    `CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${draft.id}' AND NEW.status='ARCHIVED' THEN RAISE EXCEPTION 'safe removal abort' USING ERRCODE='23514'; END IF; RETURN NEW; END $$`,
  );
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER "${trigger}" BEFORE UPDATE ON "Exercise" FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`,
    );
    await expect(
      questions.remove(owner, draft.id, { confirmed: true }),
    ).rejects.toMatchObject({ status: 503, mutationOutcome: "NOT_APPLIED" });
    expect(await questions.getOwner(owner, draft.id)).toEqual({
      question: published.question,
    });
    expect(await questions.getPublished(draft.id)).toEqual(publicBefore);
    await prisma.$executeRawUnsafe(`DROP TRIGGER "${trigger}" ON "Exercise"`);
    const removed = await questions.remove(owner, draft.id, {
      confirmed: true,
    });
    expect(removed.question).toEqual({
      ...published.question,
      status: "ARCHIVED",
      archivedAt: expect.any(String),
    });
    await expect(questions.getPublished(draft.id)).rejects.toMatchObject({
      status: 404,
    });
  } finally {
    await prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS "${trigger}" ON "Exercise"`,
    );
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${trigger}"()`);
  }
});

it("B26/B37 lost actual Remove COMMIT acknowledgment resolves original archive through fresh authenticated composition", async () => {
  const email = `f02-remove-durable-${suffix}@example.test`;
  const first = await freshAuthenticatedComposition(email, true);
  const sessions = [first];
  const sockets = new Set<Socket>();
  let dropped = 0;
  const proxy = createServer((incoming) => {
    const upstream = createConnection({
      host: new URL(url).hostname,
      port: Number(new URL(url).port),
    });
    sockets.add(incoming);
    sockets.add(upstream);
    for (const socket of [incoming, upstream]) {
      socket.on("error", () => {
        incoming.destroy();
        upstream.destroy();
      });
      socket.on("close", () => sockets.delete(socket));
    }
    incoming.pipe(upstream);
    let buffered = Buffer.alloc(0);
    upstream.on("data", (data) => {
      buffered = Buffer.concat([buffered, data]);
      while (buffered.length >= 5) {
        const length = buffered.readInt32BE(1) + 1;
        if (buffered.length < length) return;
        const frame = buffered.subarray(0, length);
        buffered = buffered.subarray(length);
        if (frame[0] === 67 && frame.subarray(5).toString() === "COMMIT\0") {
          // The database completed COMMIT; withhold its actual acknowledgment.
          dropped++;
          incoming.destroy();
          upstream.destroy();
          return;
        }
        incoming.write(frame);
      }
    });
  });
  await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  const address = proxy.address();
  if (!address || typeof address === "string")
    throw new Error("Missing proxy port");
  const proxyUrl = new URL(url);
  proxyUrl.port = String(address.port);
  const faultClient = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: testDatabaseUrl(proxyUrl.toString()),
      max: 1,
    }),
  });
  try {
    const generation = await drafts.generate(first.ownerId, topic);
    const publication = await first.module.publish(first.ownerId, {
      source: "preview",
      previewKey: randomUUID(),
      generationId: generation.generation.id,
      topic,
      draft: fields,
      reviewConfirmed: true,
    });
    const faultModule = createInstructorQuestions({
      prisma: faultClient,
      logger,
    });
    await expect(
      faultModule.remove(first.ownerId, publication.question.id, {
        confirmed: true,
      }),
    ).rejects.toMatchObject({ status: 503, mutationOutcome: "UNKNOWN" });
    expect(dropped).toBe(1);
    const authority = await questions.getOwner(
      first.ownerId,
      publication.question.id,
    );
    expect(authority.question).toEqual({
      ...publication.question,
      status: "ARCHIVED",
      archivedAt: expect.any(String),
    });
    await first.close();
    const second = await freshAuthenticatedComposition(email);
    sessions.push(second);
    const path = `/api/v1/instructor/questions/${publication.question.id}`;
    const restored = await request(second.app)
      .get(path)
      .set("cookie", second.cookie)
      .expect(200);
    expect(restored.body).toEqual(authority);
    const replay = await request(second.app)
      .post(`${path}/remove`)
      .set("cookie", second.cookie)
      .set("origin", config.appOrigin)
      .send({ confirmed: true })
      .expect(200);
    expect(replay.body).toEqual(authority);
    await expect(
      questions.getPublished(publication.question.id),
    ).rejects.toMatchObject({ status: 404 });
  } finally {
    await faultClient.$disconnect();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) =>
      proxy.close((error) => (error ? reject(error) : resolve())),
    );
    for (const session of sessions) await session.close();
  }
}, 20000);

it("B37 same saved, published and archived authority survives new real sessions and app/client compositions", async () => {
  const email = `f02-states-durable-${suffix}@example.test`;
  const first = await freshAuthenticatedComposition(email, true);
  const sessions = [first];
  try {
    const generated = await request(first.app)
      .post("/api/v1/instructor/questions/generate")
      .set("origin", config.appOrigin)
      .set("cookie", first.cookie)
      .send({ topic })
      .expect(200);
    const saved = await request(first.app)
      .post("/api/v1/instructor/drafts")
      .set("origin", config.appOrigin)
      .set("cookie", first.cookie)
      .send({
        topic,
        draft: fields,
        generationId: generated.body.generation.id,
      })
      .expect(201);
    const path = `/api/v1/instructor/questions/${saved.body.draft.id}`;
    const changed = await request(first.app)
      .patch(path)
      .set("origin", config.appOrigin)
      .set("cookie", first.cookie)
      .send({
        topic,
        draft: { ...fields, title: "Durable reviewed edits" },
        expectedRevision: 0,
      })
      .expect(200);
    await first.close();
    const second = await freshAuthenticatedComposition(email);
    sessions.push(second);
    expect(
      (
        await request(second.app)
          .get(path)
          .set("cookie", second.cookie)
          .expect(200)
      ).body,
    ).toEqual(changed.body);
    const published = await request(second.app)
      .post("/api/v1/instructor/questions/publish")
      .set("origin", config.appOrigin)
      .set("cookie", second.cookie)
      .send({
        source: "saved",
        id: saved.body.draft.id,
        topic,
        draft: { ...fields, title: "Durable reviewed edits" },
        expectedRevision: 1,
        reviewConfirmed: true,
      })
      .expect(200);
    expect(published.body.question).toMatchObject({
      id: saved.body.draft.id,
      versionId: changed.body.question.versionId,
      revision: 2,
      status: "PUBLISHED",
    });
    await second.close();
    const third = await freshAuthenticatedComposition(email);
    sessions.push(third);
    expect(
      (
        await request(third.app)
          .get(path)
          .set("cookie", third.cookie)
          .expect(200)
      ).body,
    ).toEqual({ question: published.body.question });
    const removed = await request(third.app)
      .post(`${path}/remove`)
      .set("origin", config.appOrigin)
      .set("cookie", third.cookie)
      .send({ confirmed: true })
      .expect(200);
    await third.close();
    const fourth = await freshAuthenticatedComposition(email);
    sessions.push(fourth);
    expect(
      (
        await request(fourth.app)
          .get(path)
          .set("cookie", fourth.cookie)
          .expect(200)
      ).body,
    ).toEqual(removed.body);
    expect(removed.body.question).toEqual({
      ...published.body.question,
      status: "ARCHIVED",
      archivedAt: expect.any(String),
    });
    expect(
      (
        await request(fourth.app)
          .post(`${path}/remove`)
          .set("origin", config.appOrigin)
          .set("cookie", fourth.cookie)
          .send({ confirmed: true })
          .expect(200)
      ).body,
    ).toEqual(removed.body);
  } finally {
    for (const session of sessions) await session.close();
  }
}, 20000);
