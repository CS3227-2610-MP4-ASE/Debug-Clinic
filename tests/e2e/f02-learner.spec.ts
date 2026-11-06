// Literal HTTP doubles verify learner rendering/paging; real privacy enforcement is a separate tier.
import { expect, test } from "@playwright/test";
import { f01Learner } from "../support/f01-fixtures.js";

const published = {
  id: "f02-public",
  versionId: "f02-public-version",
  title: "Sum all values",
  topic: "Python lists and for loops",
  instructorName: "Instructor A",
  publishedAt: "2026-11-06T00:00:00.000Z",
  problemStatement: "Fix every value in the list.",
  buggyCode: "<script>window.f02Probe=1</script>\nreturn values[:-1]\n",
  expectedBehavior: "Return the complete total.",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ json: { user: f01Learner } }),
  );
});

test("B28/B31 public detail is literal, has disabled Coming soon hint and no private content or requests", async ({
  page,
}) => {
  const calls: string[] = [];
  await page.route("**/api/v1/learner/**", (route) => {
    calls.push(
      `${route.request().method()} ${new URL(route.request().url()).pathname}`,
    );
    return route.fulfill({ json: { question: published } });
  });
  await page.goto(`/learner/questions/${published.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    published.title,
  );
  await expect(
    page.getByText(published.buggyCode, { exact: true }),
  ).toBeVisible();
  const hint = page.getByRole("button", { name: "Get Hint", exact: true });
  await expect(hint).toBeDisabled();
  await expect(hint).toHaveAccessibleDescription("Coming soon");
  await expect(page.getByText("Coming soon", { exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(
    /F02_PRIVATE|Bug explanation|Corrected solution|generationId|author@example/,
  );
  expect(
    await page.evaluate(
      () => (window as Window & { f02Probe?: number }).f02Probe,
    ),
  ).toBeUndefined();
  // React StrictMode may repeat initial GET effects in the development server.
  expect(calls.length).toBeGreaterThan(0);
  expect(new Set(calls)).toEqual(
    new Set([`GET /api/v1/learner/questions/${published.id}`]),
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
});

test("B23/B30 later-page failure retains previous items and Retry uses failed offset with deduplication", async ({
  page,
}) => {
  const offsets: string[] = [];
  let fail = true;
  await page.route("**/api/v1/learner/questions?*", (route) => {
    const offset = new URL(route.request().url()).searchParams.get("offset")!;
    offsets.push(offset);
    if (offset === "50" && fail)
      return route.fulfill({
        status: 503,
        json: {
          error: {
            code: "DEPENDENCY_UNAVAILABLE",
            message: "Try the list again",
            requestId: "f02",
          },
        },
      });
    const summary = {
      id: published.id,
      title: published.title,
      topic: published.topic,
      instructorName: published.instructorName,
      publishedAt: published.publishedAt,
    };
    return route.fulfill({
      json: {
        questions:
          offset === "0"
            ? Array.from({ length: 50 }, (_, i) => ({
                ...summary,
                id: `public-${i}`,
                title: `Published question ${i}`,
              }))
            : [
                { ...summary, id: "public-49", title: "Published question 49" },
                { ...summary, id: "public-50", title: "Published question 50" },
              ],
        nextOffset: offset === "0" ? 50 : null,
      },
    });
  });
  await page.goto("/learner/questions");
  await expect(
    page.getByRole("link", {
      name: "Open question: Published question 0",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Try the list again");
  await expect(
    page.getByRole("link", {
      name: "Open question: Published question 0",
      exact: true,
    }),
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("link", {
      name: "Open question: Published question 50",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Open question: Published question 49",
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Load more", exact: true }),
  ).toHaveCount(0);
  expect(offsets.filter((offset) => offset !== "0")).toEqual(["50", "50"]);
});

test("B29/B30 empty, failure and unavailable details remain distinct with return navigation", async ({
  page,
}) => {
  await page.route("**/api/v1/learner/questions?*", (route) =>
    route.fulfill({ json: { questions: [], nextOffset: null } }),
  );
  await page.goto("/learner/questions");
  await expect(
    page.getByText("No published questions are available."),
  ).toBeVisible();
  await page.route("**/api/v1/learner/questions/missing", (route) =>
    route.fulfill({
      status: 404,
      json: {
        error: {
          code: "NOT_FOUND",
          message: "Question unavailable",
          requestId: "f02",
        },
      },
    }),
  );
  await page.goto("/learner/questions/missing");
  await expect(page.getByRole("alert")).toHaveText(
    "This question is unavailable.",
  );
  await page.getByRole("link", { name: "Back to published questions" }).click();
  await expect(
    page.getByText("No published questions are available."),
  ).toBeVisible();
});
