import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { realpathSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readEnv } from "../apps/backend/src/config/env.js";
import { createPrismaClient } from "../apps/backend/src/db/client.js";

// Invoke an extracted Netlify packager artifact, never the source handler.
// This deliberately uses no SMTP/Google credentials and owns its synthetic data.
function verifiedEnvironment(): NodeJS.ProcessEnv {
  if (process.versions.node.split(".")[0] !== "24")
    throw new Error("Use Node 24 for packaged-function verification");
  const raw = process.env["TEST_DATABASE_URL"];
  if (!raw) throw new Error("Explicit TEST_DATABASE_URL is required");
  const target = new URL(raw);
  if (
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    !["localhost", "127.0.0.1"].includes(target.hostname) ||
    !/^\/[a-zA-Z0-9_]+_test$/.test(target.pathname) ||
    target.search ||
    target.hash
  )
    throw new Error(
      "Use an isolated loopback PostgreSQL database ending _test",
    );
  if (
    process.env["DATABASE_URL"] !== raw ||
    process.env["DATABASE_URL_POOLED"] !== raw
  )
    throw new Error("Explicit direct, pooled and test targets must match");
  return {
    ...process.env,
    NODE_ENV: "test",
    APP_ORIGIN: "http://127.0.0.1:5173",
    CORS_ORIGINS: "http://127.0.0.1:5173",
    BETTER_AUTH_URL: "http://127.0.0.1:5173",
    BETTER_AUTH_SECRET: "packaged-smoke-only-synthetic-secret-32-characters",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    OAUTH_PROXY_URL: "",
    OAUTH_PROXY_SECRET: "",
    SMTP_USER: "",
    SMTP_PASSWORD: "",
    EMAIL_FROM: "",
    AI_PROVIDER: "fake",
    SOC_LLM_ENDPOINT: "",
    SOC_LLM_API_KEY: "",
    SOC_LLM_MODEL: "",
    LOG_LEVEL: "silent",
    NETLIFY: "",
    SITE_ID: "",
    CONTEXT: "",
    NETLIFY_SITE_ID: "",
    NETLIFY_AUTH_TOKEN: "",
  };
}

type WebHandler = (request: Request) => Promise<Response>;

async function smoke(artifact: string): Promise<number> {
  const email = `package-${randomUUID()}@example.test`;
  const learnerEmail = `package-learner-${randomUUID()}@example.test`;
  const foreignEmail = `package-foreign-${randomUUID()}@example.test`;
  let step = "load packaged ESM export";
  try {
    const loaded: unknown = await import(pathToFileURL(artifact).href);
    if (
      !loaded ||
      typeof loaded !== "object" ||
      !("default" in loaded) ||
      typeof loaded.default !== "function"
    )
      throw new Error("Missing Web handler");
    const handler = loaded.default as WebHandler;
    const request = (
      path: string,
      body?: object | string,
      cookie?: string,
      method = body === undefined ? "GET" : "POST",
    ): Promise<Response> =>
      handler(
        new Request(`http://127.0.0.1:5173${path}`, {
          method,
          headers: {
            origin: "http://127.0.0.1:5173",
            ...(body === undefined
              ? {}
              : { "content-type": "application/json" }),
            ...(cookie ? { cookie } : {}),
          },
          ...(body === undefined
            ? {}
            : { body: typeof body === "string" ? body : JSON.stringify(body) }),
        }),
      );
    const expectStatus = (response: Response, status: number) => {
      if (response.status !== status) throw new Error("Unexpected status");
    };

    step = "health";
    expectStatus(await request("/api/health"), 200);
    step = "real database readiness";
    expectStatus(await request("/api/ready"), 200);
    step = "anonymous protected access";
    expectStatus(await request("/api/v1/me"), 401);
    step = "explicit instructor registration";
    const signup = await request("/api/auth/sign-up/email", {
      name: "Packaged smoke instructor",
      email: `  ${email.toUpperCase()}  `,
      password: randomUUID(),
      registrationRole: "INSTRUCTOR",
    });
    expectStatus(signup, 200);
    const cookies = signup.headers.getSetCookie();
    if (!cookies.length) throw new Error("No auth cookie");
    const cookie = cookies.map((value) => value.split(";", 1)[0]).join("; ");
    step = "cookie roundtrip and canonical identity";
    const me = await request("/api/v1/me", undefined, cookie);
    expectStatus(me, 200);
    const current = (await me.json()) as {
      user?: { id?: string; email?: string; role?: string };
    };
    if (
      current.user?.email !== email ||
      current.user.role !== "INSTRUCTOR" ||
      !current.user.id
    )
      throw new Error("Incorrect persisted identity");
    step = "instructor authorization";
    expectStatus(
      await request("/api/v1/instructor/ping", undefined, cookie),
      200,
    );
    step = "wrong-role denial";
    expectStatus(
      await request("/api/v1/learner/dashboard", undefined, cookie),
      403,
    );
    step = "instructor generation in packaged composition";
    const generated = await request(
      "/api/v1/instructor/questions/generate",
      { topic: "Python lists and for loops" },
      cookie,
    );
    expectStatus(generated, 200);
    const preview = (await generated.json()) as {
      topic: string;
      draft: Record<string, string>;
      generation: { id: string; provider: string };
    };
    if (
      preview.generation.provider !== "fake" ||
      Object.keys(preview.draft).length !== 6
    )
      throw new Error("Incorrect packaged generation contract");
    step = "explicit draft persistence in packaged composition";
    const saved = await request(
      "/api/v1/instructor/drafts",
      {
        topic: preview.topic,
        draft: { ...preview.draft, title: "Packaged private draft" },
        generationId: preview.generation.id,
      },
      cookie,
    );
    expectStatus(saved, 201);
    const savedBody = (await saved.json()) as {
      draft: { id: string; status: string; title: string };
    };
    if (
      savedBody.draft.status !== "DRAFT" ||
      savedBody.draft.title !== "Packaged private draft"
    )
      throw new Error("Incorrect packaged persistence contract");
    step = "packaged owner list and read-only retrieval";
    const list = await request("/api/v1/instructor/drafts", undefined, cookie);
    expectStatus(list, 200);
    const listed = (await list.json()) as { drafts: { id: string }[] };
    if (!listed.drafts.some((draft) => draft.id === savedBody.draft.id))
      throw new Error("Packaged draft missing from owner list");
    expectStatus(
      await request(
        `/api/v1/instructor/drafts/${encodeURIComponent(savedBody.draft.id)}`,
        undefined,
        cookie,
      ),
      200,
    );
    step = "packaged current-edits publication without hints";
    const published = await request(
      "/api/v1/instructor/questions/publish",
      {
        source: "saved",
        id: savedBody.draft.id,
        expectedRevision: 0,
        topic: preview.topic,
        draft: { ...preview.draft, title: "Packaged reviewed publication" },
        reviewConfirmed: true,
      },
      cookie,
    );
    expectStatus(published, 200);
    const publication = (await published.json()) as {
      question: {
        id: string;
        versionId: string;
        status: string;
        title: string;
      };
      outcome: string;
    };
    if (
      publication.question.id !== savedBody.draft.id ||
      publication.question.status !== "PUBLISHED" ||
      publication.question.title !== "Packaged reviewed publication" ||
      publication.outcome !== "published"
    )
      throw new Error("Incorrect packaged publication");
    step = "packaged learner registration";
    const learnerSignup = await request("/api/auth/sign-up/email", {
      name: "Packaged smoke learner",
      email: learnerEmail,
      password: randomUUID(),
      registrationRole: "LEARNER",
    });
    expectStatus(learnerSignup, 200);
    const learnerCookie = learnerSignup.headers
      .getSetCookie()
      .map((value) => value.split(";", 1)[0])
      .join("; ");
    if (!learnerCookie) throw new Error("Missing learner cookie");
    step = "packaged public allowlist";
    const learnerDetail = await request(
      `/api/v1/learner/questions/${encodeURIComponent(publication.question.id)}`,
      undefined,
      learnerCookie,
    );
    expectStatus(learnerDetail, 200);
    const publicBody = (await learnerDetail.json()) as {
      question: Record<string, unknown>;
    };
    const allowed = [
      "id",
      "versionId",
      "title",
      "topic",
      "instructorName",
      "publishedAt",
      "problemStatement",
      "buggyCode",
      "expectedBehavior",
    ].sort();
    if (
      JSON.stringify(Object.keys(publicBody.question).sort()) !==
        JSON.stringify(allowed) ||
      publicBody.question["title"] !== "Packaged reviewed publication" ||
      publicBody.question["versionId"] !== publication.question.versionId
    )
      throw new Error("Incorrect packaged public projection");
    step = "packaged final submission";
    const code = "def total(values):\n    return sum(values)\n";
    const reasoning = "Include every element.\n\nThe empty sum is zero.";
    const final = await request(
      `/api/v1/learner/questions/${encodeURIComponent(publication.question.id)}/attempt/submit`,
      { code, reasoning, expectedRevision: null },
      learnerCookie,
    );
    expectStatus(final, 200);
    const { attempt } = (await final.json()) as {
      attempt: { id: string; status: string; code: string; reasoning: string };
    };
    if (
      attempt.status !== "FINAL_SUBMITTED" ||
      attempt.code !== code ||
      attempt.reasoning !== reasoning
    )
      throw new Error("Incorrect packaged final snapshot");
    step = "packaged archive and subsequent learner denial";
    const removed = await request(
      `/api/v1/instructor/questions/${encodeURIComponent(publication.question.id)}/remove`,
      { confirmed: true },
      cookie,
    );
    expectStatus(removed, 200);
    const removedBody = (await removed.json()) as {
      question: { id: string; status: string };
    };
    if (
      removedBody.question.id !== publication.question.id ||
      removedBody.question.status !== "ARCHIVED"
    )
      throw new Error("Incorrect packaged archive");
    expectStatus(
      await request(
        `/api/v1/learner/questions/${encodeURIComponent(publication.question.id)}`,
        undefined,
        learnerCookie,
      ),
      404,
    );
    const learnerList = await request(
      "/api/v1/learner/questions",
      undefined,
      learnerCookie,
    );
    expectStatus(learnerList, 200);
    const publicList = (await learnerList.json()) as {
      questions: { id: string }[];
    };
    if (
      publicList.questions.some(
        (question) => question.id === publication.question.id,
      )
    )
      throw new Error("Archived question remains publicly listed");
    step = "packaged grading queue and archive detail";
    const submissionsPath = "/api/v1/instructor/submissions";
    const attemptId = encodeURIComponent(attempt.id);
    const queued = await request(submissionsPath, undefined, cookie);
    expectStatus(queued, 200);
    const queue = (await queued.json()) as {
      items: { attemptId: string; grade: unknown }[];
    };
    if (
      !queue.items.some(
        (item) => item.attemptId === attempt.id && item.grade === null,
      )
    )
      throw new Error("Packaged queue omitted the archived final");
    const gradingPath = `${submissionsPath}/${attemptId}`;
    const submission = await request(gradingPath, undefined, cookie);
    expectStatus(submission, 200);
    const detail = (await submission.json()) as {
      submission: {
        attemptId: string;
        code: string;
        reasoning: string;
        grade: unknown;
      };
    };
    if (
      detail.submission.attemptId !== attempt.id ||
      detail.submission.code !== code ||
      detail.submission.reasoning !== reasoning ||
      detail.submission.grade !== null
    )
      throw new Error("Packaged instructor snapshot differs");
    step = "packaged owner grade save";
    const savedGrade = await request(
      `${gradingPath}/grade`,
      { score: 8, expectedRevision: null },
      cookie,
      "PUT",
    );
    expectStatus(savedGrade, 200);
    const savedScore = (await savedGrade.json()) as {
      grade: { score: number; revision: number };
    };
    if (savedScore.grade.score !== 8 || savedScore.grade.revision !== 1)
      throw new Error("Incorrect packaged saved grade");
    step = "packaged private learner grade read";
    const resultPath = `/api/v1/learner/submissions/${attemptId}/grade`;
    const result = await request(resultPath, undefined, learnerCookie);
    expectStatus(result, 200);
    const compact = (await result.json()) as { grade: Record<string, unknown> };
    if (
      Object.keys(compact.grade).length !== 1 ||
      compact.grade["score"] !== 8 ||
      result.headers.get("cache-control") !== "private, no-store"
    )
      throw new Error("Incorrect packaged learner grade projection");
    step = "packaged foreign learner denial";
    const foreignSignup = await request("/api/auth/sign-up/email", {
      name: "Packaged foreign learner",
      email: foreignEmail,
      password: randomUUID(),
      registrationRole: "LEARNER",
    });
    expectStatus(foreignSignup, 200);
    const foreignCookie = foreignSignup.headers
      .getSetCookie()
      .map((value) => value.split(";", 1)[0])
      .join("; ");
    if (!foreignCookie) throw new Error("Missing foreign learner cookie");
    expectStatus(await request(resultPath, undefined, foreignCookie), 404);
    step = "signout";
    expectStatus(await request("/api/auth/sign-out", {}, cookie), 200);
    step = "revoked-cookie denial";
    expectStatus(await request("/api/v1/me", undefined, cookie), 401);
    step = "safe malformed auth body";
    const invalid = await request("/api/auth/sign-in/email", "{");
    if (invalid.status < 400 || invalid.status >= 500)
      throw new Error("Malformed auth body did not fail safely");
    process.stdout.write("Packaged ESM function: all smoke checks passed.\n");
    return 0;
  } catch (error) {
    // Neither dependency exceptions nor response bodies enter published evidence.
    process.stderr.write(`Packaged ESM function smoke failed at: ${step}.\n`);
    const code =
      error && typeof error === "object" && "code" in error
        ? error.code
        : undefined;
    if (
      typeof code === "string" &&
      [
        "ERR_MODULE_NOT_FOUND",
        "ERR_PACKAGE_PATH_NOT_EXPORTED",
        "ERR_REQUIRE_ESM",
      ].includes(code)
    )
      process.stderr.write(`Packaged module loader category: ${code}.\n`);
    return 1;
  } finally {
    // Construct cleanup access after exercising the artifact, so its startup
    // cannot accidentally reuse a source-created global Prisma client.
    const database = createPrismaClient(readEnv());
    try {
      const [gradeTable] = await database.$queryRaw<
        Array<{ present: boolean }>
      >`
        SELECT to_regclass('"AttemptGrade"') IS NOT NULL AS present
      `;
      if (gradeTable?.present)
        await database.$executeRaw`
          DELETE FROM "AttemptGrade" WHERE "attemptId" IN (
            SELECT a."id" FROM "Attempt" a JOIN "User" u ON u."id" = a."learnerId"
            WHERE u."email" = ${learnerEmail}
          )
        `;
      await database.aiUsageEvent.deleteMany({ where: { user: { email } } });
      await database.attempt.deleteMany({
        where: { learner: { email: learnerEmail } },
      });
      await database.exercise.deleteMany({ where: { author: { email } } });
      await database.user.deleteMany({
        where: { email: { in: [email, learnerEmail, foreignEmail] } },
      });
    } finally {
      await database.$disconnect();
    }
  }
}

async function main(): Promise<void> {
  const environment = verifiedEnvironment();
  // Apply isolation even if a caller inherited the internal worker marker.
  Object.assign(process.env, environment);
  const artifact = process.argv[2];
  if (
    !artifact ||
    !isAbsolute(artifact) ||
    !/\.(?:mjs|js)$/.test(artifact) ||
    !statSync(artifact).isFile()
  )
    throw new Error("Pass the absolute extracted packaged function .mjs path");
  const resolvedArtifact = realpathSync(artifact);
  if (process.env["DEBUGCLINIC_PACKAGE_SMOKE_CHILD"] === "1") {
    // The bundle owns a private pool with no public disconnect API. Its isolated
    // worker exits after requests settle and the controller cleans its fixtures.
    const result = await smoke(resolvedArtifact);
    process.exit(result);
  }
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), resolvedArtifact],
    {
      env: { ...environment, DEBUGCLINIC_PACKAGE_SMOKE_CHILD: "1" },
      encoding: "utf8",
      timeout: 60_000,
      windowsHide: true,
    },
  );
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.error || result.status !== 0)
    throw new Error("Packaged-function smoke worker failed or timed out");
}

try {
  await main();
} catch {
  process.stderr.write(
    "Packaged-function verification could not complete; check the explicit local environment, artifact and last reported step.\n",
  );
  process.exit(1);
}
