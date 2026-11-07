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

test("B28/B31 public detail is literal and opens private coaching without auto-generating a reply", async ({
  page,
}) => {
  const calls: string[] = [];
  await page.route("**/api/v1/learner/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    calls.push(`${route.request().method()} ${pathname}`);
    return route.fulfill({
      json: pathname.endsWith("/attempt")
        ? { attempt: null }
        : pathname.endsWith("/assistant")
          ? {
              assistant: {
                exerciseVersionId: published.versionId,
                revision: 0,
                unlockedLevel: 1,
                hasSuccessfulReply: false,
                readOnly: false,
                expiresAt: null,
                messages: [],
              },
            }
          : { question: published },
    });
  });
  await page.goto(`/learner/questions/${published.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    published.title,
  );
  await expect(
    page
      .getByRole("article", { name: "Question details" })
      .getByText(published.buggyCode, { exact: true }),
  ).toBeVisible();
  const hint = page.getByRole("button", { name: "Get Hint", exact: true });
  await expect(hint).toBeVisible();
  await expect(
    page.getByText(/Results are local feedback, not official grading/),
  ).toBeVisible();
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
    new Set([
      `GET /api/v1/learner/questions/${published.id}`,
      `GET /api/v1/learner/questions/${published.id}/attempt`,
      `GET /api/v1/learner/questions/${published.id}/assistant`,
    ]),
  );
  await hint.click();
  await expect(
    page.getByRole("dialog", { name: "Debugging coach" }),
  ).toBeVisible();
  expect(calls.some((call) => call.startsWith("POST "))).toBe(false);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
});

test("coaching advances only after a successful Next hint request", async ({
  page,
}, testInfo) => {
  let level = 1;
  let revision = 0;
  let successful = false;
  let messages: Array<Record<string, unknown>> = [];
  const calls: Array<{ action: string; context: unknown }> = [];
  await page.route("**/api/v1/learner/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/assistant/messages")) {
      const body = route.request().postDataJSON() as {
        action: string;
        context: unknown;
        requestId: string;
      };
      calls.push({ action: body.action, context: body.context });
      const now = new Date().toISOString();
      const learnerMessage = {
        id: `learner-${messages.length + 1}`,
        sequence: messages.length + 1,
        role: "LEARNER",
        text:
          body.action === "MESSAGE"
            ? "Why is the last value missing?"
            : "Next hint requested.",
        level,
        requestId: body.requestId,
        context: body.context,
        createdAt: now,
      };
      const reply = {
        id: `coach-${messages.length + 2}`,
        sequence: messages.length + 2,
        role: "ASSISTANT",
        text:
          level === 1
            ? "Trace the final iteration."
            : "Compare the loop boundary to the last item.",
        level: body.action === "NEXT_HINT" ? Math.min(3, level + 1) : level,
        requestId: body.requestId,
        context: body.context,
        createdAt: now,
      };
      messages = [...messages, learnerMessage, reply];
      if (body.action === "NEXT_HINT") level = Math.min(3, level + 1);
      successful = true;
      revision++;
      return route.fulfill({
        json: {
          assistant: {
            exerciseVersionId: published.versionId,
            revision,
            unlockedLevel: level,
            hasSuccessfulReply: successful,
            readOnly: false,
            expiresAt: null,
            messages,
          },
          reply,
        },
      });
    }
    if (pathname.endsWith("/assistant"))
      return route.fulfill({
        json: {
          assistant: {
            exerciseVersionId: published.versionId,
            revision,
            unlockedLevel: level,
            hasSuccessfulReply: successful,
            readOnly: false,
            expiresAt: null,
            messages,
          },
        },
      });
    return route.fulfill({
      json: pathname.endsWith("/attempt")
        ? { attempt: null }
        : { question: published },
    });
  });
  await page.goto(`/learner/questions/${published.id}`);
  await page.getByRole("button", { name: /Open debugging coach/ }).click();
  await expect(page.getByRole("button", { name: "Next hint" })).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Message the coach" })
    .fill("Why is the final value missing?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Trace the final iteration.")).toBeVisible();
  const screenshotDir = process.env["DEBUGCLINIC_ASSISTANT_SCREENSHOT_DIR"];
  if (screenshotDir)
    await page.screenshot({
      path: `${screenshotDir}/${testInfo.project.name}.png`,
    });
  await expect(page.getByText("Level 1 of 3")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next hint" })).toBeEnabled();
  const composer = page.getByRole("textbox", { name: "Message the coach" });
  await composer.fill("Keep this draft while I minimize.");
  await page.getByRole("button", { name: "Minimize coaching chat" }).click();
  const launcher = page.getByRole("button", { name: /Open debugging coach/ });
  await expect(launcher).toBeFocused();
  await launcher.click();
  await expect(composer).toHaveValue("Keep this draft while I minimize.");
  await composer.fill("");
  await page.getByRole("button", { name: "Next hint" }).click();
  await expect(page.getByText("Level 2 of 3")).toBeVisible();
  expect(calls.map((call) => call.action)).toEqual(["MESSAGE", "NEXT_HINT"]);
  expect(calls[0]?.context).toEqual({
    shareCode: true,
    shareReasoning: false,
    shareOutput: false,
  });
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
