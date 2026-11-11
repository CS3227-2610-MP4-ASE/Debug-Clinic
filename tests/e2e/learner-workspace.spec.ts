import {
  expectPythonCode,
  expectPythonEditable,
  fillPythonCode,
} from "../support/python-editor.js";
import { expect, test } from "@playwright/test";
import { LearnerAttemptWriteSchema } from "@debugclinic/contracts";
import { f01Learner } from "../support/f01-fixtures.js";
import { mockEmptyLearnerAssistantState } from "../support/learner-assistant-fixture.js";
import { mockAwaitingLearnerGrade } from "../support/learner-grade-fixture.js";

const question = {
  id: "workspace-case",
  versionId: "workspace-version",
  title: "Repair a list total",
  topic: "Python lists",
  instructorName: "Instructor A",
  publishedAt: "2026-11-06T00:00:00.000Z",
  problemStatement: "Return the sum of every value.",
  buggyCode: "def total(values):\n    return sum(values[:-1])\n",
  expectedBehavior: "total([3, 5]) returns 8.",
};

test("empty reasoning explains how to complete the attempt before saving or submitting", async ({
  page,
}) => {
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ json: { user: f01Learner } }),
  );
  await page.route("**/api/v1/learner/questions/workspace-case", (route) =>
    route.fulfill({ json: { question } }),
  );
  const writes: unknown[] = [];
  await page.route(
    "**/api/v1/learner/questions/workspace-case/attempt**",
    (route) => {
      if (route.request().method() === "GET")
        return route.fulfill({ json: { attempt: null } });
      const input = route.request().postDataJSON();
      writes.push(input);
      const parsed = LearnerAttemptWriteSchema.safeParse(input);
      if (!parsed.success)
        return route.fulfill({
          status: 400,
          json: {
            error: {
              code: "BAD_REQUEST",
              message: "The request was invalid",
              requestId: "invalid-attempt-fixture",
              mutationOutcome: "NOT_APPLIED",
              details: parsed.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
              })),
            },
          },
        });
      return route.fulfill({
        json: {
          attempt: {
            id: "attempt-1",
            code: parsed.data.code,
            reasoning: parsed.data.reasoning,
            status: "FINAL_SUBMITTED",
            revision: 0,
            submittedAt: "2026-11-06T12:00:00.000Z",
          },
        },
      });
    },
  );
  await mockEmptyLearnerAssistantState(page, question.id, question.versionId);
  await mockAwaitingLearnerGrade(page);
  let confirmations = 0;
  page.on("dialog", (dialog) => {
    confirmations += 1;
    void dialog.accept();
  });
  await page.goto("/learner/questions/workspace-case");
  const reasoning = page.getByRole("textbox", {
    name: "Explain your reasoning",
  });
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("alert")).toContainText("Explain your reasoning");
  await reasoning.fill("   ");
  await page.getByRole("button", { name: "Submit final attempt" }).click();
  await expect(page.getByRole("alert")).toContainText("Explain your reasoning");
  expect(writes).toHaveLength(0);
  expect(confirmations).toBe(0);
  await expectPythonCode(
    page.getByRole("textbox", { name: "Your Python 3 code" }),
    question.buggyCode,
  );
  await reasoning.fill("The slice omits the final element.");
  await page.getByRole("button", { name: "Submit final attempt" }).click();
  await expect(page.getByRole("alert")).toContainText("read-only");
  expect(writes).toHaveLength(1);
  expect(confirmations).toBe(1);
});

test("search opens an attempt, saves it, confirms final submission and retains the search", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ json: { user: f01Learner } }),
  );
  const requests: { method: string; url: string; body: unknown }[] = [];
  let saved: {
    id: string;
    code: string;
    reasoning: string;
    status: string;
    revision: number;
    submittedAt: string | null;
  } | null = null;
  await page.route("**/api/v1/learner/questions?*", (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get("q");
    return route.fulfill({
      json: {
        questions: q?.toLowerCase().includes("list")
          ? [
              {
                id: question.id,
                title: question.title,
                topic: question.topic,
                instructorName: question.instructorName,
                publishedAt: question.publishedAt,
              },
            ]
          : [],
        nextOffset: null,
      },
    });
  });
  await page.route("**/api/v1/learner/questions/workspace-case", (route) =>
    route.fulfill({ json: { question } }),
  );
  await page.route(
    "**/api/v1/learner/questions/workspace-case/attempt**",
    async (route) => {
      const request = route.request();
      requests.push({
        method: request.method(),
        url: new URL(request.url()).pathname,
        body: request.method() === "GET" ? null : request.postDataJSON(),
      });
      if (request.method() === "GET")
        return route.fulfill({ json: { attempt: saved } });
      const payload = request.postDataJSON() as {
        code: string;
        reasoning: string;
        expectedRevision: number | null;
      };
      saved = {
        id: "attempt-1",
        code: payload.code,
        reasoning: payload.reasoning,
        status: request.url().endsWith("/submit") ? "FINAL_SUBMITTED" : "DRAFT",
        revision: saved ? saved.revision + 1 : 0,
        submittedAt: request.url().endsWith("/submit")
          ? "2026-11-06T12:00:00.000Z"
          : null,
      };
      return route.fulfill({ json: { attempt: saved } });
    },
  );
  await mockEmptyLearnerAssistantState(page, question.id, question.versionId);
  await mockAwaitingLearnerGrade(page);

  await page.goto("/learner/questions?q=initial");
  await expect(page).toHaveURL(/\/learner\/question\?q=initial/);
  await page.getByRole("textbox", { name: "Search questions" }).fill("list");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("link", { name: `Open question: ${question.title}` })
    .click();
  await expect(
    page.getByRole("heading", { name: question.title, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Run", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Get Hint", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Results are local feedback, not official grading/),
  ).toBeVisible();

  const code = page.getByRole("textbox", { name: "Your Python 3 code" });
  const reasoning = page.getByRole("textbox", {
    name: "Explain your reasoning",
  });
  await fillPythonCode(code, "def total(values):\n    return sum(values)\n");
  await reasoning.fill("The slice dropped the final value.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect.poll(() => saved?.status).toBe("DRAFT");
  expect(requests.find((entry) => entry.method === "PUT")?.body).toMatchObject({
    expectedRevision: null,
  });

  const separator = page.getByRole("separator", {
    name: "Resize editor and output",
  });
  if (await separator.isVisible()) {
    const before = Number(await separator.getAttribute("aria-valuenow"));
    await separator.focus();
    await page.keyboard.press("ArrowDown");
    expect(
      Number(await separator.getAttribute("aria-valuenow")),
    ).toBeGreaterThan(before);
    const bounds = await separator.boundingBox();
    if (!bounds) throw new Error("Workspace separator is not positioned");
    const pointerStart = Number(await separator.getAttribute("aria-valuenow"));
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2 + 40,
    );
    await page.mouse.up();
    expect(
      Number(await separator.getAttribute("aria-valuenow")),
    ).toBeGreaterThan(pointerStart);
  }
  await expectPythonCode(code, "def total(values):\n    return sum(values)\n");

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Submit final attempt" }).click();
  await expect(page.getByRole("alert")).toContainText("read-only");
  await expectPythonEditable(code, false);
  expect(saved).toMatchObject({ status: "FINAL_SUBMITTED", revision: 1 });
  expect(requests.filter((entry) => entry.method === "POST")).toHaveLength(1);

  await page.setViewportSize({ width: 320, height: 800 });
  await expect(
    page.getByRole("link", { name: "Back to published questions" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(321);
  await page.getByRole("link", { name: "Back to published questions" }).click();
  await expect(page).toHaveURL(/\/learner\/question\?q=list/);
  await expect(
    page.getByRole("link", { name: `Open question: ${question.title}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Search questions" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(321);
});
