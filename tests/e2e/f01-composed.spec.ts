// Real browser, Better Auth cookies, Express, fake provider and PostgreSQL.
// The existing private captured outbox replaces SMTP delivery only. No page.route.
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "../../generated/prisma/client.js";
import { f01DatabaseUrl } from "../support/f01-database.js";
import { f01Edited, f01Origin, f01Topic } from "../support/f01-fixtures.js";

test.skip(
  process.env["E2E_AUTH_COMPLETION"] !== "1",
  "Requires the opt-in captured-outbox authentication runtime",
);
test.use({ trace: "off", screenshot: "off" });
const recipients: string[] = [];
const channel = resolve(".workflow-state/browser-auth");
const fields = {
  title: /^Title/i,
  problemStatement: /^Problem statement/i,
  buggyCode: /^Buggy (Python )?code/i,
  expectedBehavior: /^Expected behavio[u]?r/i,
  bugExplanation: /Bug explanation/i,
  correctedSolution: /^Corrected solution/i,
};
test.beforeAll(() => {
  const db = f01DatabaseUrl();
  if (process.env["E2E_TEST_DATABASE_URL"] !== db)
    throw new Error(
      "F01 browser and cleanup must share the assigned synthetic DB",
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

test("B01/B05/B13/B14/B19/B23 actual instructor cookie flow generates unsaved preview, edits, saves, lists and reloads", async ({
  page,
  context,
}) => {
  const email = `f01-browser-${randomUUID()}@example.test`;
  recipients.push(email);
  const password = "F01-synthetic-browser-password-12345";
  expect((await page.request.get("/api/ready")).status()).toBe(200);
  await page.goto("/register");
  await page.getByRole("radio", { name: "Instructor", exact: true }).check();
  await page
    .getByRole("textbox", { name: /^Name/ })
    .fill("F01 Synthetic Instructor");
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
  await expect(page).toHaveURL(/\/instructor$/);
  const me = await page.request.get("/api/v1/me");
  expect(me.status()).toBe(200);
  expect((await me.json()).user).toMatchObject({ email, role: "INSTRUCTOR" });
  expect(
    (await context.cookies()).find((cookie) =>
      cookie.name.includes("session_token"),
    ),
  ).toMatchObject({ httpOnly: true, sameSite: "Lax" });
  await expect(
    page.getByText(/prepare a debugging question on a specific Python topic/i),
  ).toBeVisible();
  await page.getByRole("link", { name: "New question", exact: true }).click();
  const topic = page.getByRole("textbox", {
    name: "Python topic",
    exact: true,
  });
  await topic.fill(f01Topic);
  const generation = page.waitForResponse(
    "**/api/v1/instructor/questions/generate",
  );
  await page.getByRole("button", { name: /^Generate$/i }).click();
  const generated = await generation;
  expect(generated.status()).toBe(200);
  expect((await generated.json()).generation).toMatchObject({
    provider: "fake",
    model: null,
    promptVersion: "fake-question-v1",
  });
  await expect(topic).toHaveValue(f01Topic);
  await expect(topic).not.toBeEditable();
  for (const name of Object.values(fields))
    await expect(page.getByRole("textbox", { name })).not.toHaveValue("");
  expect(
    await (await page.request.get("/api/v1/instructor/drafts")).json(),
  ).toEqual({ drafts: [], nextOffset: null });
  for (const [field, name] of Object.entries(fields))
    await page
      .getByRole("textbox", { name })
      .fill(f01Edited[field as keyof typeof f01Edited]);
  const savedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/instructor/drafts") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /^Save draft$/i }).click();
  const saved = await savedResponse;
  expect(saved.status()).toBe(201);
  const draft = (await saved.json()).draft as { id: string };
  await expect(page).toHaveURL(new RegExp(`/instructor/drafts/${draft.id}$`));
  await expect(
    page.getByText(/^Unverified instructor draft(?:\.|$)/),
  ).toBeVisible();
  const roundTrip = await page.request.get(
    `/api/v1/instructor/drafts/${draft.id}`,
  );
  expect(roundTrip.status()).toBe(200);
  expect((await roundTrip.json()).draft).toMatchObject({
    id: draft.id,
    status: "DRAFT",
    topic: f01Topic,
    ...f01Edited,
    provenance: { provider: "fake", association: "instructor-reported" },
  });
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: fields.bugExplanation }),
  ).toHaveValue(f01Edited.bugExplanation);
  await page.goto("/instructor/drafts");
  await page
    .getByRole("link", { name: f01Edited.title, exact: true })
    .or(
      page.getByRole("link", {
        name: `Open draft: ${f01Edited.title}`,
        exact: true,
      }),
    )
    .click();
  await expect(page).toHaveURL(new RegExp(`/instructor/drafts/${draft.id}$`));
  await expect(
    page.getByRole("textbox", { name: fields.correctedSolution }),
  ).toHaveValue(f01Edited.correctedSolution);
  await expect(
    page.getByRole("button", { name: /^Save changes$/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Publish$/i })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /delete|verify/i }),
  ).toHaveCount(0);
});
