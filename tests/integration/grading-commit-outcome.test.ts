import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createConnection, createServer, type Socket } from "node:net";
import { PrismaPg } from "@prisma/adapter-pg";
import request from "supertest";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "../../generated/prisma/client.js";
import { createApp } from "../../apps/backend/src/app.js";
import { createDebugClinicAuth } from "../../apps/backend/src/auth/auth.js";
import { readEnv } from "../../apps/backend/src/config/env.js";
import { createGrading } from "../../apps/backend/src/exercises/grading.js";
import { createLogger } from "../../apps/backend/src/lib/logger.js";
import { cookies, post } from "../support/auth-fixture.js";
import { testDatabaseUrl } from "../support/database-target.js";

const databaseUrl = testDatabaseUrl();
if (
  process.env["DATABASE_URL"] !== databaseUrl ||
  process.env["DATABASE_URL_POOLED"] !== databaseUrl
)
  throw new Error("Explicit matching synthetic database targets required");
const origin = "http://127.0.0.1:5173";
const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: origin,
  CORS_ORIGINS: origin,
  DATABASE_URL: databaseUrl,
  DATABASE_URL_POOLED: databaseUrl,
  BETTER_AUTH_URL: origin,
  BETTER_AUTH_SECRET: "grading-transaction-fault-synthetic-secret-32",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "silent",
});
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const auth = createDebugClinicAuth(config, prisma, async () => {});
const logger = createLogger(config);
const ownedUserIds: string[] = [];
let ownerCookie = "";
let learnerCookie = "";
let attemptId = "";

async function signUp(role: "INSTRUCTOR" | "LEARNER") {
  const email = `grading-fault-${randomUUID()}@example.test`;
  const response = await post(auth, "/sign-up/email", {
    email,
    password: "Grading-fault-synthetic-password",
    name: `Grading fault ${role}`,
    registrationRole: role,
  });
  expect(response.status).toBe(200);
  const { id } = await prisma.user.findUniqueOrThrow({ where: { email } });
  ownedUserIds.push(id);
  const cookie = cookies(response);
  expect(cookie).not.toBe("");
  return { id, cookie };
}

function http(gradingClient: PrismaClient) {
  return request(
    createApp({
      config,
      database: prisma,
      auth,
      logger,
      grading: createGrading(gradingClient),
      profileUpdater: async () => {
        throw new Error("Unused");
      },
    }),
  );
}

beforeAll(async () => {
  const [target] = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT current_database() AS name`;
  expect(target?.name).toBe(new URL(databaseUrl).pathname.slice(1));
  const owner = await signUp("INSTRUCTOR");
  const learner = await signUp("LEARNER");
  ownerCookie = owner.cookie;
  learnerCookie = learner.cookie;
  const exercise = await prisma.exercise.create({
    data: {
      title: "Grade fault fixture",
      description: "Preserve the submitted answer.",
      authorId: owner.id,
      status: "PUBLISHED",
      publishedAt: new Date("2026-11-06T00:00:00.000Z"),
      versions: {
        create: {
          version: 1,
          buggyCode: "return 0",
          expectedBehavior: "Return 1.",
        },
      },
    },
    select: { versions: { select: { id: true } } },
  });
  const attempt = await prisma.attempt.create({
    data: {
      learnerId: learner.id,
      exerciseVersionId: exercise.versions[0]!.id,
      proposedCode: "return 1",
      reasoning: "Use the correct value.",
      status: "FINAL_SUBMITTED",
      finalSubmittedAt: new Date("2026-11-07T00:00:00.000Z"),
    },
  });
  attemptId = attempt.id;
});

afterAll(async () => {
  try {
    if (attemptId) {
      await prisma.attemptGrade.deleteMany({ where: { attemptId } });
      await prisma.attempt.deleteMany({ where: { id: attemptId } });
    }
    if (ownedUserIds.length) {
      await prisma.exercise.deleteMany({
        where: { authorId: { in: ownedUserIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: ownedUserIds } } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

async function dropAcknowledgement(command: "BEGIN" | "COMMIT", score: number) {
  const target = new URL(databaseUrl);
  const sockets = new Set<Socket>();
  let drops = 0;
  const proxy = createServer((incoming) => {
    const upstream = createConnection({
      host: target.hostname,
      port: Number(target.port || "5432"),
    });
    for (const [socket, peer] of [
      [incoming, upstream],
      [upstream, incoming],
    ] as const) {
      sockets.add(socket);
      socket.on("error", () => peer.destroy());
      socket.on("close", () => {
        sockets.delete(socket);
        peer.destroy();
      });
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
        // CommandComplete is emitted after the database executes the command.
        // Destroy the connection before sending that frame to the grade client.
        if (
          frame[0] === 67 &&
          frame.subarray(5).toString() === `${command}\0`
        ) {
          drops++;
          incoming.destroy();
          upstream.destroy();
          return;
        }
        incoming.write(frame);
      }
    });
  });
  const listening = once(proxy, "listening");
  proxy.listen(0, "127.0.0.1");
  await listening;
  const address = proxy.address();
  if (!address || typeof address === "string")
    throw new Error("Missing owned PostgreSQL proxy port");
  const proxyUrl = new URL(databaseUrl);
  proxyUrl.hostname = "127.0.0.1";
  proxyUrl.port = String(address.port);
  const faultClient = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: testDatabaseUrl(proxyUrl.toString()),
      ssl: false,
      max: 1,
    }),
  });
  try {
    const response = await http(faultClient)
      .put(`/api/v1/instructor/submissions/${attemptId}/grade`)
      .set("origin", origin)
      .set("cookie", ownerCookie)
      .send({ score, expectedRevision: null })
      .timeout({ deadline: 8_000 })
      .expect(503);
    expect(drops).toBe(1);
    return response.body as unknown;
  } finally {
    for (const socket of sockets) socket.destroy();
    await Promise.all([
      faultClient.$disconnect(),
      new Promise<void>((done, reject) => {
        proxy.close((error) => (error ? reject(error) : done()));
      }),
    ]);
  }
}

it("H05 distinguishes a pre-write PostgreSQL disconnect from lost COMMIT acknowledgement over cookie HTTP", async () => {
  const healthy = http(prisma);
  const read = () =>
    healthy
      .get(`/api/v1/learner/submissions/${attemptId}/grade`)
      .set("cookie", learnerCookie)
      .expect(200);

  const notApplied = await dropAcknowledgement("BEGIN", 7);
  expect(notApplied).toMatchObject({
    error: { code: "DEPENDENCY_UNAVAILABLE", mutationOutcome: "NOT_APPLIED" },
  });
  expect((await read()).body).toEqual({ grade: null });

  const unknown = await dropAcknowledgement("COMMIT", 8);
  expect(unknown).toMatchObject({
    error: { code: "DEPENDENCY_UNAVAILABLE", mutationOutcome: "UNKNOWN" },
  });
  expect((await read()).body).toEqual({ grade: { score: 8 } });

  const current = await healthy
    .get(`/api/v1/instructor/submissions/${attemptId}/grade`)
    .set("cookie", ownerCookie)
    .expect(200);
  expect(current.body).toEqual({
    grade: { score: 8, revision: 1, savedAt: expect.any(String) },
  });
}, 20_000);
