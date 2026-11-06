// Independent PR10 acceptance: browser lifecycle and real pointer hit-testing;
// learner/session HTTP responses are explicit synthetic transport doubles.
import { expect, test, type Locator, type Page } from "@playwright/test";
import type {
  LearnerAttempt,
  LearnerAttemptWrite,
} from "@debugclinic/contracts";
import { f01Learner } from "../support/f01-fixtures.js";

const question = {
  id: "recovery-case",
  versionId: "recovery-version",
  title: "Recover a list fix",
  topic: "Python lists",
  instructorName: "Synthetic Instructor",
  publishedAt: "2026-11-06T00:00:00.000Z",
  problemStatement: "Sum every value.",
  buggyCode: "print(0)\n",
  expectedBehavior: "Print every value's total.",
};
const initial: LearnerAttempt = {
  id: "recovery-attempt",
  code: "print('old')\n",
  reasoning: "Old reasoning",
  revision: 2,
  status: "DRAFT",
  submittedAt: null,
};
const local = {
  code: "def total(xs):\n    return sum(xs)\n",
  reasoning: "Include every value; retain indentation.",
};
const path = `/api/v1/learner/questions/${question.id}/attempt`;
const code = (page: Page) =>
  page.getByRole("textbox", { name: "Your Python 3 code" });
const reasoning = (page: Page) =>
  page.getByRole("textbox", { name: "Explain your reasoning" });
const save = (page: Page) =>
  page.getByRole("button", { name: "Save draft", exact: true });
const submit = (page: Page) =>
  page.getByRole("button", { name: "Submit final attempt", exact: true });
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
type FirstWrite = (
  input: LearnerAttemptWrite,
  final: boolean,
) => LearnerAttempt | null;
async function fixture(
  page: Page,
  options: {
    initial: LearnerAttempt | null;
    firstWrite: FirstWrite;
    failure?: "lost" | "conflict";
    recoveryFailures?: number;
    recoveryGate?: ReturnType<typeof gate>;
  },
) {
  const state = {
    user: f01Learner as typeof f01Learner | null,
    server: options.initial,
    writes: [] as Array<{
      input: LearnerAttemptWrite;
      method: string;
      url: string;
    }>,
    events: [] as string[],
    recoveryReads: 0,
    failuresLeft: options.recoveryFailures ?? 0,
  };
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      status: state.user ? 200 : 401,
      json: state.user ? { user: state.user } : {},
    }),
  );
  await page.route(`**/api/v1/learner/questions/${question.id}`, (route) =>
    route.fulfill({ json: { question } }),
  );
  await page.route(`**${path}**`, async (route) => {
    const request = route.request();
    state.events.push(request.method());
    if (request.method() === "GET") {
      const belongsToOriginalUser = state.user?.id === f01Learner.id;
      const snapshot = belongsToOriginalUser ? state.server : null;
      if (state.writes.length && belongsToOriginalUser) {
        state.recoveryReads++;
        if (state.failuresLeft-- > 0)
          return route.fulfill({
            status: 503,
            json: {
              error: {
                code: "DEPENDENCY_UNAVAILABLE",
                message: "Synthetic recovery unavailable",
                requestId: "recovery-read",
              },
            },
          });
        if (options.recoveryGate) await options.recoveryGate.promise;
      }
      return route.fulfill({ json: { attempt: snapshot } });
    }
    const input = request.postDataJSON() as LearnerAttemptWrite;
    const final = request.url().endsWith("/submit");
    state.writes.push({ input, method: request.method(), url: request.url() });
    if (state.writes.length === 1) {
      state.server = options.firstWrite(input, final);
      if (options.failure === "conflict")
        return route.fulfill({
          status: 409,
          json: {
            error: {
              code: "CONFLICT",
              message: "Revision changed",
              mutationOutcome: "NOT_APPLIED",
              requestId: "recovery-write",
            },
          },
        });
      return route.abort("failed");
    }
    state.server = snapshot(input, (state.server?.revision ?? -1) + 1, final);
    return route.fulfill({ json: { attempt: state.server } });
  });
  await page.goto(`/learner/questions/${question.id}`);
  await expect(code(page)).toBeEnabled();
  return state;
}
function snapshot(
  input: LearnerAttemptWrite,
  revision: number,
  final = false,
): LearnerAttempt {
  return {
    id: initial.id,
    code: input.code,
    reasoning: input.reasoning,
    revision,
    status: final ? "FINAL_SUBMITTED" : "DRAFT",
    submittedAt: final ? "2026-11-06T00:01:00.000Z" : null,
  };
}
async function edit(page: Page, value = local) {
  await code(page).fill(value.code);
  await reasoning(page).fill(value.reasoning);
}
async function stillGuarded(page: Page) {
  await page.getByRole("link", { name: "Back to published questions" }).click();
  await expect(page.getByRole("dialog")).toContainText("unsaved changes");
  await page.getByRole("button", { name: "Stay", exact: true }).click();
}
async function refresh(page: Page) {
  const response = page.waitForResponse("**/api/v1/me");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await response;
}

async function pointerActivate(page: Page, button: Locator) {
  const viewport = page.viewportSize()!;
  // Wheel the page from its outer margin, avoiding textarea scroll capture.
  // Locator.click() alone can programmatically scroll overflow:hidden ancestors.
  if (viewport.width < 900) {
    await page.mouse.move(viewport.width - 2, viewport.height / 2);
    for (let n = 0; n < 5; n++) {
      const box = await button.boundingBox();
      if (box && box.y >= 0 && box.y + box.height <= viewport.height) break;
      await page.mouse.wheel(0, 800);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
    }
  }
  const hit = await button.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    let left = Math.max(0, bounds.left),
      right = Math.min(innerWidth, bounds.right);
    let top = Math.max(0, bounds.top),
      bottom = Math.min(innerHeight, bounds.bottom);
    for (
      let parent = element.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      const style = getComputedStyle(parent),
        box = parent.getBoundingClientRect();
      if (/hidden|clip|auto|scroll/.test(style.overflowX)) {
        left = Math.max(left, box.left);
        right = Math.min(right, box.right);
      }
      if (/hidden|clip|auto|scroll/.test(style.overflowY)) {
        top = Math.max(top, box.top);
        bottom = Math.min(bottom, box.bottom);
      }
    }
    const x = bounds.left + bounds.width / 2,
      y = bounds.top + bounds.height / 2;
    const target = document.elementFromPoint(x, y);
    return {
      x,
      y,
      visibleHeight: Math.max(0, bottom - top),
      visibleWidth: Math.max(0, right - left),
      centerInsideClips: x >= left && x <= right && y >= top && y <= bottom,
      hit: !!target && element.contains(target),
    };
  });
  expect(hit.visibleHeight).toBeGreaterThan(0);
  expect(hit.visibleWidth).toBeGreaterThan(0);
  expect(
    hit.centerInsideClips,
    "the action center must be inside every clipping ancestor",
  ).toBe(true);
  expect(hit.hit, "real pointer target must be the action").toBe(true);
  await page.mouse.click(hit.x, hit.y);
}

for (const exists of [false, true]) {
  test(`PR10 lost committed ${exists ? "existing" : "initial"} save reads revision before the next intentional write`, async ({
    page,
  }) => {
    const pending = gate();
    const revision = exists ? 3 : 0;
    const state = await fixture(page, {
      initial: exists ? initial : null,
      firstWrite: (input) => snapshot(input, revision),
      recoveryGate: pending,
    });
    await edit(page);
    await save(page).click();
    await expect.poll(() => state.recoveryReads).toBe(1);
    expect(state.writes).toHaveLength(1);
    await expect(save(page)).toBeDisabled();
    await expect(submit(page)).toBeDisabled();
    await expect(code(page)).toHaveValue(local.code);
    await stillGuarded(page);
    pending.release();
    await expect(save(page)).toBeEnabled();
    await expect(code(page)).toHaveValue(local.code);
    expect(state.writes).toHaveLength(1);
    await code(page).fill(local.code + "# next intentional edit\n");
    await save(page).click();
    await expect.poll(() => state.writes.length).toBe(2);
    expect(state.writes[1]!.input).toMatchObject({
      expectedRevision: revision,
      code: local.code + "# next intentional edit\n",
      reasoning: local.reasoning,
    });
    expect(
      state.events.slice(
        state.events.indexOf("PUT"),
        state.events.lastIndexOf("PUT") + 1,
      ),
    ).toEqual(["PUT", "GET", "PUT"]);
  });
}

test("PR10 409 newer draft preserves local text and dirty state, then uses the recovered revision", async ({
  page,
}) => {
  const state = await fixture(page, {
    initial,
    failure: "conflict",
    firstWrite: () => ({
      ...initial,
      code: "print('other tab')",
      reasoning: "Other tab reasoning",
      revision: 9,
    }),
  });
  await edit(page);
  await save(page).click();
  await expect.poll(() => state.recoveryReads).toBe(1);
  await expect(save(page)).toBeEnabled();
  await expect(code(page)).toHaveValue(local.code);
  await expect(reasoning(page)).toHaveValue(local.reasoning);
  await stillGuarded(page);
  expect(state.writes).toHaveLength(1);
  await save(page).click();
  await expect.poll(() => state.writes.length).toBe(2);
  expect(state.writes[1]!.input).toEqual({ ...local, expectedRevision: 9 });
});

test("PR10 null recovery preserves unsaved text and the next Save creates with null revision", async ({
  page,
}) => {
  const state = await fixture(page, {
    initial,
    failure: "conflict",
    firstWrite: () => null,
  });
  await edit(page);
  await save(page).click();
  await expect.poll(() => state.recoveryReads).toBe(1);
  await expect(save(page)).toBeEnabled();
  await expect(code(page)).toHaveValue(local.code);
  await stillGuarded(page);
  expect(state.writes).toHaveLength(1);
  await save(page).click();
  await expect.poll(() => state.writes.length).toBe(2);
  expect(state.writes[1]!.input).toEqual({ ...local, expectedRevision: null });
});

test("PR10 failed recovery gates both mutations until explicit GET retry succeeds", async ({
  page,
}) => {
  const state = await fixture(page, {
    initial,
    failure: "conflict",
    firstWrite: () => ({ ...initial, revision: 7 }),
    recoveryFailures: 1,
  });
  await edit(page);
  await save(page).click();
  const retry = page.getByRole("button", {
    name: "Retry attempt check",
    exact: true,
  });
  await expect(retry).toBeEnabled();
  await expect(save(page)).toBeDisabled();
  await expect(submit(page)).toBeDisabled();
  await expect(code(page)).toHaveValue(local.code);
  await expect(reasoning(page)).toHaveValue(local.reasoning);
  await stillGuarded(page);
  expect(state.writes).toHaveLength(1);
  await retry.click();
  await expect.poll(() => state.recoveryReads).toBe(2);
  await expect(save(page)).toBeEnabled();
  expect(state.writes).toHaveLength(1);
  await save(page).click();
  await expect.poll(() => state.writes.length).toBe(2);
  expect(state.writes[1]!.input).toEqual({ ...local, expectedRevision: 7 });
});

test("PR10 lost final reply confirms immutable server content without automatically retrying POST", async ({
  page,
}) => {
  const state = await fixture(page, {
    initial,
    firstWrite: (input) => snapshot(input, 3, true),
  });
  await edit(page);
  page.once("dialog", (dialog) => dialog.accept());
  await submit(page).click();
  await expect.poll(() => state.recoveryReads).toBe(1);
  await expect(code(page)).toBeDisabled();
  await expect(code(page)).toHaveValue(local.code);
  await expect(
    page.getByRole("alert").filter({ hasText: "read-only" }).first(),
  ).toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0]!.method).toBe("POST");
});

test("PR10 different immutable final is authoritative while unsent local text remains distinct and guarded", async ({
  page,
}) => {
  const server = {
    ...initial,
    code: "print('authoritative final')",
    reasoning: "Authoritative reasoning",
    revision: 11,
    status: "FINAL_SUBMITTED" as const,
    submittedAt: "2026-11-06T00:01:00.000Z",
  };
  const unsent = {
    code: "# <script>window.pr10 = true</script>\nprint('unsent')",
    reasoning: "Unsent local reasoning",
  };
  const state = await fixture(page, {
    initial,
    failure: "conflict",
    firstWrite: () => server,
  });
  await edit(page, unsent);
  page.once("dialog", (dialog) => dialog.accept());
  await submit(page).click();
  await expect.poll(() => state.recoveryReads).toBe(1);
  await expect(code(page)).toHaveValue(server.code);
  await expect(reasoning(page)).toHaveValue(server.reasoning);
  await expect(submit(page)).toBeDisabled();
  const retained = page
    .getByRole("alert")
    .filter({ hasText: "These local edits were not submitted" });
  await expect(retained).toContainText(unsent.code);
  await expect(retained).toContainText(unsent.reasoning);
  await expect(
    page.locator("script").filter({ hasText: "window.pr10" }),
  ).toHaveCount(0);
  await stillGuarded(page);
  expect(state.writes).toHaveLength(1);
});

test("PR10 late recovery from a disposed account cannot affect the current learner or dirty guard", async ({
  page,
}) => {
  const pending = gate();
  const state = await fixture(page, {
    initial,
    failure: "conflict",
    firstWrite: () => ({ ...initial, revision: 8 }),
    recoveryGate: pending,
  });
  await edit(page);
  await save(page).click();
  await expect.poll(() => state.recoveryReads).toBe(1);
  state.user = {
    ...f01Learner,
    id: "pr10-other-learner",
    name: "Other learner",
  };
  await refresh(page);
  await expect(code(page)).toBeEnabled();
  await expect(code(page)).toHaveValue("");
  const current = {
    code: "print('current learner')",
    reasoning: "Current learner's unsaved reasoning",
  };
  await edit(page, current);
  const oldReply = page.waitForResponse(
    (response) =>
      response.url().endsWith(path) && response.request().method() === "GET",
  );
  pending.release();
  await oldReply;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(code(page)).toHaveValue(current.code);
  await expect(reasoning(page)).toHaveValue(current.reasoning);
  await stillGuarded(page);
  expect(state.writes).toHaveLength(1);
});

test("PR10 expired session retains unsent text and ignores a pending recovery until explicit retry after restore", async ({
  page,
}) => {
  const pending = gate();
  const state = await fixture(page, {
    initial,
    failure: "conflict",
    firstWrite: () => ({ ...initial, revision: 8 }),
    recoveryGate: pending,
  });
  await edit(page);
  await save(page).click();
  await expect.poll(() => state.recoveryReads).toBe(1);
  state.user = null;
  await refresh(page);
  await expect(code(page)).toHaveValue(local.code);
  await expect(save(page)).toBeDisabled();
  const oldReply = page.waitForResponse(
    (response) =>
      response.url().endsWith(path) && response.request().method() === "GET",
  );
  pending.release();
  await oldReply;
  await expect(code(page)).toHaveValue(local.code);
  await expect(save(page)).toBeDisabled();
  state.user = f01Learner;
  await refresh(page);
  const retry = page.getByRole("button", {
    name: "Retry attempt check",
    exact: true,
  });
  await expect(retry).toBeEnabled();
  await retry.click();
  await expect(save(page)).toBeEnabled();
  await expect(code(page)).toHaveValue(local.code);
  await stillGuarded(page);
  expect(state.writes).toHaveLength(1);
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 600 },
  { width: 320, height: 800 },
]) {
  test(`PR10 long valid reasoning leaves real pointer access to Save and Submit at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    const longReasoning = Array.from(
      { length: 90 },
      (_, n) => `Line ${n}: include this value.`,
    ).join("\n");
    expect(longReasoning.length).toBeLessThan(5000);
    await page.setViewportSize(viewport);
    const state = await fixture(page, {
      initial,
      firstWrite: (input) => snapshot(input, 3),
    });
    await edit(page, { code: local.code, reasoning: longReasoning });
    const separator = page.getByRole("separator", {
      name: "Resize editor and output",
    });
    if (viewport.width >= 900) {
      await separator.focus();
      for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowUp");
      await expect(separator).toHaveAttribute("aria-valuenow", "320");
    }
    await pointerActivate(page, save(page));
    await expect.poll(() => state.writes.length).toBe(1);
    await expect(save(page)).toBeEnabled();
    expect(state.writes[0]!.input.reasoning).toBe(longReasoning);
    let confirmation = false;
    page.once("dialog", async (dialog) => {
      confirmation = true;
      await dialog.dismiss();
    });
    await pointerActivate(page, submit(page));
    await expect.poll(() => confirmation).toBe(true);
    expect(state.writes).toHaveLength(1); // Cancellation must not submit.
    await expect(reasoning(page)).toHaveValue(longReasoning);
    await page.screenshot({
      path: testInfo.outputPath(
        `reasoning-${viewport.width}x${viewport.height}.png`,
      ),
      fullPage: true,
    });
  });
}
