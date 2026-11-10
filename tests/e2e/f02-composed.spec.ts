// Real browser/cookies, captured local email, Express/PostgreSQL and fake AI.
// No HTTP interception; SMTP and the AI provider remain deliberate external doubles.
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "../../generated/prisma/client.js";
import { f01DatabaseUrl } from "../support/f01-database.js";
import { f01Origin, f01Topic } from "../support/f01-fixtures.js";

test.skip(
  process.env["E2E_AUTH_COMPLETION"] !== "1",
  "Requires the owned captured-outbox authentication runtime",
);
test.use({ trace: "off", screenshot: "off" });
const recipients: string[] = [];
const channel = resolve(".workflow-state/browser-auth");
const dropMarker = resolve(channel, "drop-next-publication-response");
const review =
  "I have reviewed this question and understand that published content cannot be edited.";

test.beforeAll(() => {
  if (
    process.env["E2E_AUTH_COMPLETION"] === "1" &&
    process.env["E2E_TEST_DATABASE_URL"] !== f01DatabaseUrl()
  )
    throw new Error(
      "F02 browser and cleanup must share the assigned synthetic database",
    );
});
test.afterAll(async () => {
  if (!recipients.length) return;
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: f01DatabaseUrl() }),
  });
  try {
    const users = await prisma.user.findMany({
      where: { email: { in: recipients } },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    await prisma.exercise.deleteMany({ where: { authorId: { in: ids } } });
    await prisma.aiUsageEvent.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  } finally {
    await prisma.$disconnect();
  }
  const prefixes = recipients.map(
    (email) => `mail-${createHash("sha256").update(email).digest("hex")}-`,
  );
  for (const file of await readdir(channel))
    if (prefixes.some((prefix) => file.startsWith(prefix)))
      await unlink(resolve(channel, file));
});

async function register(page: Page, role: "Instructor" | "Learner") {
  const email = `f02-${randomUUID()}@example.test`;
  recipients.push(email);
  const password = "F02-synthetic-browser-password-12345";
  await page.goto("/register");
  await page.getByRole("radio", { name: role, exact: true }).check();
  await page
    .getByRole("textbox", { name: /^Name/ })
    .fill(`F02 Synthetic ${role}`);
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  const registration = page.waitForResponse("**/api/auth/sign-up/email");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  expect((await registration).status()).toBe(200);
  const prefix = `mail-${createHash("sha256").update(email).digest("hex")}-`;
  let verification = "";
  await expect
    .poll(async () => {
      for (const file of (await readdir(channel)).filter((entry) =>
        entry.startsWith(prefix),
      )) {
        const message = JSON.parse(
          await readFile(resolve(channel, file), "utf8"),
        ) as { subject: string; text: string };
        if (message.subject.includes("Verify")) {
          verification = message.text.match(/https?:\/\/\S+/)![0];
          return true;
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
  return { email, password };
}

async function generate(page: Page) {
  await page.goto("/instructor/questions/new");
  await page.getByRole("textbox", { name: /Python topic/ }).fill(f01Topic);
  const generated = page.waitForResponse(
    "**/api/v1/instructor/questions/generate",
  );
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Title/ })).not.toHaveValue(
    "",
  );
  return (await (await generated).json()) as { generation: { id: string } };
}

test("B04/B07/B09/B11/B25/B28 real saved and direct publication, learner privacy and removal", async ({
  page,
  browser,
}) => {
  await register(page, "Instructor");
  await generate(page);
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/instructor/drafts") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  const saved = (await (await created).json()).draft as { id: string };
  await expect(page).toHaveURL(new RegExp(`/instructor/drafts/${saved.id}$`));
  await page
    .getByRole("textbox", { name: /^Title/ })
    .fill("F02 reviewed saved publication");
  await page
    .getByRole("textbox", { name: /^Bug explanation/ })
    .fill("F02_PRIVATE_EXPLANATION");
  await page
    .getByRole("textbox", { name: /^Corrected solution/ })
    .fill("F02_PRIVATE_SOLUTION");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Changes saved" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: /^Expected behavior/ })
    .fill("Every value contributes to the result.");
  await page.getByRole("checkbox", { name: review }).check();
  const publication = page.waitForResponse(
    "**/api/v1/instructor/questions/publish",
  );
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const published = (await (await publication).json()).question as {
    id: string;
    versionId: string;
  };
  expect(published.id).toBe(saved.id);
  await expect(
    page.getByText("Published. Question content is read-only."),
  ).toBeVisible();
  const learnerContext = await browser.newContext({ baseURL: f01Origin });
  try {
    const learner = await learnerContext.newPage();
    await register(learner, "Learner");
    await learner.goto("/learner/questions");
    await learner
      .getByRole("link", {
        name: "Open question: F02 reviewed saved publication",
        exact: true,
      })
      .click();
    await expect(
      learner.getByText("Every value contributes to the result.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(learner.locator("main")).not.toContainText(
      /F02_PRIVATE_EXPLANATION|F02_PRIVATE_SOLUTION/,
    );
    await expect(
      learner.getByRole("button", { name: "Get Hint", exact: true }),
    ).toBeVisible();
    await expect(
      learner.getByText(/Results are local feedback, not official grading/),
    ).toBeVisible();
    const publicResponse = await learner.request.get(
      `/api/v1/learner/questions/${published.id}`,
    );
    const publicValue = await publicResponse.json();
    expect(Object.keys(publicValue.question).sort()).toEqual(
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
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await expect(
      page.getByText("Removed. Your read-only record is retained.", {
        exact: true,
      }),
    ).toBeVisible();
    await learner.reload();
    await expect(learner.getByRole("alert")).toHaveText(
      "This question is unavailable.",
    );
    await generate(page);
    await page
      .getByRole("textbox", { name: /^Title/ })
      .fill("F02 direct reviewed publication");
    await page.getByRole("checkbox", { name: review }).check();
    const attempts: unknown[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith("/api/v1/instructor/questions/publish"))
        attempts.push(request.postDataJSON());
    });
    await writeFile(dropMarker, "1");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Publication outcome is unconfirmed" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^Title/ })).toBeDisabled();
    const directResponse = page.waitForResponse(
      "**/api/v1/instructor/questions/publish",
    );
    await page
      .getByRole("button", { name: "Retry same snapshot", exact: true })
      .click();
    const direct = (await (await directResponse).json()).question as {
      id: string;
    };
    expect(attempts).toHaveLength(2);
    expect(attempts[1]).toEqual(attempts[0]);
    await expect(page.getByRole("status")).toContainText(
      "published content is authoritative",
    );
    expect(direct.id).not.toBe(saved.id);
    await learner.goto(`/learner/questions/${direct.id}`);
    await expect(learner.getByRole("heading", { level: 1 })).toHaveText(
      "F02 direct reviewed publication",
    );
  } finally {
    await unlink(dropMarker).catch((error: unknown) => {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
    });
    await learnerContext.close();
  }
});

test("B40/B37 real legacy preview fallback retains edits and fresh sessions reopen publication and Removed record", async ({
  page,
  browser,
}) => {
  const credentials = await register(page, "Instructor");
  const generated = await generate(page);
  const current = (await (await page.request.get("/api/v1/me")).json()) as {
    user: { id: string; email: string };
  };
  expect(current.user.email).toBe(credentials.email);
  // Structural fixture setup only: recreate a pre-F02 unbound generation for
  // this returned generation ID and this test's own authenticated instructor.
  // All behavior assertions below use public HTTP/UI rather than database reads.
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: f01DatabaseUrl() }),
  });
  try {
    const changed = await prisma.aiUsageEvent.updateMany({
      where: {
        id: generated.generation.id,
        userId: current.user.id,
        operation: "generate-question",
        status: "SUCCEEDED",
      },
      data: { generationTopicDigest: null },
    });
    expect(changed.count).toBe(1);
  } finally {
    await prisma.$disconnect();
  }
  await page
    .getByRole("textbox", { name: /^Title/ })
    .fill("F02 legacy reviewed question");
  const fieldNames = [
    /^Title/,
    /^Problem statement/,
    /^Buggy Python code/,
    /^Expected behavior/,
    /^Bug explanation/,
    /^Corrected solution/,
  ];
  const retained = await Promise.all(
    fieldNames.map((name) => page.getByRole("textbox", { name }).inputValue()),
  );
  await page.getByRole("checkbox", { name: review }).check();
  const denied = page.waitForResponse("**/api/v1/instructor/questions/publish");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const denial = await denied;
  expect(denial.status()).toBe(400);
  const guidance =
    "This older preview cannot be published directly. Save draft and reopen it to publish, or generate a new question.";
  expect(await denial.json()).toMatchObject({
    error: {
      code: "BAD_REQUEST",
      mutationOutcome: "NOT_APPLIED",
      message: guidance,
    },
  });
  await expect(
    page.getByRole("alert").filter({ hasText: guidance }),
  ).toBeVisible();
  for (let i = 0; i < fieldNames.length; i++)
    await expect(
      page.getByRole("textbox", { name: fieldNames[i] }),
    ).toHaveValue(retained[i]!);
  for (const status of ["DRAFT", "PUBLISHED"])
    expect(
      await (
        await page.request.get(`/api/v1/instructor/questions?status=${status}`)
      ).json(),
    ).toEqual({ questions: [], nextOffset: null });
  const creation = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/instructor/drafts") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  const created = await creation;
  expect(created.status()).toBe(201);
  const saved = (await created.json()).draft as { id: string };
  await expect(page).toHaveURL(new RegExp(`/instructor/drafts/${saved.id}$`));
  await expect(page.getByRole("textbox", { name: /^Title/ })).toHaveValue(
    retained[0]!,
  );
  await expect(page.getByRole("checkbox", { name: review })).not.toBeChecked();
  await page.getByRole("checkbox", { name: review }).check();
  const publication = page.waitForResponse(
    "**/api/v1/instructor/questions/publish",
  );
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const published = await publication;
  expect(published.status()).toBe(200);
  expect((await published.json()).question).toMatchObject({
    id: saved.id,
    status: "PUBLISHED",
    title: retained[0],
  });
  await expect(
    page.getByText("Published. Question content is read-only.", {
      exact: true,
    }),
  ).toBeVisible();
  for (const state of ["PUBLISHED", "ARCHIVED"]) {
    if (state === "ARCHIVED") {
      await page.getByRole("button", { name: "Remove", exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Remove", exact: true })
        .click();
      await expect(
        page.getByText("Removed. Your read-only record is retained.", {
          exact: true,
        }),
      ).toBeVisible();
    }
    const freshContext = await browser.newContext({ baseURL: f01Origin });
    try {
      const fresh = await freshContext.newPage();
      await fresh.goto("/sign-in");
      await fresh
        .getByRole("textbox", { name: /^Email/ })
        .fill(credentials.email);
      await fresh.getByLabel(/^Password/).fill(credentials.password);
      await fresh.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(fresh).toHaveURL(/\/instructor$/);
      await fresh.goto(`/instructor/questions/${saved.id}`);
      await expect(
        fresh.getByText(
          state === "PUBLISHED"
            ? "Published. Question content is read-only."
            : "Removed. Your read-only record is retained.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        fresh.getByText(retained[0]!, { exact: true }),
      ).toBeVisible();
      await expect(fresh.getByRole("textbox", { name: /^Title/ })).toHaveCount(
        0,
      );
      const owner = await fresh.request.get(
        `/api/v1/instructor/questions/${saved.id}`,
      );
      expect((await owner.json()).question).toMatchObject({
        id: saved.id,
        status: state,
        title: retained[0],
      });
    } finally {
      await freshContext.close();
    }
  }
});
