import { expect, test, type Page } from "@playwright/test";
import { f01Learner } from "../support/f01-fixtures.js";
import { mockEmptyLearnerAssistantState } from "../support/learner-assistant-fixture.js";

const question = {
  id: "hotfix-question",
  versionId: "hotfix-version",
  title: "Repair a loop boundary",
  topic: "Loops",
  instructorName: "Synthetic instructor",
  publishedAt: "2026-11-06T00:00:00.000Z",
  problemStatement: "Include every item.",
  buggyCode: "print('start')\n",
  expectedBehavior: "Print the complete result.",
};

async function signedInLearner(page: Page) {
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ json: { user: f01Learner } }),
  );
}

test("legacy learner list redirects with its query and search retains mouse and keyboard focus", async ({
  page,
}) => {
  await signedInLearner(page);
  await page.route("**/api/v1/learner/questions?*", (route) =>
    route.fulfill({
      json: {
        questions: [
          {
            id: question.id,
            title: question.title,
            topic: question.topic,
            instructorName: question.instructorName,
            publishedAt: question.publishedAt,
          },
        ],
        nextOffset: null,
      },
    }),
  );
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/learner/questions?q=loops");
    await expect(page).toHaveURL(/\/learner\/question\?q=loops$/);
    const search = page.getByRole("textbox", { name: "Search questions" });
    await expect(search).toHaveValue("loops");
    await expect(
      page.getByRole("link", { name: `Open question: ${question.title}` }),
    ).toBeVisible();

    await search.click();
    const mouseOutline = await search.evaluate(
      (element) => getComputedStyle(element).outlineStyle,
    );
    expect(mouseOutline).toBe("none");
    const fieldset = search.locator("xpath=../fieldset");
    await expect(fieldset).toHaveCSS("border-color", "rgb(36, 87, 197)");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(search).toBeFocused();
    await expect(fieldset).toHaveCSS("border-width", "2px");
    await search.fill("boundary");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/learner\/question\?q=boundary$/);
  }
  const listViewport =
    test.info().project.name === "chromium"
      ? { width: 1440, height: 900 }
      : { width: 390, height: 844 };
  await page.setViewportSize(listViewport);
  await page.goto("/learner/question?q=loops");
  await expect(
    page.getByRole("link", { name: `Open question: ${question.title}` }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("list.png"),
    fullPage: true,
  });
});

test("dashboard shows authenticated profile and retryable loading errors", async ({
  page,
}) => {
  await signedInLearner(page);
  let retryRequested = false;
  let releaseFailure!: () => void;
  const failureGate = new Promise<void>((resolve) => {
    releaseFailure = resolve;
  });
  await page.route("**/api/v1/learner/dashboard", (route) => {
    if (!retryRequested) {
      return failureGate.then(() =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          json: {
            error: {
              code: "DEPENDENCY_UNAVAILABLE",
              message: "Dashboard unavailable. Try again.",
              requestId: "synthetic-dashboard-failure",
            },
          },
        }),
      );
    }
    return route.fulfill({
      json: {
        attemptedCount: 3,
        completedCount: 1,
        inProgressCount: 2,
        recentDrafts: [
          {
            exerciseId: question.id,
            title: question.title,
            updatedAt: "2026-11-08T10:00:00.000Z",
          },
        ],
      },
    });
  });
  await page.goto("/learner");
  await expect(page.getByRole("status")).toContainText("Loading your activity");
  releaseFailure();
  await expect(page.getByRole("alert")).toContainText("Dashboard unavailable");
  retryRequested = true;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, F01 Learner" }),
  ).toBeVisible();
  await expect(page.getByText("learner@example.test")).toBeVisible();
  await expect(page.getByText("Questions attempted")).toBeVisible();
  await expect(page.getByText("3", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Resume" })).toHaveAttribute(
    "href",
    `/learner/questions/${question.id}`,
  );
  await page.screenshot({
    path: test.info().outputPath("dashboard.png"),
    fullPage: true,
  });
});

test("question detail keeps loading visible before retryable recovery", async ({
  page,
}) => {
  await signedInLearner(page);
  let release!: () => void;
  let failFirstWave = true;
  const responseGate = new Promise<void>((resolve) => {
    release = () => {
      failFirstWave = false;
      resolve();
    };
  });
  await page.route(
    `**/api/v1/learner/questions/${question.id}`,
    async (route) => {
      const shouldFail = failFirstWave;
      if (shouldFail) {
        await responseGate;
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          json: {
            error: {
              code: "DEPENDENCY_UNAVAILABLE",
              message: "Question unavailable. Try again.",
              requestId: "synthetic-question-failure",
            },
          },
        });
      }
      return route.fulfill({ json: { question } });
    },
  );
  await page.route(
    `**/api/v1/learner/questions/${question.id}/attempt`,
    (route) => route.fulfill({ json: { attempt: null } }),
  );
  await mockEmptyLearnerAssistantState(page, question.id, question.versionId);
  await page.goto(`/learner/questions/${question.id}`);
  await expect(page.getByRole("status")).toContainText("Loading question");
  await expect(
    page.getByRole("heading", { name: "Loading question…" }),
  ).toBeVisible();
  release();
  await expect(page.getByRole("alert")).toContainText("Question unavailable");
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(
    page.getByRole("heading", { name: question.title, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your Python 3 code" }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("detail.png"),
    fullPage: true,
  });
});
