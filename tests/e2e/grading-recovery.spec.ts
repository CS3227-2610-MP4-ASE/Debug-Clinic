// Browser acceptance doubles only the public HTTP transport.
import { expect, test, type Page } from "@playwright/test";
import { f01Learner, f01Owner } from "../support/f01-fixtures.js";

const attemptId = "acceptance-final";
const detail = {
  attemptId,
  question: {
    title: "Count every item",
    problemStatement: "Fix the function to count every item.",
    expectedBehavior: "count([2, 4]) returns 2.",
  },
  code: "def count(items):\n    return len(items)\n",
  reasoning:
    "Include every item.\n\n<grade-marker>Empty means zero.</grade-marker>",
  submittedAt: "2026-11-06T00:00:00.000Z",
};
const instructorPath = `/instructor/submissions/${attemptId}`;
const learnerPath = `/learner/submissions/${attemptId}`;
const grade = (score: number, revision: number) => ({
  score,
  revision,
  savedAt: `2026-11-06T00:00:0${revision}.000Z`,
});
const input = (page: Page) => page.getByRole("textbox", { name: /score/i });
const save = (page: Page) =>
  page.getByRole("button", { name: "Save grade", exact: true });
const retry = (page: Page) =>
  page.getByRole("button", { name: "Retry result", exact: true });
const scoreText = (page: Page, score: number) =>
  page.getByText(`${score}/10`, { exact: true });
const unavailable = {
  error: {
    code: "DEPENDENCY_UNAVAILABLE",
    message: "Synthetic unavailable response",
    requestId: "grading-acceptance",
  },
};
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function instructorDetail(page: Page) {
  await page.route(`**/api/v1${instructorPath}`, (route) =>
    route.fulfill({
      json: {
        submission: {
          ...detail,
          learnerDisplayName: f01Learner.name,
          grade: grade(6, 1),
        },
      },
    }),
  );
}

test("P01 queue links distinguish matching titles and a failed continuation preserves its rows", async ({
  page,
}) => {
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ json: { user: f01Owner } }),
  );
  const rows = ["Learner One", "Learner Two", "Learner Three"].map(
    (learnerDisplayName, index) => ({
      attemptId: `submission-${index + 1}`,
      questionTitle: detail.question.title,
      learnerDisplayName,
      submittedAt: detail.submittedAt,
      grade: null,
    }),
  );
  let continuationAllowed = false;
  await page.route(/\/api\/v1\/instructor\/submissions(?:\?.*)?$/, (route) => {
    const query = new URL(route.request().url()).searchParams;
    if (!query.has("cursor"))
      return route.fulfill({
        json: { items: rows.slice(0, 2), nextCursor: "synthetic-next" },
      });
    if (!continuationAllowed)
      return route.fulfill({ status: 503, json: unavailable });
    return route.fulfill({ json: { items: rows.slice(2), nextCursor: null } });
  });
  await page.goto("/instructor/submissions");
  const first = page.getByRole("link", {
    name: /Count every item.*Learner One/,
  });
  const second = page.getByRole("link", {
    name: /Count every item.*Learner Two/,
  });
  await expect(first).toHaveAttribute(
    "href",
    "/instructor/submissions/submission-1",
  );
  await expect(second).toHaveAttribute(
    "href",
    "/instructor/submissions/submission-2",
  );
  await page.getByRole("button", { name: "Load more" }).press("Enter");
  await expect(
    page.getByText("More submissions could not be loaded."),
  ).toBeVisible();
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  continuationAllowed = true;
  await page.getByRole("button", { name: "Try again" }).press("Enter");
  await expect(
    page.getByRole("link", { name: /Count every item.*Learner Three/ }),
  ).toBeVisible();
});

test("P02/P03 a stale same-score correction must still be reviewed and saved deliberately", async ({
  page,
}) => {
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ json: { user: f01Owner } }),
  );
  await instructorDetail(page);
  const pending = gate();
  const writes: unknown[] = [];
  const events: string[] = [];
  await page.route(`**/api/v1${instructorPath}/grade`, async (route) => {
    const method = route.request().method();
    events.push(method);
    if (method === "GET")
      return route.fulfill({ json: { grade: grade(8, 2) } });
    writes.push(route.request().postDataJSON());
    if (writes.length === 1) {
      await pending.promise;
      return route.fulfill({
        status: 409,
        json: {
          error: {
            code: "CONFLICT",
            message:
              "The grade changed. Check the current grade before saving.",
            requestId: "grading-conflict",
            mutationOutcome: "NOT_APPLIED",
          },
        },
      });
    }
    return route.fulfill({ json: { grade: grade(8, 2) } });
  });

  await page.goto(instructorPath);
  await expect(scoreText(page, 6)).toBeVisible();
  await input(page).fill("2e0");
  await save(page).press("Enter");
  await expect(
    page.getByText("Enter a whole number from 1 to 10.", { exact: true }),
  ).toBeVisible();
  expect(writes).toEqual([]);
  await expect(scoreText(page, 6)).toBeVisible();
  await input(page).fill("8");
  try {
    await save(page).click();
    await expect(
      page.getByText("Saving grade…", { exact: true }),
    ).toBeVisible();
    await expect(input(page)).toHaveValue("8");
    await expect(input(page)).toBeDisabled();
    await expect(scoreText(page, 6)).toBeVisible();
  } finally {
    pending.release();
  }
  await expect(scoreText(page, 8)).toBeVisible();
  await expect(input(page)).toHaveValue("8");
  await expect(save(page)).toBeEnabled();
  expect(events).toEqual(["PUT", "GET"]);
  expect(writes).toEqual([{ score: 8, expectedRevision: 1 }]);
  await save(page).press("Enter");
  await expect
    .poll(() => writes)
    .toEqual([
      { score: 8, expectedRevision: 1 },
      { score: 8, expectedRevision: 2 },
    ]);
});

for (const firstReply of [
  "definite rejection",
  "malformed success",
  "inconsistent success",
] as const) {
  test(`P04 ${firstReply} retains the entered choice and requires an explicit retry`, async ({
    page,
  }) => {
    await page.route("**/api/v1/me", (route) =>
      route.fulfill({ json: { user: f01Owner } }),
    );
    await instructorDetail(page);
    const events: string[] = [];
    const writes: unknown[] = [];
    await page.route(`**/api/v1${instructorPath}/grade`, (route) => {
      const method = route.request().method();
      events.push(method);
      if (method === "GET")
        return route.fulfill({ json: { grade: grade(7, 2) } });
      writes.push(route.request().postDataJSON());
      if (writes.length === 1 && firstReply === "definite rejection")
        return route.fulfill({
          status: 503,
          json: {
            error: {
              ...unavailable.error,
              mutationOutcome: "NOT_APPLIED",
            },
          },
        });
      if (writes.length === 1)
        return route.fulfill({
          json: {
            grade:
              firstReply === "inconsistent success"
                ? grade(7, 2)
                : { score: "8" },
          },
        });
      return route.fulfill({
        json: { grade: grade(8, firstReply === "definite rejection" ? 2 : 3) },
      });
    });
    await page.goto(instructorPath);
    await expect(scoreText(page, 6)).toBeVisible();
    await input(page).fill("8");
    await save(page).click();
    await expect(
      scoreText(page, firstReply === "definite rejection" ? 6 : 7),
    ).toBeVisible();
    await expect(input(page)).toHaveValue("8");
    await expect(save(page)).toBeEnabled();
    expect(events).toEqual(
      firstReply === "definite rejection" ? ["PUT"] : ["PUT", "GET"],
    );
    await save(page).click();
    await expect(scoreText(page, 8)).toBeVisible();
    expect(writes).toEqual([
      { score: 8, expectedRevision: 1 },
      {
        score: 8,
        expectedRevision: firstReply === "definite rejection" ? 1 : 2,
      },
    ]);
  });
}

test("P06 private result retries initial failure, retains stale state and updates the live region", async ({
  page,
}) => {
  let detailReads = 0;
  let gradeReads = 0;
  let allowDetailRecovery = false;
  let recovered = false;
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ json: { user: f01Learner } }),
  );
  await page.route(`**/api/v1${learnerPath}`, (route) => {
    detailReads++;
    if (!allowDetailRecovery)
      return route.fulfill({ status: 503, json: unavailable });
    return route.fulfill({
      json: { submission: { ...detail, grade: { score: 6 } } },
    });
  });
  await page.route(`**/api/v1${learnerPath}/grade`, (route) => {
    gradeReads++;
    return recovered
      ? route.fulfill({ json: { grade: { score: 8 } } })
      : route.fulfill({ status: 503, json: unavailable });
  });
  await page.goto(learnerPath);
  await expect(
    page.getByText("Result unavailable", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Awaiting grade", { exact: true })).toHaveCount(
    0,
  );
  const initialReads = detailReads;
  expect(initialReads).toBeGreaterThan(0);
  allowDetailRecovery = true;
  await retry(page).press("Enter");
  await expect(scoreText(page, 6)).toBeVisible();
  await expect(
    page.getByText("Result unavailable", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("This result may be out of date.", { exact: true }),
  ).toBeVisible({ timeout: 12_000 });
  await expect(scoreText(page, 6)).toBeVisible();
  expect(detailReads).toBe(initialReads + 1);
  expect(gradeReads).toBeGreaterThan(0);
  recovered = true;
  await retry(page).press("Enter");
  await expect(scoreText(page, 8)).toBeVisible();
  await expect(
    page.getByText("This result may be out of date.", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator('[aria-live="polite"]').filter({ hasText: "8/10" }),
  ).toHaveCount(1);
  expect(detailReads).toBe(initialReads + 1);
});

test("P07 an indeterminate same-account check preserves input through pending revalidation and pauses writes", async ({
  page,
}) => {
  const checking = gate();
  let admission: "verified" | "offline" | "pending" = "verified";
  let pendingRead = false;
  let writes = 0;
  await instructorDetail(page);
  await page.route(`**/api/v1${instructorPath}/grade`, (route) => {
    if (route.request().method() === "PUT") writes++;
    return route.fulfill({ json: { grade: grade(6, 1) } });
  });
  await page.route("**/api/v1/me", async (route) => {
    if (admission === "offline")
      return route.fulfill({ status: 503, json: unavailable });
    if (admission === "pending") {
      pendingRead = true;
      await checking.promise;
    }
    return route.fulfill({ json: { user: f01Owner } });
  });
  await page.goto(instructorPath);
  await input(page).fill("8");
  await expect(scoreText(page, 6)).toBeVisible();
  admission = "offline";
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(save(page)).toBeDisabled();
  await expect(input(page)).toHaveValue("8");
  admission = "pending";
  try {
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect.poll(() => pendingRead).toBe(true);
    await expect(input(page)).toHaveValue("8");
    await expect(scoreText(page, 6)).toBeVisible();
    await expect(save(page)).toBeDisabled();
    expect(writes).toBe(0);
  } finally {
    admission = "verified";
    checking.release();
  }
  await expect(save(page)).toBeEnabled();
  await expect(input(page)).toHaveValue("8");
  expect(writes).toBe(0);
});
