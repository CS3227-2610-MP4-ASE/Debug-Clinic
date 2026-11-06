// Independent LWS acceptance. HTTP doubles isolate browser lifecycle behavior.
import { expect, test, type Page } from "@playwright/test";
import { f01Learner } from "../support/f01-fixtures.js";

const question = {
  id: "independent-workspace",
  versionId: "independent-version",
  title: "Repair every value",
  topic: "Python lists",
  instructorName: "Synthetic Instructor",
  publishedAt: "2026-11-06T00:00:00.000Z",
  problemStatement: "Include every list item in the total.",
  buggyCode:
    "# <script>window.injected = true</script>\ndef total(xs):\n    return 0\n",
  expectedBehavior: "total([3, 5]) returns 8.",
};
const attempt = {
  id: "independent-attempt",
  code: "print('saved')\n",
  reasoning: "Previously saved reasoning",
  status: "DRAFT",
  revision: 0,
  submittedAt: null,
};
const detail = `/api/v1/learner/questions/${question.id}`;
const editor = (page: Page) =>
  page.getByRole("textbox", { name: "Your Python 3 code" });
const reason = (page: Page) =>
  page.getByRole("textbox", { name: "Explain your reasoning" });
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
async function fixture(page: Page) {
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ json: { user: f01Learner } }),
  );
  await page.route(`**${detail}`, (route) =>
    route.fulfill({ json: { question } }),
  );
  await page.route(`**${detail}/attempt`, (route) =>
    route.fulfill({ json: { attempt: null } }),
  );
}
async function open(page: Page) {
  await page.goto(`/learner/questions/${question.id}`);
  await expect(editor(page)).toBeEnabled();
}

test("independent: edits during a successful save remain guarded and the next save uses the confirmed revision", async ({
  page,
}) => {
  await fixture(page);
  const pending = gate();
  const writes: {
    code: string;
    reasoning: string;
    expectedRevision: number | null;
  }[] = [];
  await page.route(`**${detail}/attempt`, async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { attempt: null } });
    const input = route.request().postDataJSON();
    writes.push(input);
    if (writes.length === 1) await pending.promise;
    return route.fulfill({
      json: {
        attempt: {
          ...attempt,
          code: input.code,
          reasoning: input.reasoning,
          revision: writes.length - 1,
        },
      },
    });
  });
  await open(page);
  await editor(page).fill("print('sent')");
  await reason(page).fill("Sent explanation");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  // Blocking edits during a mutation is also valid. If editing is offered,
  // the later edit must survive and remain guarded after the reply.
  const acceptsPendingEdits = await editor(page).isEnabled();
  if (acceptsPendingEdits) await editor(page).fill("print('new unsaved edit')");
  pending.release();
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeEnabled();
  await expect(editor(page)).toHaveValue(
    acceptsPendingEdits ? "print('new unsaved edit')" : "print('sent')",
  );
  if (!acceptsPendingEdits)
    await editor(page).fill("print('new unsaved edit')");
  await page.getByRole("link", { name: "Back to published questions" }).click();
  await expect(page.getByRole("dialog")).toContainText("unsaved changes");
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]).toMatchObject({
    code: "print('new unsaved edit')",
    expectedRevision: 0,
  });
});

test("independent: failed draft read retries without losing edits and mutations stay disabled until resolved", async ({
  page,
}) => {
  await fixture(page);
  let reads = 0;
  await page.route(`**${detail}/attempt`, (route) => {
    reads++;
    return route.fulfill(
      reads === 1
        ? {
            status: 503,
            json: {
              error: {
                code: "DEPENDENCY_UNAVAILABLE",
                message: "Try again",
                requestId: "synthetic",
              },
            },
          }
        : { json: { attempt } },
    );
  });
  await page.goto(`/learner/questions/${question.id}`);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(editor(page)).toBeDisabled();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(editor(page)).toHaveValue(attempt.code);
  await expect(editor(page)).toBeEnabled();
});

test("independent: a disposed account's save response cannot clear the new learner's unsaved guard", async ({
  page,
}) => {
  await fixture(page);
  let user = f01Learner;
  const pending = gate();
  let received = false;
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ json: { user } }),
  );
  await page.route(`**${detail}/attempt`, async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { attempt: null } });
    const input = route.request().postDataJSON();
    received = true;
    await pending.promise;
    return route.fulfill({
      json: {
        attempt: { ...attempt, code: input.code, reasoning: input.reasoning },
      },
    });
  });
  await open(page);
  await editor(page).fill("print('old account')");
  await reason(page).fill("Old account explanation");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => received).toBe(true);
  user = { ...f01Learner, id: "new-independent-learner", name: "New learner" };
  const changed = page.waitForResponse("**/api/v1/me");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await changed;
  await expect(editor(page)).toHaveValue("");
  await editor(page).fill("print('new account unsaved')");
  await reason(page).fill("New account explanation");
  const oldReply = page.waitForResponse(
    (response) =>
      response.url().endsWith("/attempt") &&
      response.request().method() === "PUT",
  );
  pending.release();
  await oldReply;
  // Flush the completed mutation's React update before checking navigation.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(editor(page)).toHaveValue("print('new account unsaved')");
  await page.getByRole("link", { name: "Back to published questions" }).click();
  await expect(page.getByRole("dialog")).toContainText("unsaved changes");
});

test("independent: lost final reply retries the identical snapshot and locks authoritative final content", async ({
  page,
}) => {
  await fixture(page);
  const writes: unknown[] = [];
  await page.route(`**${detail}/attempt/submit`, (route) => {
    const input = route.request().postDataJSON();
    writes.push(input);
    return writes.length === 1
      ? route.abort("failed")
      : route.fulfill({
          json: {
            attempt: {
              ...attempt,
              code: input.code,
              reasoning: input.reasoning,
              status: "FINAL_SUBMITTED",
              submittedAt: "2026-11-06T00:01:00.000Z",
            },
          },
        });
  });
  await open(page);
  await editor(page).fill("print('final')\n");
  await reason(page).fill("Final reasoning");
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Submit final attempt" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(editor(page)).toHaveValue("print('final')\n");
  await expect(editor(page)).toBeEnabled();
  await page.getByRole("button", { name: "Submit final attempt" }).click();
  await expect(editor(page)).toBeDisabled();
  await expect(
    page.getByRole("alert").filter({ hasText: "read-only" }),
  ).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[1]).toEqual(writes[0]);
});

test("independent: a completed final shows the submitted snapshot even if editing was allowed while its response was pending", async ({
  page,
}) => {
  await fixture(page);
  const pending = gate();
  let received = false;
  await page.route(`**${detail}/attempt/submit`, async (route) => {
    const input = route.request().postDataJSON();
    received = true;
    await pending.promise;
    return route.fulfill({
      json: {
        attempt: {
          ...attempt,
          code: input.code,
          reasoning: input.reasoning,
          status: "FINAL_SUBMITTED",
          submittedAt: "2026-11-06T00:01:00.000Z",
        },
      },
    });
  });
  await open(page);
  await editor(page).fill("print('confirmed final')");
  await reason(page).fill("Confirmed final explanation");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Submit final attempt" }).click();
  await expect.poll(() => received).toBe(true);
  if (await editor(page).isEnabled())
    await editor(page).fill("print('not submitted')");
  pending.release();
  await expect(
    page.getByRole("alert").filter({ hasText: "read-only" }),
  ).toBeVisible();
  await expect(editor(page)).toHaveValue("print('confirmed final')");
});

test("independent: cancel final submission and unsaved navigation, deny failed save without losing code", async ({
  page,
}) => {
  await fixture(page);
  let submits = 0;
  await page.route(`**${detail}/attempt/submit`, (route) => {
    submits++;
    return route.abort();
  });
  await page.route(`**${detail}/attempt`, (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: { attempt: null } })
      : route.fulfill({
          status: 409,
          json: {
            error: {
              code: "CONFLICT",
              message: "Reload before saving",
              requestId: "synthetic",
              mutationOutcome: "NOT_APPLIED",
            },
          },
        }),
  );
  await open(page);
  await editor(page).fill("  print('keep')\n");
  await reason(page).fill("Keep this explanation");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Submit final attempt" }).click();
  expect(submits).toBe(0);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(editor(page)).toHaveValue("  print('keep')\n");
  await page.getByRole("link", { name: "Back to published questions" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(editor(page)).toHaveValue("  print('keep')\n");
});

test("independent: learner focus refresh preserves edits, expiry disables actions, account switch disposes the old attempt", async ({
  page,
}) => {
  await fixture(page);
  let user: typeof f01Learner | null = f01Learner;
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ status: user ? 200 : 401, json: user ? { user } : {} }),
  );
  await page.route(`**${detail}/attempt`, (route) =>
    route.fulfill({
      json: { attempt: user?.id === f01Learner.id ? attempt : null },
    }),
  );
  await open(page);
  await editor(page).fill("print('private unsaved')");
  async function refresh() {
    const response = page.waitForResponse("**/api/v1/me");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await response;
  }
  await refresh();
  await expect(editor(page)).toHaveValue("print('private unsaved')");
  user = null;
  await refresh();
  await expect(editor(page)).toHaveValue("print('private unsaved')");
  await expect(editor(page)).toBeDisabled();
  user = {
    ...f01Learner,
    id: "independent-other-account",
    name: "Other learner",
  };
  await refresh();
  await expect(editor(page)).toHaveValue("");
  await expect(editor(page)).toBeEnabled();
});

test("independent: malicious code stays text and synthetic workspace fits desktop and 320px", async ({
  page,
}, testInfo) => {
  await fixture(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await editor(page).fill("def total(xs):\n    return sum(xs)\n");
  await reason(page).fill("Each list value now contributes to the result.");
  await expect(
    page.locator("script").filter({ hasText: "window.injected" }),
  ).toHaveCount(0);
  const calls: string[] = [];
  page.on("request", (request) => calls.push(request.url()));
  await expect(
    page.getByRole("button", { name: "Run", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("region", { name: "Output" })).toContainText(
    "Run is unavailable",
  );
  await page.screenshot({
    path: testInfo.outputPath("workspace-desktop-1440x900.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(
    page.getByRole("button", { name: "Submit final attempt" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.screenshot({
    path: testInfo.outputPath("workspace-mobile-320x800.png"),
    fullPage: true,
  });
  expect(calls.filter((url) => /\/ai\/|\/run(?:\?|$)/.test(url))).toEqual([]);
});
