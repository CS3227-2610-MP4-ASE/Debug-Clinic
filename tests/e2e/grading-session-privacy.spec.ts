import {
  InstructorSubmissionDetailResponseSchema,
  LearnerAttemptResponseSchema,
  PublishedQuestionResponseSchema,
} from "@debugclinic/contracts";
import { expect, test, type Page } from "@playwright/test";
import { f01Learner, f01Owner } from "../support/f01-fixtures.js";
import { mockEmptyLearnerAssistantState } from "../support/learner-assistant-fixture.js";

const attemptId = "privacy-final";
const instructorPath = `/instructor/submissions/${attemptId}`;
const question = {
  id: "privacy-question",
  versionId: "privacy-question-version",
  title: "Count all items",
  topic: "Python lists",
  instructorName: f01Owner.name,
  publishedAt: "2026-11-06T00:00:00.000Z",
  problemStatement: "Count every item in the input collection.",
  expectedBehavior: "count([2, 4]) returns 2.",
  buggyCode: "def count(items):\n    return 0\n",
};
const snapshot = {
  code: "def count(items):\n    return len(items)\n",
  reasoning: "Use the collection length, including the empty case.",
  submittedAt: "2026-11-06T01:00:00.000Z",
};
const grade = (score: number, revision: number) => ({
  score,
  revision,
  savedAt: "2026-11-06T02:00:00.000Z",
});
const scoreInput = (page: Page) => page.getByRole("textbox", { name: "Score" });
const save = (page: Page) =>
  page.getByRole("button", { name: "Save grade", exact: true });
const scoreText = (page: Page, score: number) =>
  page.getByText(`${score}/10`, { exact: true });

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function instructorDetail(page: Page) {
  const response = InstructorSubmissionDetailResponseSchema.parse({
    submission: {
      ...snapshot,
      attemptId,
      question: {
        title: question.title,
        problemStatement: question.problemStatement,
        expectedBehavior: question.expectedBehavior,
      },
      learnerDisplayName: f01Learner.name,
      grade: grade(6, 1),
    },
  });
  await page.route(`**/api/v1${instructorPath}`, (route) => {
    if (route.request().headers()["x-debugclinic-actor"] === f01Owner.id)
      return route.fulfill({ json: response });
    return route.fulfill({
      status: 404,
      json: {
        error: {
          code: "NOT_FOUND",
          message: "Submission not found",
          requestId: "privacy-other-owner",
        },
      },
    });
  });
}

test("P07 peer sign-out hides a pending instructor save before the replacement session reply", async ({
  context,
  page,
}, testInfo) => {
  const peer = await context.newPage();
  const heldSave = gate();
  const heldSession = gate();
  let signedOut = false;
  let peerSessionRead = false;
  let lateSaveSettled = false;
  const requests: string[] = [];

  await instructorDetail(page);
  await peer.route("**/api/v1/me", (route) =>
    route.fulfill({ json: { user: f01Owner } }),
  );
  await peer.route("**/api/auth/sign-out", (route) => {
    signedOut = true;
    return route.fulfill({ json: { success: true } });
  });
  await page.route("**/api/v1/me", async (route) => {
    if (!signedOut) return route.fulfill({ json: { user: f01Owner } });
    peerSessionRead = true;
    await heldSession.promise;
    return route.fulfill({ status: 401, json: {} });
  });
  await page.route(`**/api/v1${instructorPath}/grade`, async (route) => {
    const method = route.request().method();
    requests.push(method);
    if (method !== "PUT")
      return route.fulfill({ json: { grade: grade(6, 1) } });
    await heldSave.promise;
    // The browser is allowed to abort this request as soon as admission is lost.
    await route
      .fulfill({ json: { grade: grade(8, 2) } })
      .catch(() => undefined);
    lateSaveSettled = true;
  });

  try {
    await peer.goto("/instructor");
    await expect(
      peer.getByRole("heading", { name: "Instructor workspace" }),
    ).toBeVisible();
    await page.goto(instructorPath);
    await expect(scoreText(page, 6)).toBeVisible();
    await scoreInput(page).fill("8");
    await save(page).click();
    await expect(
      page.getByText("Saving grade…", { exact: true }),
    ).toBeVisible();
    await expect.poll(() => requests).toEqual(["PUT"]);

    if (testInfo.project.name === "mobile-chromium")
      await peer.getByRole("button", { name: "Open navigation" }).click();
    await peer.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(peer).toHaveURL(/\/sign-in$/);
    await expect.poll(() => peerSessionRead).toBe(true);
    await expect(
      page.getByText("Checking your session…", { exact: true }),
    ).toBeVisible();
    await expect(scoreInput(page)).toHaveCount(0);
    await expect(scoreText(page, 6)).toHaveCount(0);
    await expect(
      page.getByText(snapshot.reasoning, { exact: true }),
    ).toHaveCount(0);

    heldSave.release();
    await expect.poll(() => lateSaveSettled).toBe(true);
    await expect(scoreText(page, 8)).toHaveCount(0);
    heldSession.release();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(scoreInput(page)).toHaveCount(0);
    expect(requests).toEqual(["PUT"]);
  } finally {
    heldSave.release();
    heldSession.release();
    await peer.close();
  }
});

test("P07 a persisted page restore hides an embedded result and ignores the old poll before expiry", async ({
  page,
}) => {
  const path = `/learner/questions/${question.id}`;
  const heldPoll = gate();
  const heldSession = gate();
  let restoring = false;
  let restoredSessionRead = false;
  let latePollSettled = false;
  let polls = 0;
  await page.clock.install();
  await page.route("**/api/v1/me", async (route) => {
    if (!restoring) return route.fulfill({ json: { user: f01Learner } });
    restoredSessionRead = true;
    await heldSession.promise;
    return route.fulfill({ status: 401, json: {} });
  });
  await page.route(`**/api/v1${path}`, (route) =>
    route.fulfill({
      json: PublishedQuestionResponseSchema.parse({ question }),
    }),
  );
  await page.route(`**/api/v1${path}/attempt`, (route) =>
    route.fulfill({
      json: LearnerAttemptResponseSchema.parse({
        attempt: {
          ...snapshot,
          id: attemptId,
          status: "FINAL_SUBMITTED",
          revision: 1,
        },
      }),
    }),
  );
  await mockEmptyLearnerAssistantState(page, question.id, question.versionId);
  await page.route(
    `**/api/v1/learner/submissions/${attemptId}/grade`,
    async (route) => {
      polls++;
      if (polls === 1) return route.fulfill({ json: { grade: { score: 6 } } });
      await heldPoll.promise;
      await route
        .fulfill({ json: { grade: { score: 9 } } })
        .catch(() => undefined);
      latePollSettled = true;
    },
  );

  try {
    await page.goto(path);
    await expect(scoreText(page, 6)).toBeVisible();
    await page.clock.runFor(5_000);
    await expect.poll(() => polls).toBe(2);
    await page.evaluate(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );
    });
    await expect(scoreText(page, 6)).toHaveCount(0);
    restoring = true;
    await page.evaluate(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });
    await expect.poll(() => restoredSessionRead).toBe(true);
    await expect(
      page.getByText("Checking your session…", { exact: true }),
    ).toBeVisible();
    heldPoll.release();
    await expect.poll(() => latePollSettled).toBe(true);
    await expect(scoreText(page, 9)).toHaveCount(0);
    heldSession.release();
    await expect(
      page.getByText("Checking your session…", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Grade result" }),
    ).toHaveCount(0);
    await page.clock.runFor(10_000);
    expect(polls).toBe(2);
  } finally {
    heldPoll.release();
    heldSession.release();
  }
});

test("P07 a stalled session check times out and retries without losing same-account input", async ({
  page,
}) => {
  const heldSession = gate();
  let admission: "original" | "stalled" | "different" = "original";
  let stalledRead = false;
  const reads: (string | undefined)[] = [];
  let writes = 0;
  const differentOwner = {
    ...f01Owner,
    id: "privacy-other-instructor",
    name: "Different instructor",
    email: "privacy-other-instructor@example.test",
  };
  await page.clock.install();
  await instructorDetail(page);
  await page.route(`**/api/v1${instructorPath}/grade`, (route) => {
    if (route.request().method() === "PUT") writes++;
    reads.push(route.request().headers()["x-debugclinic-actor"]);
    return route.fulfill({ json: { grade: grade(6, 1) } });
  });
  await page.route("**/api/v1/me", async (route) => {
    if (admission === "stalled") {
      stalledRead = true;
      await heldSession.promise;
      return route.fulfill({ json: { user: f01Owner } }).catch(() => undefined);
    }
    return route.fulfill({
      json: { user: admission === "original" ? f01Owner : differentOwner },
    });
  });

  try {
    await page.goto(instructorPath);
    await scoreInput(page).fill("8");
    admission = "stalled";
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => stalledRead).toBe(true);
    const retry = page.getByRole("button", {
      name: "Retry session",
      exact: true,
    });
    await expect(retry).toBeDisabled();
    await expect(save(page)).toBeDisabled();
    await expect(scoreInput(page)).toHaveValue("8");
    await page.clock.runFor(4_100);
    await expect(retry).toBeEnabled();
    await expect(scoreInput(page)).toHaveValue("8");
    await expect(scoreText(page, 6)).toBeVisible();

    admission = "original";
    await retry.click();
    await expect(save(page)).toBeEnabled();
    await expect(scoreInput(page)).toHaveValue("8");
    await expect.poll(() => reads).toEqual([f01Owner.id]);

    admission = "different";
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(
      page.getByText("Submission not found", { exact: true }),
    ).toBeVisible();
    await expect(scoreInput(page)).toHaveCount(0);
    await expect(scoreText(page, 6)).toHaveCount(0);
    expect(writes).toBe(0);
  } finally {
    heldSession.release();
  }
});
