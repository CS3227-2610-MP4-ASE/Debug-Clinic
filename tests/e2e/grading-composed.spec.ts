// Composed acceptance: real cookies, local PostgreSQL and captured auth mail.
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { readdir, readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test, type Browser, type Page } from "@playwright/test";
import type { LearnerAttempt } from "@debugclinic/contracts";
import { PrismaClient } from "../../generated/prisma/client.js";
import { createBrowserResponseLossProxy } from "../support/browser-response-loss-proxy.js";
import { testDatabaseUrl } from "../support/database-target.js";
import { f01Origin, f01Topic } from "../support/f01-fixtures.js";
import {
  expectPythonEditable,
  fillPythonCode,
} from "../support/python-editor.js";

const optedIn = process.env["E2E_AUTH_COMPLETION"] === "1";
test.skip(!optedIn, "Requires the isolated captured-outbox browser runtime");
test.use({ trace: "off", screenshot: "off" });
test.describe.configure({ timeout: 120_000 });

const channel = resolve(".workflow-state/browser-auth");
const emailRecipients: string[] = [];
const review =
  "I have reviewed this question and understand that published content cannot be edited.";
const code = "# submitted <grade-marker>\ndef total(xs):\n    return sum(xs)\n";
const reasoning =
  "The list includes all values.\n\nThe empty case yields zero.";
const password = "Grading-synthetic-browser-password-12345";
let prisma: PrismaClient | undefined;

test.beforeAll(async () => {
  if (!optedIn) return;
  const url = testDatabaseUrl();
  if (
    ["DATABASE_URL", "DATABASE_URL_POOLED", "E2E_TEST_DATABASE_URL"].some(
      (key) => process.env[key] !== url,
    )
  )
    throw new Error("Explicit matching synthetic grading targets required");
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  const [database] = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT current_database() AS name`;
  expect(database?.name).toBe(new URL(url).pathname.slice(1));
});

test.afterAll(async () => {
  if (!prisma) return;
  try {
    const users = await prisma.user.findMany({
      where: { email: { in: emailRecipients } },
      select: { id: true },
    });
    const ids = users.map(({ id }) => id);
    if (ids.length) {
      const [gradeTable] = await prisma.$queryRaw<Array<{ present: boolean }>>`
        SELECT to_regclass('"AttemptGrade"') IS NOT NULL AS present
      `;
      if (gradeTable?.present)
        await prisma.$executeRaw`
          DELETE FROM "AttemptGrade" WHERE "attemptId" IN
            (SELECT "id" FROM "Attempt" WHERE "learnerId" = ANY(${ids}))
        `;
      await prisma.attempt.deleteMany({ where: { learnerId: { in: ids } } });
      await prisma.exercise.deleteMany({ where: { authorId: { in: ids } } });
      await prisma.aiUsageEvent.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    const prefixes = emailRecipients.map(mailPrefix);
    if (prefixes.length)
      for (const file of await readdir(channel))
        if (prefixes.some((prefix) => file.startsWith(prefix)))
          await unlink(resolve(channel, file));
  } finally {
    await prisma.$disconnect();
    prisma = undefined;
  }
});

function mailPrefix(email: string) {
  return `mail-${createHash("sha256").update(email).digest("hex")}-`;
}

async function register(
  page: Page,
  role: "Instructor" | "Learner",
  name = `Grading ${role}`,
) {
  const email = `grading-${randomUUID()}@example.test`;
  emailRecipients.push(email);
  const response = await page.request.post("/api/auth/sign-up/email", {
    headers: { origin: f01Origin },
    data: { name, email, password, registrationRole: role.toUpperCase() },
  });
  expect(response.status()).toBe(200);
  let verification = "";
  await expect
    .poll(async () => {
      const files = await readdir(channel);
      for (const file of files.filter((entry) =>
        entry.startsWith(mailPrefix(email)),
      )) {
        const message = JSON.parse(
          await readFile(resolve(channel, file), "utf8"),
        ) as {
          subject: string;
          text: string;
        };
        if (message.subject.includes("Verify")) {
          verification = message.text.match(/https?:\/\/\S+/)?.[0] ?? "";
          return verification !== "";
        }
      }
      return false;
    })
    .toBe(true);
  expect(new URL(verification).origin).toBe(f01Origin);
  await page.goto(verification);
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${role.toLowerCase()}$`));
}

async function publish(page: Page) {
  await page.goto("/instructor/questions/new");
  await page.getByRole("textbox", { name: /Python topic/ }).fill(f01Topic);
  const generated = page.waitForResponse(
    "**/api/v1/instructor/questions/generate",
  );
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  expect((await generated).status()).toBe(200);
  const title = `Grading ${randomUUID()}`;
  const titleField = page.getByRole("textbox", { name: /^Title/ });
  await expect(titleField).not.toHaveValue("");
  await titleField.fill(title);
  await page.getByRole("checkbox", { name: review }).check();
  const published = page.waitForResponse(
    "**/api/v1/instructor/questions/publish",
  );
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const response = await published;
  expect(response.status()).toBe(200);
  const { question } = (await response.json()) as {
    question: {
      id: string;
      title: string;
      problemStatement: string;
      expectedBehavior: string;
    };
  };
  expect(question.title).toBe(title);
  return question;
}

async function finalize(page: Page, questionId: string, saveDraft = false) {
  await page.goto(`/learner/questions/${questionId}`);
  const editor = page.getByRole("textbox", { name: "Your Python 3 code" });
  await expectPythonEditable(editor, true);
  await fillPythonCode(editor, code);
  await page
    .getByRole("textbox", { name: "Explain your reasoning" })
    .fill(reasoning);
  if (saveDraft) {
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/questions/${questionId}/attempt`) &&
        response.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    expect((await saved).status()).toBe(200);
  }
  page.once("dialog", (dialog) => dialog.accept());
  const submitted = page.waitForResponse("**/attempt/submit");
  await page.getByRole("button", { name: "Submit final attempt" }).click();
  const response = await submitted;
  expect(response.status()).toBe(200);
  const { attempt } = (await response.json()) as { attempt: LearnerAttempt };
  expect(attempt).toMatchObject({ status: "FINAL_SUBMITTED", code, reasoning });
  await expectPythonEditable(editor, false);
  return attempt;
}

async function archive(page: Page, questionId: string) {
  const removed = page.waitForResponse(
    `**/api/v1/instructor/questions/${questionId}/remove`,
  );
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  expect((await removed).status()).toBe(200);
  await expect(
    page.getByText("Removed. Your read-only record is retained.", {
      exact: true,
    }),
  ).toBeVisible();
}

async function openFromDashboard(
  page: Page,
  role: "instructor" | "learner",
  title: string,
  graded = false,
) {
  await page.goto(`/${role}`);
  await page
    .getByRole("link", {
      name: role === "instructor" ? "Submissions" : "My submissions",
      exact: true,
    })
    .click();
  if (role === "instructor") {
    const tab = page.getByRole("tab", {
      name: graded ? "Graded" : "Awaiting grade",
      exact: true,
    });
    if (graded) await tab.press("Enter");
    await expect(tab).toHaveAttribute("aria-selected", "true");
  }
  await page.getByRole("link", { name: new RegExp(title) }).click();
}

const gradeInput = (page: Page) =>
  page.getByRole("textbox", { name: /score/i });
const saveGrade = (page: Page) =>
  page.getByRole("button", { name: "Save grade", exact: true });
const visibleGrade = (page: Page, score: number | null) =>
  page.getByText(score === null ? "Awaiting grade" : `${score}/10`, {
    exact: true,
  });
const instructorGradePath = (attemptId: string) =>
  `/api/v1/instructor/submissions/${attemptId}/grade`;
const learnerGradePath = (attemptId: string) =>
  `/api/v1/learner/submissions/${attemptId}/grade`;

async function assertSnapshot(page: Page, attempt: LearnerAttempt) {
  await expect(page.getByText(attempt.code, { exact: true })).toHaveJSProperty(
    "textContent",
    attempt.code,
  );
  await expect(
    page.getByText(attempt.reasoning, { exact: true }),
  ).toHaveJSProperty("textContent", attempt.reasoning);
}

async function newLearner(browser: Browser) {
  const context = await browser.newContext({ baseURL: f01Origin });
  const page = await context.newPage();
  try {
    await register(page, "Learner");
    return page;
  } catch (error) {
    await context.close();
    throw error;
  }
}

async function startProxy(
  probe: NonNullable<Parameters<typeof createBrowserResponseLossProxy>[2]>,
) {
  const proxy = createBrowserResponseLossProxy(
    new URL(f01Origin),
    async () => false,
    probe,
  );
  const listening = once(proxy, "listening");
  proxy.listen(0, "127.0.0.1");
  await listening;
  const address = proxy.address();
  if (!address || typeof address === "string")
    throw new Error("Owned grading proxy did not bind");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((done, reject) =>
        proxy.close((error) => (error ? reject(error) : done())),
      ),
  };
}

test("C01 actual dashboards and workspace carry one immutable final through first grade and correction", async ({
  page: instructor,
  browser,
}) => {
  await register(instructor, "Instructor");
  const learner = await newLearner(browser);
  try {
    const question = await publish(instructor);
    const attempt = await finalize(learner, question.id, true);
    await expect(visibleGrade(learner, null)).toBeVisible();
    await openFromDashboard(instructor, "instructor", question.title);
    await expect(
      instructor.getByText("Learner: Grading Learner", { exact: true }),
    ).toBeVisible();
    await expect(
      instructor.getByText(question.problemStatement, { exact: true }),
    ).toBeVisible();
    await expect(
      instructor.getByText(question.expectedBehavior, { exact: true }),
    ).toBeVisible();
    await assertSnapshot(instructor, attempt);
    for (const [score, revision] of [
      [1, null],
      [10, 1],
    ] as const) {
      await gradeInput(instructor).fill(String(score));
      const saved = instructor.waitForResponse(
        (response) =>
          response.url().endsWith(instructorGradePath(attempt.id)) &&
          response.request().method() === "PUT",
      );
      await saveGrade(instructor).click();
      const response = await saved;
      expect(response.request().postDataJSON()).toEqual({
        score,
        expectedRevision: revision,
      });
      expect(response.status()).toBe(200);
      await expect(visibleGrade(instructor, score)).toBeVisible();
    }
    await openFromDashboard(learner, "learner", question.title);
    await expect(visibleGrade(learner, 10)).toBeVisible();
    await assertSnapshot(learner, attempt);
    await learner.goto(`/learner/questions/${question.id}`);
    await expect(visibleGrade(learner, 10)).toBeVisible();
    const path = `/api/v1/learner/questions/${question.id}/attempt`;
    const current = await learner.request.get(path);
    expect(current.status()).toBe(200);
    expect(await current.json()).toEqual({ attempt });
    await expectPythonEditable(
      learner.getByRole("textbox", { name: "Your Python 3 code" }),
      false,
    );
  } finally {
    await learner.context().close();
  }
});

test("C03 a real committed PUT loses its reply, then an explicit check resolves without a second write", async ({
  page: instructor,
  browser,
}) => {
  await register(instructor, "Instructor");
  const learner = await newLearner(browser);
  try {
    const question = await publish(instructor);
    const attempt = await finalize(learner, question.id);
    await openFromDashboard(instructor, "instructor", question.title);
    const path = instructorGradePath(attempt.id);
    let commits = 0;
    const proxy = await startProxy({
      attemptId: attempt.id,
      dropFirstCommittedReply: true,
      committed: () => {
        commits++;
      },
    });
    const events: string[] = [];
    try {
      await instructor.route(`**${path}`, async (route) => {
        const method = route.request().method();
        events.push(method);
        if (method === "PUT") {
          try {
            const response = await route.fetch({
              url: `${proxy.origin}${path}`,
              maxRetries: 0,
              timeout: 8_000,
            });
            await route.fulfill({ response });
          } catch {
            await route.abort("connectionreset");
          }
          return;
        }
        if (events.length === 2) {
          await route.fulfill({
            status: 503,
            json: {
              error: {
                code: "DEPENDENCY_UNAVAILABLE",
                message: "Synthetic read unavailable",
                requestId: "grading-recovery",
              },
            },
          });
          return;
        }
        await route.continue();
      });
      await gradeInput(instructor).fill("8");
      await saveGrade(instructor).click();
      await expect(
        instructor.getByText("Grade outcome could not be confirmed.", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(gradeInput(instructor)).toHaveValue("8");
      await expect(
        saveGrade(instructor).and(instructor.locator(":enabled")),
      ).toHaveCount(0);
      expect(events).toEqual(["PUT", "GET"]);
      expect(commits).toBe(1);
      const fresh = await learner.request.get(learnerGradePath(attempt.id));
      expect(fresh.status()).toBe(200);
      expect(await fresh.json()).toEqual({ grade: { score: 8 } });
      await instructor
        .getByRole("button", { name: "Check grade again", exact: true })
        .press("Enter");
      await expect(visibleGrade(instructor, 8)).toBeVisible();
      expect(events).toEqual(["PUT", "GET", "GET"]);
      expect(commits).toBe(1);
    } finally {
      await proxy.close();
    }
  } finally {
    await learner.context().close();
  }
});

for (const entry of [
  "published question",
  "live private result",
  "archived private result",
] as const) {
  test(`C04 ${entry} renders first and corrected scores within 15 seconds without refresh`, async ({
    page: instructor,
    browser,
  }, info) => {
    await register(instructor, "Instructor");
    const learner = await newLearner(browser);
    try {
      const question = await publish(instructor);
      const attempt = await finalize(learner, question.id);
      if (entry === "archived private result") {
        await archive(instructor, question.id);
        await openFromDashboard(instructor, "instructor", question.title);
        await assertSnapshot(instructor, attempt);
        await expect(visibleGrade(instructor, null)).toBeVisible();
      }
      if (entry !== "published question") {
        await openFromDashboard(learner, "learner", question.title);
        await assertSnapshot(learner, attempt);
      }
      await expect(visibleGrade(learner, null)).toBeVisible();
      const gradePath = learnerGradePath(attempt.id);
      const triggers: string[] = [];
      await learner.exposeFunction(
        "recordGradingTimingTrigger",
        (name: string) => triggers.push(name),
      );
      await learner.evaluate(() => {
        const report = (name: string) => {
          if (
            "recordGradingTimingTrigger" in window &&
            typeof window.recordGradingTimingTrigger === "function"
          )
            void window.recordGradingTimingTrigger(name);
        };
        document.addEventListener("visibilitychange", () =>
          report("visibilitychange"),
        );
        for (const event of ["focus", "online", "offline", "pagehide"])
          window.addEventListener(event, () => report(event));
      });
      let sent = 0;
      let committed = 0;
      const proxy = await startProxy({
        attemptId: attempt.id,
        beforeForward: (at) => {
          sent = at;
        },
        committed: (at) => {
          committed = at;
        },
      });
      try {
        for (const [previous, score, revision] of [
          [null, 6, null],
          [6, 8, 1],
        ] as const) {
          await expect(visibleGrade(learner, previous)).toBeVisible();
          expect(await learner.evaluate(() => document.visibilityState)).toBe(
            "visible",
          );
          const oldRead = await learner.waitForResponse(
            (response) =>
              response.url().endsWith(gradePath) &&
              response.request().method() === "GET",
            { timeout: 15_000 },
          );
          expect(oldRead.status()).toBe(200);
          expect(await oldRead.json()).toEqual({
            grade: previous === null ? null : { score: previous },
          });
          sent = 0;
          committed = 0;
          const saved = await instructor.request.put(
            `${proxy.origin}${instructorGradePath(attempt.id)}`,
            {
              headers: { origin: f01Origin },
              data: { score, expectedRevision: revision },
            },
          );
          expect(saved.status()).toBe(200);
          expect(committed).toBeGreaterThan(sent);
          expect(sent).toBeGreaterThan(0);
          let rendered = false;
          try {
            await expect(visibleGrade(learner, score)).toBeVisible({
              timeout: 16_000,
            });
            rendered = true;
          } finally {
            const observed = performance.now();
            await info.attach(`grade-${score}-timing`, {
              body: JSON.stringify({
                entry,
                previous,
                score,
                responseStatus: saved.status(),
                rendered,
                preForwardToObservationMs: observed - sent,
                committedResponseToObservationMs: observed - committed,
                visibility: await learner.evaluate(
                  () => document.visibilityState,
                ),
                triggers,
              }),
              contentType: "application/json",
            });
            if (rendered) expect(observed - sent).toBeLessThanOrEqual(15_000);
          }
          expect(triggers).toEqual([]);
          expect(await learner.evaluate(() => document.visibilityState)).toBe(
            "visible",
          );
        }
      } finally {
        await proxy.close();
      }
      if (entry === "archived private result") {
        const publicPath = `/api/v1/learner/questions/${question.id}`;
        expect((await learner.request.get(publicPath)).status()).toBe(404);
        const foreign = await newLearner(browser);
        try {
          expect((await foreign.request.get(gradePath)).status()).toBe(404);
          expect(
            (
              await foreign.request.put(`${publicPath}/attempt`, {
                headers: { origin: f01Origin },
                data: { code, reasoning, expectedRevision: null },
              })
            ).status(),
          ).toBe(404);
        } finally {
          await foreign.context().close();
        }
        await openFromDashboard(instructor, "instructor", question.title, true);
        await assertSnapshot(instructor, attempt);
        await expect(visibleGrade(instructor, 8)).toBeVisible();
      }
    } finally {
      await learner.context().close();
    }
  });
}
