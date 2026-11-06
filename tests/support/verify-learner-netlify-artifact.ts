// Independent packaged learner acceptance. Invoke the extracted Web handler;
// no deployment, SMTP, external AI, or source handler substitution.
import { randomUUID } from "node:crypto";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import { testDatabaseUrl } from "./database-target.js";

const url = testDatabaseUrl();
if (
  process.versions.node.split(".")[0] !== "24" ||
  ["DATABASE_URL", "DATABASE_URL_POOLED", "E2E_TEST_DATABASE_URL"].some(
    (key) => process.env[key] !== url,
  )
)
  throw new Error("Node24 and identical explicit synthetic targets required");
const artifact = process.argv[2];
if (
  !artifact ||
  !isAbsolute(artifact) ||
  !artifact.endsWith("/netlify/functions/api.mjs")
)
  throw new Error("Pass the absolute extracted packaged Web function");
Object.assign(process.env, {
  NODE_ENV: "test",
  APP_ORIGIN: "http://127.0.0.1:5173",
  CORS_ORIGINS: "http://127.0.0.1:5173",
  BETTER_AUTH_URL: "http://127.0.0.1:5173",
  BETTER_AUTH_SECRET: "independent-package-synthetic-secret-at-least-32",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "silent",
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
  OAUTH_PROXY_URL: "",
  OAUTH_PROXY_SECRET: "",
  SMTP_USER: "",
  SMTP_PASSWORD: "",
  EMAIL_FROM: "",
  SOC_LLM_ENDPOINT: "",
  SOC_LLM_API_KEY: "",
  SOC_LLM_MODEL: "",
  NETLIFY: "",
  SITE_ID: "",
  CONTEXT: "",
  NETLIFY_SITE_ID: "",
  NETLIFY_AUTH_TOKEN: "",
});
const emails = ["instructor", "learner"].map(
  (role) => `lws-package-${role}-${randomUUID()}@example.test`,
);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
let step = "import extracted artifact",
  result = 1;
try {
  const { default: handler } = (await import(pathToFileURL(artifact).href)) as {
    default: (request: Request) => Promise<Response>;
  };
  const request = (path: string, method = "GET", body?: unknown, cookie = "") =>
    handler(
      new Request(`http://127.0.0.1:5173${path}`, {
        method,
        headers: {
          origin: "http://127.0.0.1:5173",
          cookie,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    );
  function check(value: unknown, message: string): asserts value {
    if (!value) throw new Error(message);
  }
  async function json(response: Response, expected = 200) {
    check(
      response.status === expected,
      `Expected ${expected}, received ${response.status}`,
    );
    return await response.json();
  }
  async function register(role: "INSTRUCTOR" | "LEARNER", email: string) {
    const response = await request("/api/auth/sign-up/email", "POST", {
      name: `Synthetic ${role}`,
      email,
      password: randomUUID(),
      registrationRole: role,
    });
    await json(response);
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";", 1)[0])
      .join("; ");
    check(cookie, "Cookie missing");
    return cookie;
  }
  step = "register real-cookie instructor and learner";
  const owner = await register("INSTRUCTOR", emails[0]!);
  const learner = await register("LEARNER", emails[1]!);
  step = "publish no-hint canonical question";
  const preview = await json(
    await request(
      "/api/v1/instructor/questions/generate",
      "POST",
      { topic: "Python lists" },
      owner,
    ),
  );
  const publication = await json(
    await request(
      "/api/v1/instructor/questions/publish",
      "POST",
      {
        source: "preview",
        previewKey: randomUUID(),
        generationId: preview.generation.id,
        topic: preview.topic,
        draft: preview.draft,
        reviewConfirmed: true,
      },
      owner,
    ),
  );
  const path = `/api/v1/learner/questions/${publication.question.id}/attempt`;
  step = "injected packaged attempt retrieval";
  check(
    (await json(await request(path, "GET", undefined, learner))).attempt ===
      null,
    "Expected own empty attempt",
  );
  step = "injected packaged save with exact code bytes";
  const input = {
    code: "def total(xs):\n    return sum(xs)\n",
    reasoning: "Include every value.",
    expectedRevision: null,
  };
  const saved = await json(await request(path, "PUT", input, learner));
  check(
    saved.attempt.code === input.code &&
      saved.attempt.revision === 0 &&
      saved.attempt.status === "DRAFT",
    "Incorrect save",
  );
  step = "injected packaged atomic finalization and identical retry";
  const finalInput = {
    ...input,
    code: "# final\n" + input.code,
    expectedRevision: 0,
  };
  const final = await json(
    await request(`${path}/submit`, "POST", finalInput, learner),
  );
  check(
    final.attempt.revision === 1 &&
      final.attempt.status === "FINAL_SUBMITTED" &&
      final.attempt.code === finalInput.code &&
      final.attempt.submittedAt,
    "Incorrect final",
  );
  check(
    JSON.stringify(
      await json(await request(`${path}/submit`, "POST", finalInput, learner)),
    ) === JSON.stringify(final),
    "Retry differs",
  );
  await json(
    await request(path, "PUT", { ...input, expectedRevision: 1 }, learner),
    409,
  );
  await json(await request(path, "GET", undefined, owner), 403);
  step = "archive denies packaged mutations and retains final identity";
  await json(
    await request(
      `/api/v1/instructor/questions/${publication.question.id}/remove`,
      "POST",
      { confirmed: true },
      owner,
    ),
  );
  await json(await request(path, "GET", undefined, learner), 404);
  await json(await request(path, "PUT", input, learner), 404);
  const stored = await prisma.attempt.findUniqueOrThrow({
    where: { id: final.attempt.id },
  });
  check(
    stored.status === "FINAL_SUBMITTED" &&
      stored.exerciseVersionId === publication.question.versionId &&
      stored.proposedCode === finalInput.code,
    "Reference or final changed",
  );
  process.stdout.write(
    "Independent packaged learner attempt wiring/save/final/retry/archive checks passed.\n",
  );
  result = 0;
} catch (error) {
  process.stderr.write(
    `Independent packaged learner check failed at ${step}: ${error instanceof Error ? error.message : "unknown failure"}\n`,
  );
} finally {
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  const ids = users.map((user) => user.id);
  await prisma.attempt.deleteMany({ where: { learnerId: { in: ids } } });
  await prisma.exercise.deleteMany({ where: { authorId: { in: ids } } });
  await prisma.aiUsageEvent.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
}
// The packaged module owns a private pool. This dedicated test process exits.
process.exit(result);
