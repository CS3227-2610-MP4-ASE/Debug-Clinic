// Intercepted HTTP tests establish browser state, not persistence or authentication.
import { expect, test, type Page } from "@playwright/test";
import {
  f01Draft,
  f01Generation,
  f01Owner,
  f01Saved,
  f01Topic,
} from "../support/f01-fixtures.js";

const review =
  "I have reviewed this question and understand that published content cannot be edited.";
const question = {
  ...f01Saved,
  ...f01Draft,
  versionId: "f02-version",
  revision: 0,
  publishedAt: null,
  archivedAt: null,
};

async function install(page: Page) {
  const state = {
    question: { ...question },
    patches: [] as unknown[],
    publishes: [] as unknown[],
    outcome: "success",
    gets: 0,
    user: { ...f01Owner } as typeof f01Owner | null,
    patchOutcome: "success",
    removeCalls: 0,
  };
  await page.route("**/api/v1/me", (route) =>
    state.user
      ? route.fulfill({ json: { user: state.user } })
      : route.fulfill({ status: 401, json: {} }),
  );
  await page.route("**/api/v1/instructor/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/drafts"))
      return route.fulfill({
        json: {
          drafts: [
            {
              id: question.id,
              title: question.title,
              topic: question.topic,
              createdAt: question.createdAt,
            },
          ],
          nextOffset: null,
        },
      });
    if (url.pathname.endsWith("/remove")) {
      state.removeCalls++;
      return route.fulfill({
        json: {
          question: {
            ...question,
            status: "ARCHIVED",
            publishedAt: "2026-11-06T00:00:00.000Z",
            archivedAt: "2026-11-06T00:01:00.000Z",
          },
        },
      });
    }
    if (url.pathname.endsWith("/generate"))
      return route.fulfill({
        json: { topic: f01Topic, draft: f01Draft, generation: f01Generation },
      });
    if (url.pathname.endsWith("/publish")) {
      const body = route.request().postDataJSON() as { draft: typeof f01Draft };
      state.publishes.push(body);
      if (state.outcome === "unknown") return route.abort("connectionreset");
      if (state.outcome === "denied")
        return route.fulfill({
          status: 401,
          json: {
            error: {
              code: "UNAUTHENTICATED",
              message: "Sign in again",
              requestId: "f02",
              mutationOutcome: "NOT_APPLIED",
            },
          },
        });
      if (state.outcome === "rollback")
        return route.fulfill({
          status: 503,
          json: {
            error: {
              code: "DEPENDENCY_UNAVAILABLE",
              message: "Try again",
              requestId: "f02",
              mutationOutcome: "NOT_APPLIED",
            },
          },
        });
      return route.fulfill({
        json: {
          question: {
            ...question,
            ...body.draft,
            status: "PUBLISHED",
            revision: 1,
            publishedAt: "2026-11-06T00:00:00.000Z",
          },
          outcome: state.publishes.length > 1 ? "existing" : "published",
        },
      });
    }
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as { draft: typeof f01Draft };
      state.patches.push(body);
      if (state.patchOutcome === "stale")
        return route.fulfill({
          status: 409,
          json: {
            error: {
              code: "CONFLICT",
              message:
                "This draft changed. Reload to review the latest version.",
              requestId: "f02",
              mutationOutcome: "NOT_APPLIED",
            },
          },
        });
      state.question = { ...state.question, ...body.draft, revision: 1 };
      return route.fulfill({ json: { question: state.question } });
    }
    state.gets++;
    return route.fulfill({ json: { question: state.question } });
  });
  return state;
}

test("B01/B04/B06 saved draft edits save the same identity and confirmation resets", async ({
  page,
}) => {
  const state = await install(page);
  await page.goto(`/instructor/questions/${question.id}`);
  await expect(page.getByRole("textbox", { name: /^Title/ })).toHaveValue(
    f01Draft.title,
  );
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: review }).check();
  await page.getByRole("textbox", { name: /^Title/ }).fill("Count every value");
  await expect(page.getByRole("checkbox", { name: review })).not.toBeChecked();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Changes saved");
  expect(state.patches).toEqual([
    {
      expectedRevision: 0,
      topic: f01Topic,
      draft: { ...f01Draft, title: "Count every value" },
    },
  ]);
  await page.getByRole("link", { name: "New question", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

async function preview(page: Page) {
  await page.goto("/instructor/questions/new");
  await page.getByRole("textbox", { name: /Python topic/ }).fill(f01Topic);
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Title/ })).toHaveValue(
    f01Draft.title,
  );
}

test("B07/B17 uncertain preview freezes reviewed snapshot and retries identical key/payload", async ({
  page,
}) => {
  const state = await install(page);
  await preview(page);
  await page.getByRole("textbox", { name: /^Title/ }).fill("Count every value");
  await page.getByRole("checkbox", { name: review }).check();
  state.outcome = "unknown";
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "outcome is unconfirmed" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Title/ })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  state.outcome = "success";
  await page.getByRole("button", { name: "Retry same snapshot" }).click();
  await expect(page.getByRole("status")).toContainText(
    "published content is authoritative",
  );
  expect(state.publishes).toHaveLength(2);
  expect(state.publishes[1]).toEqual(state.publishes[0]);
  expect(state.publishes[0]).toMatchObject({
    source: "preview",
    draft: { title: "Count every value" },
  });
  await expect(page.getByRole("textbox", { name: /^Title/ })).toHaveCount(0);
});

test("B12 definite rollback preserves edits and requires fresh confirmation", async ({
  page,
}) => {
  const state = await install(page);
  await preview(page);
  state.outcome = "rollback";
  await page.getByRole("checkbox", { name: review }).check();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Try again" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Title/ })).toBeEditable();
  await expect(page.getByRole("checkbox", { name: review })).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeDisabled();
});

test("B13/B20 stale reload and New question require explicit discard consent", async ({
  page,
}) => {
  const state = await install(page);
  await page.goto(`/instructor/questions/${question.id}`);
  await page
    .getByRole("textbox", { name: /^Title/ })
    .fill("Unsaved local title");
  state.patchOutcome = "stale";
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("button", { name: "Reload latest" }).click();
  await expect(page.getByRole("dialog")).toHaveText(
    /You have unsaved changes. Leave and discard them\?/,
  );
  await expect(
    page.getByRole("button", { name: "Stay", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Title/ })).toHaveValue(
    "Unsaved local title",
  );
  await page.getByRole("button", { name: "Reload latest" }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Title/ })).toHaveValue(
    f01Draft.title,
  );
  await page.getByRole("link", { name: "New question", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("textbox", { name: /Python topic/ }).fill(f01Topic);
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await page.getByRole("button", { name: "New question", exact: true }).click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /Python topic/ })).toHaveValue(
    "",
  );
});

test("B20 normalized prose stays clean while code whitespace is dirty; Link and POP warn", async ({
  page,
}) => {
  await install(page);
  await page.goto("/instructor");
  await page.goto(`/instructor/questions/${question.id}`);
  await page
    .getByRole("textbox", { name: /^Title/ })
    .fill(`  ${f01Draft.title}  `);
  await page.getByRole("link", { name: "My drafts", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("link", { name: `Open draft: ${question.title}`, exact: true })
    .click();
  await page
    .getByRole("textbox", { name: /^Buggy Python code/ })
    .fill(f01Draft.buggyCode + "\n");
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: /^Buggy Python code/ }),
  ).toHaveValue(f01Draft.buggyCode + "\n");
});

test("B35 API401 and AuthProvider session loss retain admitted edits without mutation or refetch", async ({
  page,
}) => {
  const state = await install(page);
  await preview(page);
  await page.getByRole("textbox", { name: /^Title/ }).fill("Retain this title");
  state.outcome = "denied";
  await page.getByRole("checkbox", { name: review }).check();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Your session expired" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Title/ })).toHaveValue(
    "Retain this title",
  );
  await expect(page.getByRole("textbox", { name: /^Title/ })).toBeDisabled();
  expect(state.publishes).toHaveLength(1);
  state.user = null;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("textbox", { name: /^Title/ })).toHaveValue(
    "Retain this title",
  );
  await page.getByRole("link", { name: "Sign in again", exact: true }).click();
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Title/ })).toHaveValue(
    "Retain this title",
  );
});

test("B35 logout resolves discard first and a different identity receives a fresh editor", async ({
  page,
}) => {
  const state = await install(page);
  let signouts = 0;
  await page.route("**/api/auth/sign-out", (route) => {
    signouts++;
    return route.fulfill({ json: { success: true } });
  });
  await page.goto(`/instructor/questions/${question.id}`);
  await page
    .getByRole("textbox", { name: /^Title/ })
    .fill("Private unsaved title");
  if ((page.viewportSize()?.width ?? 1280) < 600)
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  expect(signouts).toBe(0);
  // An externally replaced authenticated identity must never inherit the capsule.
  state.user = { ...f01Owner, id: "other-instructor" };
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("textbox", { name: /^Title/ })).toHaveValue(
    f01Draft.title,
  );
  expect(state.gets).toBeGreaterThan(1);
});

test("B24/B25 Remove has exact cancellation/focus and retains read-only Removed record", async ({
  page,
}) => {
  const state = await install(page);
  await preview(page);
  await page.getByRole("checkbox", { name: review }).check();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Remove this question? It will no longer be available to learners. Your read-only record will be retained.",
  );
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  expect(state.removeCalls).toBe(0);
  await expect(
    page.getByRole("button", { name: "Remove", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(
    page.getByText("Removed. Your read-only record is retained."),
  ).toBeVisible();
  expect(state.removeCalls).toBe(1);
  await expect(
    page.getByRole("button", {
      name: /Remove|Publish|Save changes/,
      exact: true,
    }),
  ).toHaveCount(0);
});
