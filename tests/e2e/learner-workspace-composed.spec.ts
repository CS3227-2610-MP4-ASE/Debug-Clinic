import {
  expectPythonCode,
  expectPythonEditable,
  fillPythonCode,
} from "../support/python-editor.js";
// Independent composed acceptance: real cookies/PostgreSQL, captured SMTP, fake AI.
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "../../generated/prisma/client.js";
import { f01DatabaseUrl } from "../support/f01-database.js";
import { f01Origin, f01Topic } from "../support/f01-fixtures.js";

test.skip(
  process.env["E2E_AUTH_COMPLETION"] !== "1",
  "Requires captured-outbox runtime",
);
test.use({ trace: "off", screenshot: "off" });
const recipients: string[] = [];
const channel = resolve(".workflow-state/browser-auth");
const review =
  "I have reviewed this question and understand that published content cannot be edited.";
let prisma: PrismaClient | null = null;
function requirePrisma() {
  if (!prisma)
    throw new Error("The opt-in isolated browser database was not initialized");
  return prisma;
}
test.beforeAll(() => {
  if (process.env["E2E_AUTH_COMPLETION"] !== "1") return;
  const url = f01DatabaseUrl();
  if (
    [
      "DATABASE_URL",
      "DATABASE_URL_POOLED",
      "TEST_DATABASE_URL",
      "E2E_TEST_DATABASE_URL",
    ].some((key) => process.env[key] !== url)
  )
    throw new Error("Explicit matching synthetic targets required");
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
});
test.afterAll(async () => {
  const database = prisma;
  if (!database) return;
  try {
    if (recipients.length) {
      const users = await database.user.findMany({
        where: { email: { in: recipients } },
        select: { id: true },
      });
      const ids = users.map((user) => user.id);
      await database.review.deleteMany({
        where: { instructorId: { in: ids } },
      });
      await database.attempt.deleteMany({ where: { learnerId: { in: ids } } });
      await database.exercise.deleteMany({ where: { authorId: { in: ids } } });
      await database.aiUsageEvent.deleteMany({
        where: { userId: { in: ids } },
      });
      await database.user.deleteMany({ where: { id: { in: ids } } });
      const prefixes = recipients.map(
        (email) => `mail-${createHash("sha256").update(email).digest("hex")}-`,
      );
      for (const file of await readdir(channel))
        if (prefixes.some((prefix) => file.startsWith(prefix)))
          await unlink(resolve(channel, file));
    }
  } finally {
    await database.$disconnect();
    prisma = null;
  }
});
async function register(page: Page, role: "Instructor" | "Learner") {
  const email = `lws-${randomUUID()}@example.test`;
  recipients.push(email);
  const password = "LWS-synthetic-browser-password-12345";
  await page.goto("/register");
  await page.getByRole("radio", { name: role, exact: true }).check();
  await page
    .getByRole("textbox", { name: /^Name/ })
    .fill(`LWS Synthetic ${role}`);
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

test("independent composed: no-hint publication, learner draft/final and retained archive deny new reads and writes", async ({
  page,
  browser,
}) => {
  const database = requirePrisma();
  await register(page, "Instructor");
  await generate(page);
  const title = `LWS composed ${randomUUID()}`;
  await page.getByRole("textbox", { name: /^Title/ }).fill(title);
  await page.getByRole("checkbox", { name: review }).check();
  const publicationResponse = page.waitForResponse(
    "**/api/v1/instructor/questions/publish",
  );
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const publication = await publicationResponse;
  expect(publication.status()).toBe(200);
  const { question } = (await publication.json()) as {
    question: { id: string; versionId: string };
  };
  expect(
    await database.hintStage.count({
      where: { exerciseVersionId: question.versionId },
    }),
  ).toBe(0);
  const learnerContext = await browser.newContext({ baseURL: f01Origin });
  const newContext = await browser.newContext({ baseURL: f01Origin });
  try {
    const learner = await learnerContext.newPage();
    await register(learner, "Learner");
    await learner.goto(`/learner/questions/${question.id}`);
    const code = learner.getByRole("textbox", { name: "Your Python 3 code" });
    await expectPythonEditable(code, true);
    await fillPythonCode(code, "def total(xs):\n    return sum(xs)\n");
    await learner
      .getByRole("textbox", { name: "Explain your reasoning" })
      .fill("All values should contribute.");
    const savedResponse = learner.waitForResponse(
      (r) =>
        r.url().endsWith(`/questions/${question.id}/attempt`) &&
        r.request().method() === "PUT",
    );
    await learner
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    expect((await savedResponse).status()).toBe(200);
    await learner.reload();
    await expectPythonCode(code, "def total(xs):\n    return sum(xs)\n");
    await fillPythonCode(
      code,
      "# final snapshot\ndef total(xs):\n    return sum(xs)\n",
    );
    learner.once("dialog", (dialog) => dialog.accept());
    const finalResponse = learner.waitForResponse("**/attempt/submit");
    await learner.getByRole("button", { name: "Submit final attempt" }).click();
    const final = await finalResponse;
    expect(final.status()).toBe(200);
    const finalBody = (await final.json()) as {
      attempt: {
        id: string;
        revision: number;
        status: string;
        code: string;
        reasoning: string;
      };
    };
    expect(finalBody.attempt).toMatchObject({
      revision: 1,
      status: "FINAL_SUBMITTED",
      code: "# final snapshot\ndef total(xs):\n    return sum(xs)\n",
    });
    await expectPythonEditable(code, false);
    const me = (await (await page.request.get("/api/v1/me")).json()) as {
      user: { id: string };
    };
    const reviewRow = await database.review.create({
      data: {
        attemptId: finalBody.attempt.id,
        instructorId: me.user.id,
        decision: "APPROVED",
        comment: "Synthetic retained reference",
      },
    });
    const fresh = await newContext.newPage();
    await register(fresh, "Learner");
    const attemptPath = `/api/v1/learner/questions/${question.id}/attempt`;
    expect(await (await fresh.request.get(attemptPath)).json()).toEqual({
      attempt: null,
    });
    const before = await database.attempt.findUniqueOrThrow({
      where: { id: finalBody.attempt.id },
    });
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
    for (const target of [learner, fresh]) {
      expect(
        (
          await target.request.get(`/api/v1/learner/questions/${question.id}`)
        ).status(),
      ).toBe(404);
      expect((await target.request.get(attemptPath)).status()).toBe(404);
      const data = {
        code: "print('denied')",
        reasoning: "Archived",
        expectedRevision: null,
      };
      expect(
        (
          await target.request.put(attemptPath, {
            data,
            headers: { origin: f01Origin },
          })
        ).status(),
      ).toBe(404);
      expect(
        (
          await target.request.post(`${attemptPath}/submit`, {
            data,
            headers: { origin: f01Origin },
          })
        ).status(),
      ).toBe(404);
    }
    expect(
      await database.attempt.findUniqueOrThrow({
        where: { id: finalBody.attempt.id },
      }),
    ).toEqual(before);
    expect(
      await database.exerciseVersion.count({
        where: { id: question.versionId },
      }),
    ).toBe(1);
    expect(
      await database.review.findUnique({ where: { id: reviewRow.id } }),
    ).toMatchObject({ attemptId: finalBody.attempt.id });
  } finally {
    await learnerContext.close();
    await newContext.close();
  }
});
