// Independent IDE acceptance. Auth/question/attempt HTTP are synthetic doubles;
// all successful Python execution uses real fixed, locally served pinned assets.
import { expect, test, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { f01Learner } from "../support/f01-fixtures.js";
import { PublishedQuestionResponseSchema } from "@debugclinic/contracts";
import {
  expectPythonCode,
  expectPythonEditable,
  fillPythonCode,
  pointerActivate,
} from "../support/python-editor.js";

const question = {
  id: "python-ide",
  versionId: "python-version",
  title: "Sum every value",
  topic: "Python lists",
  instructorName: "Synthetic Instructor",
  publishedAt: "2026-11-06T00:00:00.000Z",
  problemStatement: "Include every value in the total.",
  buggyCode: "def total(xs):\n    return sum(xs[:-1])\n",
  expectedBehavior: "total([3, 4, 5]) returns 12.",
};
const editor = (page: Page) =>
  page.getByRole("textbox", { name: "Your Python 3 code" });
const output = (page: Page) =>
  page.getByLabel("Python output", { exact: true });
const result = (page: Page) =>
  page.getByRole("region", { name: "Output", exact: true });
const runButton = (page: Page) =>
  page.getByRole("button", { name: "Run", exact: true });
async function fixture(
  page: Page,
  saved: { code: string; status?: "DRAFT" | "FINAL_SUBMITTED" } | null = null,
  long = false,
) {
  const state = {
    user: f01Learner as typeof f01Learner | null,
    writes: [] as Record<string, unknown>[],
  };
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      status: state.user ? 200 : 401,
      json: state.user ? { user: state.user } : {},
    }),
  );
  await page.route("**/api/v1/learner/questions/python-ide", (route) =>
    route.fulfill({
      json: PublishedQuestionResponseSchema.parse({
        question: {
          ...question,
          problemStatement: long
            ? "Read every value carefully.\n\n".repeat(50)
            : question.problemStatement,
        },
      }),
    }),
  );
  await page.route(
    "**/api/v1/learner/questions/python-ide/attempt**",
    (route) => {
      if (route.request().method() === "GET")
        return route.fulfill({
          json: {
            attempt:
              saved && state.user?.id === f01Learner.id
                ? {
                    id: "python-attempt",
                    code: saved.code,
                    reasoning: "Saved reasoning",
                    revision: 2,
                    status: saved.status ?? "DRAFT",
                    submittedAt:
                      saved.status === "FINAL_SUBMITTED"
                        ? "2026-11-06T00:01:00.000Z"
                        : null,
                  }
                : null,
          },
        });
      const body = route.request().postDataJSON();
      state.writes.push(body);
      const final = route.request().url().endsWith("/submit");
      return route.fulfill({
        json: {
          attempt: {
            id: "python-attempt",
            code: body.code,
            reasoning: body.reasoning,
            revision: 3,
            status: final ? "FINAL_SUBMITTED" : "DRAFT",
            submittedAt: final ? "2026-11-06T00:01:00.000Z" : null,
          },
        },
      });
    },
  );
  await page.goto("/learner/questions/python-ide");
  await expectPythonEditable(editor(page), saved?.status !== "FINAL_SUBMITTED");
  return state;
}
async function run(page: Page, code: string, mode: "Run" | "Test" = "Run") {
  await fillPythonCode(editor(page), code);
  await page.getByRole("button", { name: mode, exact: true }).click();
}
async function completed(page: Page, mode: "Run" | "Test" = "Run") {
  await expect(result(page).getByRole("status")).toHaveText(
    mode === "Run" ? "Completed" : "Scratch tests completed",
    { timeout: 20_000 },
  );
  await expect(
    page.locator('iframe[title="Isolated Python execution"]'),
  ).toHaveCount(0);
}
async function refresh(page: Page) {
  const response = page.waitForResponse("**/api/v1/me");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await response;
}

test("IDE Home and brand preserve authentication and dirty navigation on desktop/mobile", async ({
  page,
}) => {
  await fixture(page);
  await expectPythonCode(editor(page), question.buggyCode);
  await expect(page.locator(".cm-lineNumbers")).toBeVisible();
  await expect(editor(page).locator("span[class]").first()).toBeVisible();
  await fillPythonCode(editor(page), "print('unsaved')");
  const menu = page.getByRole("button", { name: /open navigation/i });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("link", { name: "Home", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("unsaved changes");
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await expectPythonCode(editor(page), "print('unsaved')");
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("link", { name: "Home", exact: true })
    .filter({ visible: true })
    .click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", {
      name: "Debug Python without surrendering the thinking.",
      exact: true,
    }),
  ).toBeVisible();
  if (await menu.isVisible()) await menu.click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  if (await menu.isVisible()) await page.keyboard.press("Escape");
  await page.goto("/learner/questions/python-ide");
  await expectPythonCode(editor(page), question.buggyCode);
  await page.getByRole("link", { name: "DebugClinic", exact: true }).click();
  await expect(page).toHaveURL(/\/$/); // starter/programmatic load must be clean
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("IDE real Python executes stdout/stderr, scratch assertions and stdin without saving scratch state", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = await fixture(page);
  await context.addCookies([
    { name: "ide-cookie-probe", value: "synthetic-secret", url: page.url() },
  ]);
  const assets: Array<{ path: string; cookie: string }> = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/pyodide-runtime/"))
      assets.push({
        path: new URL(request.url()).pathname,
        cookie: request.headers()["cookie"] ?? "",
      });
  });
  await run(
    page,
    "import sys\nprint(sys.version.split()[0])\nprint(sum([3, 4, 5]))\nprint('stderr-visible', file=sys.stderr)\n",
  );
  await completed(page);
  await expect(output(page)).toContainText("3.14.2");
  await expect(output(page)).toContainText("12");
  await expect(output(page)).toContainText("stderr-visible");
  expect(assets.map((entry) => entry.path).sort()).toEqual(
    [
      "/pyodide-runtime/pyodide-lock.json",
      "/pyodide-runtime/pyodide.asm.wasm",
      "/pyodide-runtime/python_stdlib.zip",
      "/pyodide-runtime/worker.js",
    ].sort(),
  );
  expect(assets.every((entry) => entry.cookie === "")).toBe(true);
  await page
    .getByRole("textbox", { name: "Scratch tests (not saved)", exact: true })
    .fill("assert total([3, 4, 5]) == 12\nprint('learner-tests-ok')");
  await run(page, "def total(xs):\n    return sum(xs)\n", "Test");
  await completed(page, "Test");
  await expect(output(page)).toContainText("learner-tests-ok");
  await page
    .getByRole("textbox", { name: "Standard input (not saved)", exact: true })
    .fill("Ada\n");
  await run(page, "print('Hello ' + input())\n");
  await completed(page);
  await expect(output(page)).toContainText("Hello Ada");
  await page
    .getByRole("textbox", { name: "Explain your reasoning" })
    .fill("The name comes from local stdin.");
  expect(state.writes).toEqual([]); // local execution must never mutate attempt state
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(Object.keys(state.writes[0]!).sort()).toEqual([
    "code",
    "expectedRevision",
    "reasoning",
  ]);
  expect(state.writes[0]!["code"]).toBe("print('Hello ' + input())\n");
  expect(errors).toEqual([]);
});

test("IDE blank tests, syntax and assertion errors are honest local feedback and edits mark output stale", async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole("button", { name: "Test", exact: true }).click();
  await expect(result(page).getByRole("alert")).toContainText(
    "Add a scratch assertion",
  );
  await expect(page.locator("iframe")).toHaveCount(0);
  await run(page, "def broken(:\n    pass\n");
  await expect(result(page).getByRole("alert")).toContainText("SyntaxError", {
    timeout: 20_000,
  });
  await page
    .getByRole("textbox", { name: "Scratch tests (not saved)", exact: true })
    .fill("assert total([3, 5]) == 99");
  await run(page, "def total(xs):\n    return sum(xs)\n", "Test");
  await expect(result(page).getByRole("alert")).toContainText(
    "AssertionError",
    { timeout: 20_000 },
  );
  await fillPythonCode(editor(page), "print('changed')");
  await expect(result(page)).toContainText("Inputs changed since this run");
  await expect(
    page.getByText(/Results are local feedback, not official grading/),
  ).toBeVisible();
});

test("IDE Stop and real five-second timeout destroy infinite runs and permit fresh state reruns", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await fixture(page);
  await run(page, "while True:\n    pass\n");
  await expect(result(page).getByRole("status")).toHaveText("Running…", {
    timeout: 20_000,
  });
  await expect(page.locator("iframe")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(result(page).getByRole("status")).toHaveText("Stopped");
  await expect(page.locator("iframe")).toHaveCount(0);
  await run(
    page,
    "import os\nsecret = 42\nopen('/tmp/ide-secret', 'w').write('private')\nprint('first-run')\n",
  );
  await completed(page);
  await run(
    page,
    "import os\nassert 'secret' not in globals()\nassert not os.path.exists('/tmp/ide-secret')\nprint('fresh-state')\n",
  );
  await completed(page);
  await expect(output(page)).toContainText("fresh-state");
  await run(page, "while True:\n    pass\n");
  await expect(result(page).getByRole("status")).toHaveText("Running…");
  const started = Date.now();
  await expect(result(page).getByRole("status")).toHaveText("Timed out", {
    timeout: 10_000,
  });
  expect(Date.now() - started).toBeGreaterThan(4000);
  await expect(page.locator("iframe")).toHaveCount(0);
  await run(page, "print('after-timeout')\n");
  await completed(page);
  await expect(output(page)).toContainText("after-timeout");
});

for (const [name, source] of [
  ["unicode", "print('a' + '😀' * 40000)"],
  ["flood", "for i in range(2000):\n    print('line-' + str(i) + 'x' * 100)"],
] as const) {
  test(`IDE ${name} output is bounded, Unicode-safe and explicitly truncated`, async ({
    page,
  }) => {
    await fixture(page);
    await run(page, source);
    await completed(page);
    const text = (await output(page).textContent()) ?? "";
    expect(text.length).toBeLessThanOrEqual(64 * 1024);
    expect(
      [...text].every((point) => {
        const scalar = point.codePointAt(0)!;
        return scalar < 0xd800 || scalar > 0xdfff;
      }),
    ).toBe(true);
    expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(
      64 * 1024,
    );
    expect(text).toMatch(/truncated/i);
  });
}

test("IDE stdout without a newline remains actual visible output", async ({
  page,
}) => {
  await fixture(page);
  await run(page, "print('NO_NEWLINE_OUTPUT', end='')");
  await completed(page);
  await expect(output(page)).toContainText("NO_NEWLINE_OUTPUT");
});

test("IDE real sandbox denies app storage, parent DOM, API/external network and host files", async ({
  page,
}) => {
  test.setTimeout(40_000);
  const requests: string[] = [],
    consoleErrors: string[] = [],
    pageErrors: string[] = [];
  await page.route("**/api/v1/ide-probe**", (route) => {
    requests.push(route.request().url());
    return route.fulfill({ json: {} });
  });
  await page.route("https://ide-probe.invalid/**", (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await fixture(page);
  const origin = new URL(page.url()).origin;
  const hostFile = resolve(process.cwd(), "AGENTS.md");
  expect(existsSync(hostFile)).toBe(true); // denial must target an actually existing host file
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (/^https?:$/.test(url.protocol) && url.origin !== origin)
      requests.push(request.url());
  });
  page.on("websocket", (socket) => requests.push(socket.url()));
  const source = `import js\nprint('dom', js.eval('typeof document'))\nprint('parent', js.eval('typeof parent'))\nprint('node', js.eval('typeof process'))\nprint('origin', js.eval('self.origin'))\nprint('dedicated', js.eval('self instanceof DedicatedWorkerGlobalScope'))\nfor label, expression in [('cookie', 'document.cookie'), ('storage', 'localStorage.getItem("session")'), ('idb', 'indexedDB.open("ide-probe")')]:\n    try:\n        js.eval(expression)\n        print(label + '-UNEXPECTED')\n    except Exception:\n        print(label + '-denied')\nfor url in [${JSON.stringify(origin + "/api/v1/ide-probe")}, 'https://ide-probe.invalid/probe']:\n    try:\n        await js.fetch(url)\n        print('network-UNEXPECTED')\n    except Exception:\n        print('network-denied')\ntry:\n    open(${JSON.stringify(hostFile)}).read()\n    print('host-UNEXPECTED')\nexcept Exception:\n    print('host-denied')\n`;
  await run(page, source);
  await completed(page);
  await expect(output(page)).toContainText("dom undefined");
  await expect(output(page)).toContainText("parent undefined");
  await expect(output(page)).toContainText("node undefined");
  await expect(output(page)).toContainText("origin null");
  await expect(output(page)).toContainText("dedicated True");
  for (const value of [
    "cookie-denied",
    "storage-denied",
    "idb-denied",
    "network-denied",
    "host-denied",
  ])
    await expect(output(page)).toContainText(value);
  await expect(output(page)).not.toContainText("UNEXPECTED");
  expect(requests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(
    consoleErrors.filter(
      (text) =>
        !/Content Security Policy|violates.*directive|Refused to connect|Connecting to/i.test(
          text,
        ),
    ),
  ).toEqual([]);
});

test("IDE asset failure rejects safely and an explicit healthy rerun works", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/pyodide-runtime/worker.js", (route) =>
    fail
      ? route.fulfill({ status: 503, body: "unavailable" })
      : route.continue(),
  );
  await fixture(page);
  await run(page, "print('recovered-assets')");
  await expect(result(page).getByRole("status")).toHaveText("Error");
  await expect(page.locator("iframe")).toHaveCount(0);
  fail = false;
  await runButton(page).click();
  await completed(page);
  await expect(output(page)).toContainText("recovered-assets");
});

for (const action of ["Stop", "timeout"] as const) {
  test(`IDE ${action} during stalled asset initialization permits a fresh healthy explicit rerun`, async ({
    page,
  }) => {
    const held: Array<() => void> = [];
    let requests = 0;
    await page.clock.install();
    await page.route("**/pyodide-runtime/worker.js", async (route) => {
      requests++;
      if (requests === 1)
        await new Promise<void>((resolve) => held.push(resolve));
      await route.continue().catch(() => {}); // context teardown can close held request
    });
    try {
      await fixture(page);
      await run(page, "print('healthy-rerun')");
      await expect.poll(() => requests).toBe(1);
      if (action === "Stop")
        await page.getByRole("button", { name: "Stop", exact: true }).click();
      else {
        await page.clock.fastForward(31_000);
        await expect(result(page).getByRole("status")).toHaveText("Timed out");
      }
      await expect(page.locator("iframe")).toHaveCount(0);
      await runButton(page).click();
      await expect.poll(() => requests, { timeout: 4000 }).toBe(2);
      await completed(page);
      await expect(output(page)).toContainText("healthy-rerun");
    } finally {
      held.forEach((release) => release());
    }
  });
}

test("IDE active runs dispose on account change and expiry without changing the new dirty editor", async ({
  page,
}) => {
  const state = await fixture(page);
  await run(page, "while True:\n    pass\n");
  await expect(result(page).getByRole("status")).toHaveText("Running…", {
    timeout: 20_000,
  });
  state.user = { ...f01Learner, id: "ide-new-learner", name: "Other learner" };
  await refresh(page);
  await expect(page.locator("iframe")).toHaveCount(0);
  await expectPythonCode(editor(page), question.buggyCode);
  await fillPythonCode(editor(page), "print('new learner unsaved')");
  await page.getByRole("link", { name: "Back to published questions" }).click();
  await expect(page.getByRole("dialog")).toContainText("unsaved changes");
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await runButton(page).click();
  await expect(result(page).getByRole("status")).toHaveText("Loading Python…");
  state.user = null;
  await refresh(page);
  await expect(page.locator("iframe")).toHaveCount(0);
  await expectPythonCode(editor(page), "print('new learner unsaved')");
  await expectPythonEditable(editor(page), false);
  expect(state.writes).toEqual([]);
});

test("IDE saved/final authority and UTF16 limit survive real editor keyboard undo and indentation", async ({
  page,
}) => {
  const state = await fixture(page, { code: "print('saved authority')\n" });
  await expectPythonCode(editor(page), "print('saved authority')\n");
  await fillPythonCode(editor(page), "if True:");
  await editor(page).press("End");
  await editor(page).press("Enter");
  await expectPythonCode(editor(page), "if True:\n    ");
  await editor(page).press("ControlOrMeta+z");
  await expectPythonCode(editor(page), "if True:");
  const exact = "#" + "😀".repeat(9999) + "x";
  expect(exact.length).toBe(20_000);
  await fillPythonCode(editor(page), exact);
  await editor(page).press("End");
  await editor(page).press("x");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  // CodeMirror virtualizes long lines. The real saved wire payload observes
  // the complete document and proves the rejected extra unit, without a mirror.
  expect(state.writes[0]!["code"]).toBe(exact);
  await page.reload();
  await expectPythonCode(editor(page), "print('saved authority')\n");
  await page.getByRole("link", { name: "DebugClinic", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("IDE active execution survives navigation cancellation and disposes on confirmed Home", async ({
  page,
}) => {
  const state = await fixture(page);
  await run(page, "while True:\n    pass\n");
  await expect(result(page).getByRole("status")).toHaveText("Running…", {
    timeout: 20_000,
  });
  const brand = page.getByRole("link", { name: "DebugClinic", exact: true });
  await brand.click();
  await expect(page.getByRole("dialog")).toContainText("unsaved changes");
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(page.locator("iframe")).toHaveCount(1);
  await brand.click();
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test("IDE final content is authoritative, visibly read-only and cannot mutate", async ({
  page,
}) => {
  const state = await fixture(page, {
    code: "print('immutable final')\n",
    status: "FINAL_SUBMITTED",
  });
  await expectPythonCode(editor(page), "print('immutable final')\n");
  await editor(page).focus();
  await editor(page).press("x");
  await expectPythonCode(editor(page), "print('immutable final')\n");
  await expectPythonEditable(editor(page), false);
  for (const name of ["Save draft", "Submit final attempt", "Run", "Test"])
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toBeDisabled();
  expect(state.writes).toEqual([]);
});

test("IDE real worker ignores wrong-source/nonce/run-id and stale bridge output", async ({
  page,
}) => {
  await fixture(page);
  await run(page, "while True:\n    pass\n");
  await expect(result(page).getByRole("status")).toHaveText("Running…", {
    timeout: 20_000,
  });
  await page.evaluate(() => {
    const frame = document.querySelector<HTMLIFrameElement>(
      'iframe[title="Isolated Python execution"]',
    )!;
    const ids = frame.srcdoc.match(
      /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g,
    )!;
    const bridge = {
      source: frame.contentWindow,
      nonce: ids[0]!,
      runId: ids[1]!,
    };
    (window as Window & { ideOldBridge?: typeof bridge }).ideOldBridge = bridge;
    const valid = {
      type: "output",
      channel: "stdout",
      text: "INJECTED-BRIDGE",
      nonce: bridge.nonce,
      runId: bridge.runId,
    };
    for (const message of [
      { source: window, origin: "null", data: valid },
      { source: bridge.source, origin: location.origin, data: valid },
      {
        source: bridge.source,
        origin: "null",
        data: { ...valid, nonce: "wrong" },
      },
      {
        source: bridge.source,
        origin: "null",
        data: { ...valid, runId: "wrong" },
      },
      {
        source: bridge.source,
        origin: "null",
        data: Object.assign(Object.create(null), valid),
      },
    ])
      window.dispatchEvent(new MessageEvent("message", message));
  });
  await expect(output(page)).not.toContainText("INJECTED-BRIDGE");
  await expect(result(page).getByRole("status")).toHaveText("Running…");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await run(page, "print('fresh-bridge')");
  await page.evaluate(() => {
    const bridge = (
      window as Window & {
        ideOldBridge?: { source: Window | null; nonce: string; runId: string };
      }
    ).ideOldBridge!;
    window.dispatchEvent(
      new MessageEvent("message", {
        source: bridge.source,
        origin: "null",
        data: {
          type: "output",
          channel: "stdout",
          text: "STALE-BRIDGE",
          nonce: bridge.nonce,
          runId: bridge.runId,
        },
      }),
    );
  });
  await completed(page);
  await expect(output(page)).toContainText("fresh-bridge");
  await expect(output(page)).not.toContainText("STALE-BRIDGE");
});

test("IDE description and expanded scratch/input/reasoning preserve independent scrolling and reachable actions", async ({
  page,
}, testInfo) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 600 },
    { width: 320, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    const state = await fixture(page, null, true);
    const description = page.getByRole("article", { name: "Question details" });
    await expect(
      description.getByRole("heading", { name: "Description", exact: true }),
    ).toBeVisible();
    await expect
      .soft(
        description.getByRole("heading", { name: question.title, exact: true }),
      )
      .toBeVisible();
    if (viewport.width >= 900) {
      const separator = page.getByRole("separator", {
        name: "Resize editor and output",
      });
      const current = Number(await separator.getAttribute("aria-valuenow"));
      expect
        .soft(
          current,
          "separator current value must respect accessible minimum",
        )
        .toBeGreaterThanOrEqual(
          Number(await separator.getAttribute("aria-valuemin")),
        );
      expect
        .soft(
          current,
          "separator current value must respect accessible maximum",
        )
        .toBeLessThanOrEqual(
          Number(await separator.getAttribute("aria-valuemax")),
        );
      await separator.focus();
      for (let n = 0; n < 24; n++) await page.keyboard.press("ArrowUp");
      await expect(separator).toHaveAttribute(
        "aria-valuenow",
        (await separator.getAttribute("aria-valuemin"))!,
      );
      const before = await page
        .getByRole("region", { name: "Python workspace" })
        .evaluate((el) => el.scrollTop);
      const box = await description.boundingBox();
      if (!box) throw new Error("Description has no layout");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 500);
      await expect
        .poll(() =>
          description.evaluate((el) =>
            [el, ...el.querySelectorAll<HTMLElement>("*")].reduce(
              (sum, node) => sum + node.scrollTop,
              0,
            ),
          ),
        )
        .toBeGreaterThan(0);
      await expect
        .soft(
          description.getByRole("heading", {
            name: "Description",
            exact: true,
          }),
        )
        .toBeVisible();
      await expect
        .soft(
          description.getByRole("heading", {
            name: question.title,
            exact: true,
          }),
        )
        .toBeVisible();
      await expect
        .soft(description.getByText(question.topic, { exact: false }))
        .toBeVisible();
      expect(
        await page
          .getByRole("region", { name: "Python workspace" })
          .evaluate((el) => el.scrollTop),
      ).toBe(before);
    }
    await page
      .getByRole("textbox", { name: "Scratch tests (not saved)", exact: true })
      .fill("assert True\n".repeat(120));
    await page
      .getByRole("textbox", { name: "Standard input (not saved)", exact: true })
      .fill("input line\n".repeat(100));
    await page
      .getByRole("textbox", { name: "Explain your reasoning" })
      .fill("Reasoning line\n".repeat(120));
    await pointerActivate(
      page,
      page.getByRole("button", { name: "Save draft", exact: true }),
    );
    await expect.poll(() => state.writes.length).toBe(1);
    let confirmation = false;
    page.once("dialog", async (dialog) => {
      confirmation = true;
      await dialog.dismiss();
    });
    await pointerActivate(
      page,
      page.getByRole("button", { name: "Submit final attempt", exact: true }),
    );
    await expect.poll(() => confirmation).toBe(true);
    expect(state.writes).toHaveLength(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width + 1);
    await page.screenshot({
      path: testInfo.outputPath(`ide-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
    const background = await description.evaluate((element) => {
      for (let p: Element | null = element; p; p = p.parentElement) {
        const color = getComputedStyle(p).backgroundColor;
        if (color !== "rgba(0, 0, 0, 0)" && color !== "transparent")
          return color;
      }
      return "transparent";
    });
    expect
      .soft(background, "approved IDE-05 description reading surface is white")
      .toBe("rgb(255, 255, 255)");
  }
});
