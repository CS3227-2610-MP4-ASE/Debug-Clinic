// Browser lifecycle evidence uses literal HTTP doubles; PostgreSQL is a separate tier.
import { expect, test, type Page } from "@playwright/test";
import {
  f01Draft,
  f01Edited,
  f01Generation,
  f01Learner,
  f01Owner,
  f01Refusals,
  f01Saved,
  f01Topic,
} from "../support/f01-fixtures.js";

const fields = {
  title: /^Title/i,
  problemStatement: /^Problem statement/i,
  buggyCode: /^Buggy (Python )?code/i,
  expectedBehavior: /^Expected behavio[u]?r/i,
  bugExplanation: /Bug explanation/i,
  correctedSolution: /^Corrected solution/i,
};
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
async function install(page: Page) {
  const state = {
    role: "INSTRUCTOR",
    draft: { ...f01Draft },
    saved: [] as Array<typeof f01Saved>,
    generateCalls: 0,
    saveCalls: 0,
    listCalls: 0,
    detailCalls: 0,
    generationGate: undefined as ReturnType<typeof gate> | undefined,
    saveGate: undefined as ReturnType<typeof gate> | undefined,
    listGate: undefined as ReturnType<typeof gate> | undefined,
    generationError: false,
    topicRefusal: undefined as (typeof f01Refusals)[number] | undefined,
    saveError: false,
    listError: false,
    detailError: false,
  };
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      json: { user: state.role === "INSTRUCTOR" ? f01Owner : f01Learner },
    }),
  );
  await page.route("**/api/v1/instructor/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const fail = () =>
      route.fulfill({
        status: 503,
        json: {
          error: {
            code: "DEPENDENCY_UNAVAILABLE",
            message: "The service is temporarily unavailable. Try again.",
            requestId: "f01-browser-request",
          },
        },
      });
    if (url.pathname.endsWith("/questions/generate")) {
      state.generateCalls++;
      if (state.generationGate) await state.generationGate.promise;
      if (state.generationError) return fail();
      const body = route.request().postDataJSON() as { topic: string };
      if (state.topicRefusal && body.topic === state.topicRefusal.topic) {
        return route.fulfill({
          status: 400,
          json: {
            error: {
              code: "BAD_REQUEST",
              message: "Please choose a supported Python topic",
              requestId: "f01-browser-request",
              details: [{ path: "topic", message: state.topicRefusal.message }],
            },
          },
        });
      }
      return route.fulfill({
        json: {
          topic: body.topic.trim(),
          draft: state.draft,
          generation: f01Generation,
        },
      });
    }
    if (url.pathname.endsWith("/drafts") && method === "POST") {
      state.saveCalls++;
      if (state.saveGate) await state.saveGate.promise;
      if (state.saveError) return fail();
      const body = route.request().postDataJSON() as {
        topic: string;
        draft: typeof f01Draft;
      };
      const saved = {
        ...f01Saved,
        ...body.draft,
        topic: body.topic,
        id: `f01-saved-${state.saveCalls}`,
      };
      state.saved.push(saved);
      return route.fulfill({ status: 201, json: { draft: saved } });
    }
    if (url.pathname.endsWith("/drafts")) {
      state.listCalls++;
      if (state.listGate) await state.listGate.promise;
      if (state.listError) return fail();
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const drafts = state.saved
        .slice(offset, offset + 50)
        .map(({ id, title, topic, createdAt }) => ({
          id,
          title,
          topic,
          createdAt,
        }));
      return route.fulfill({
        json: {
          drafts,
          nextOffset: offset + 50 < state.saved.length ? offset + 50 : null,
        },
      });
    }
    state.detailCalls++;
    if (state.detailError) return fail();
    const id = url.pathname.split("/").at(-1);
    const draft = state.saved.find((item) => item.id === id);
    return route.fulfill(
      draft
        ? {
            json: url.pathname.includes("/questions/")
              ? {
                  question: {
                    ...draft,
                    versionId: `version-${draft.id}`,
                    revision: 0,
                    publishedAt: null,
                    archivedAt: null,
                  },
                }
              : { draft },
          }
        : {
            status: 404,
            json: {
              error: {
                code: "NOT_FOUND",
                message: "Draft not found",
                requestId: "f01-browser-request",
              },
            },
          },
    );
  });
  return state;
}
async function preview(page: Page) {
  await page.goto("/instructor/questions/new");
  await page.getByRole("textbox", { name: /topic/i }).fill(f01Topic);
  await page.getByRole("button", { name: /^Generate$/i }).click();
  await expect(page.getByRole("textbox", { name: fields.title })).toHaveValue(
    f01Draft.title,
  );
}
async function edit(page: Page) {
  for (const [key, name] of Object.entries(fields))
    await page
      .getByRole("textbox", { name })
      .fill(f01Edited[key as keyof typeof f01Edited]);
}
async function newQuestion(page: Page) {
  const action = page.getByRole("button", { name: /^New question$/i });
  if (await action.count()) await action.click();
  else await page.getByRole("link", { name: /^New question$/i }).click();
}
function draftLink(page: Page, title: string) {
  return page
    .getByRole("link", { name: title, exact: true })
    .or(page.getByRole("link", { name: `Open draft: ${title}`, exact: true }));
}

test("B13/B14/B19 all six fields edit then explicit Save opens editable private detail, reload and own list", async ({
  page,
}) => {
  const state = await install(page);
  await preview(page);
  await expect(page.getByRole("textbox", { name: /topic/i })).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(page.getByRole("button", { name: /^Generate$/i })).toHaveCount(
    0,
  );
  await expect(
    page.getByText(/^Unverified instructor draft(?:\.|$)/),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: /difficulty/i })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: /regenerat|cancel|verify/i }),
  ).toHaveCount(0);
  expect(state.saveCalls).toBe(0);
  await edit(page);
  await page.getByRole("button", { name: /^Save draft$/i }).click();
  await expect(page).toHaveURL(/\/instructor\/drafts\/f01-saved-1$/);
  await expect(
    page
      .getByRole("status")
      .or(page.getByRole("alert"))
      .filter({ hasText: /Draft saved/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/^Unverified instructor draft(?:\.|$)/),
  ).toBeVisible();
  for (const [key, name] of Object.entries(fields))
    await expect(page.getByRole("textbox", { name })).toHaveValue(
      f01Edited[key as keyof typeof f01Edited],
    );
  await expect(
    page.getByRole("button", {
      name: /delete|verify|regenerate|cancel/i,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: fields.bugExplanation }),
  ).toHaveValue(f01Edited.bugExplanation);
  await page.goto("/instructor/drafts");
  await draftLink(page, f01Edited.title).click();
  await expect(
    page.getByRole("textbox", { name: fields.correctedSolution }),
  ).toHaveValue(f01Edited.correctedSolution);
  expect(state.saveCalls).toBe(1);
});
test("B03/B04 one Python topic field validates empty, whitespace and over-limit entries locally", async ({
  page,
}) => {
  const state = await install(page);
  await page.goto("/instructor/questions/new");
  await expect(
    page.getByText(
      "Choose a specific Python topic to prepare one private debugging draft.",
    ),
  ).toBeVisible();
  const topic = page.getByRole("textbox", {
    name: "Python topic",
    exact: true,
  });
  await expect(topic).toHaveCount(1);
  await expect(topic).toHaveAccessibleDescription(
    "1–300 characters. Related Python concepts can fit one exercise",
  );
  for (const invalid of ["", "  ", "x".repeat(301)]) {
    await topic.fill(invalid);
    await page.getByRole("button", { name: "Generate", exact: true }).click();
    await expect(topic).toHaveAccessibleDescription(
      "Enter a Python topic between 1 and 300 characters.",
    );
    expect(state.generateCalls).toBe(0);
    expect(state.saveCalls).toBe(0);
  }
});
test("B21 generation pending locks topic/actions and exposes explicit retained-topic Retry after safe failure", async ({
  page,
}) => {
  const state = await install(page);
  state.generationGate = gate();
  state.generationError = true;
  await page.goto("/instructor/questions/new");
  await page.getByRole("textbox", { name: /topic/i }).fill(f01Topic);
  await page.getByRole("button", { name: /^Generate$/i }).click();
  await expect.poll(() => state.generateCalls).toBe(1);
  await expect(page.getByRole("button", { name: /generat/i })).toBeDisabled();
  await expect(
    page
      .getByRole("link", { name: /^My drafts$/i })
      .or(page.getByRole("button", { name: /^My drafts$/i }))
      .first(),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: /topic/i }),
  ).not.toBeEditable();
  await expect(
    page.getByRole("status").or(page.getByRole("progressbar")).first(),
  ).toBeVisible();
  state.generationGate.release();
  await expect(page.getByRole("alert")).toContainText(/unavailable|try again/i);
  await expect(page.getByRole("textbox", { name: /topic/i })).toHaveValue(
    f01Topic,
  );
  await expect(page.getByRole("textbox", { name: fields.title })).toHaveCount(
    0,
  );
  expect(state.generateCalls).toBe(1);
  state.generationError = false;
  const retryRequest = page.waitForRequest(
    "**/api/v1/instructor/questions/generate",
  );
  await page.getByRole("button", { name: /^Retry$/i }).click();
  const retried = await retryRequest;
  expect(retried.postDataJSON()).toEqual({ topic: f01Topic });
  expect(await retried.headerValue("authorization")).toBeNull();
  await expect(page.getByRole("textbox", { name: fields.title })).toHaveValue(
    f01Draft.title,
  );
  expect(state.generateCalls).toBe(2);
  expect(state.saveCalls).toBe(0);
});
test("B06/B21 broad topic refusal keeps the editable topic until the instructor narrows it and resubmits", async ({
  page,
}) => {
  const state = await install(page);
  const refusal = f01Refusals[1];
  state.topicRefusal = refusal;
  await page.goto("/instructor/questions/new");
  const topic = page.getByRole("textbox", {
    name: "Python topic",
    exact: true,
  });
  const generate = page.getByRole("button", { name: "Generate", exact: true });
  await topic.fill(refusal.topic);
  await generate.click();
  await expect(page.getByRole("alert")).toContainText(refusal.message);
  await expect(topic).toHaveValue(refusal.topic);
  await expect(topic).toBeEditable();
  await expect(page.getByRole("textbox", { name: fields.title })).toHaveCount(
    0,
  );
  await topic.fill("Summing a list with a Python for loop");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(state.generateCalls).toBe(1);
  await generate.click();
  await expect(page.getByRole("textbox", { name: fields.title })).toHaveValue(
    f01Draft.title,
  );
  expect(state.generateCalls).toBe(2);
  expect(state.saveCalls).toBe(0);
});
test("B22 pending Save suppresses repeats, failed Save retains all edits, manual retry succeeds", async ({
  page,
}) => {
  const state = await install(page);
  await preview(page);
  await edit(page);
  state.saveGate = gate();
  state.saveError = true;
  await page.getByRole("button", { name: /^Save draft$/i }).click();
  await expect.poll(() => state.saveCalls).toBe(1);
  await expect(page.getByRole("button", { name: /sav/i })).toBeDisabled();
  await expect(
    page
      .getByRole("link", { name: /^My drafts$/i })
      .or(page.getByRole("button", { name: /^My drafts$/i }))
      .first(),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /^New question$/i }),
  ).toBeDisabled();
  await expect(
    page.getByRole("status").or(page.getByRole("progressbar")).first(),
  ).toBeVisible();
  state.saveGate.release();
  await expect(page.getByRole("alert")).toBeVisible();
  for (const [key, name] of Object.entries(fields))
    await expect(page.getByRole("textbox", { name })).toHaveValue(
      f01Edited[key as keyof typeof f01Edited],
    );
  state.saveError = false;
  await page.getByRole("button", { name: /^Save draft$/i }).click();
  await expect(page).toHaveURL(/\/instructor\/drafts\/f01-saved-2$/);
  expect(state.saveCalls).toBe(2);
});
test("B15 invalid required edit blocks Save and retains other fields", async ({
  page,
}) => {
  const state = await install(page);
  await preview(page);
  await edit(page);
  await page.getByRole("textbox", { name: fields.title }).fill("   ");
  await page.getByRole("button", { name: /^Save draft$/i }).click();
  await expect(
    page.getByRole("textbox", { name: fields.bugExplanation }),
  ).toHaveValue(f01Edited.bugExplanation);
  expect(state.saveCalls).toBe(0);
  await expect(
    page.getByRole("textbox", { name: fields.title }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByRole("textbox", { name: fields.title }),
  ).toHaveAccessibleDescription(
    /too small|required|nonblank|enter.*title|at least/i,
  );
});
test("B23 New question and native unload require discard; accepted reload clears preview", async ({
  page,
}) => {
  const state = await install(page);
  let dialogs = 0;
  page.on("dialog", async (dialog) => {
    dialogs++;
    await dialog.accept();
  });
  await preview(page);
  await edit(page);
  await newQuestion(page);
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /topic/i })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: fields.title })).toHaveCount(
    0,
  );
  await page.getByRole("textbox", { name: /topic/i }).fill(f01Topic);
  await page.getByRole("button", { name: /^Generate$/i }).click();
  await expect(page.getByRole("textbox", { name: fields.title })).toBeVisible();
  await edit(page);
  await page.reload();
  await expect(page.getByRole("textbox", { name: /topic/i })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: fields.title })).toHaveCount(
    0,
  );
  expect(dialogs).toBe(1);
  expect(state.saveCalls).toBe(0);
});
test("B23 late generation response cannot repopulate a fresh page after unmount", async ({
  page,
}) => {
  const state = await install(page);
  state.generationGate = gate();
  await page.goto("/instructor/questions/new");
  await page.evaluate(() => {
    (window as Window & { f01SpaDocument?: boolean }).f01SpaDocument = true;
  });
  await page.getByRole("textbox", { name: /topic/i }).fill(f01Topic);
  const oldRequest = page.waitForRequest(
    "**/api/v1/instructor/questions/generate",
  );
  await page.getByRole("button", { name: /^Generate$/i }).click();
  const pendingRequest = await oldRequest;
  await expect.poll(() => state.generateCalls).toBe(1);
  // Ordinary shell navigation remains possible while feature navigation is locked.
  await page.getByRole("link", { name: /^DebugClinic$/i }).click();
  if ((page.viewportSize()?.width ?? 1280) < 600)
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("link", { name: "Instructor workspace", exact: true })
    .click();
  await expect(page).toHaveURL(/\/instructor$/);
  await page.getByRole("link", { name: "New question", exact: true }).click();
  await expect(page).toHaveURL(/\/instructor\/questions\/new$/);
  await expect(page.getByRole("textbox", { name: /topic/i })).toHaveValue("");
  expect(
    await page.evaluate(
      () => (window as Window & { f01SpaDocument?: boolean }).f01SpaDocument,
    ),
  ).toBe(true);
  // A fresh component is mounted in the same document before the old response.
  state.generationGate.release();
  const lateResponse = await pendingRequest.response();
  if (lateResponse) await lateResponse.finished(); // Null/error permits a legitimate unmount abort.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.getByRole("textbox", { name: /topic/i })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: fields.title })).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(
      () => (window as Window & { f01SpaDocument?: boolean }).f01SpaDocument,
    ),
  ).toBe(true);
  expect(state.generateCalls).toBe(1);
  expect(state.saveCalls).toBe(0);
});
test("B24 empty, loading, retryable errors and fixed50 Load more states", async ({
  page,
}) => {
  const state = await install(page);
  state.listGate = gate();
  await page.goto("/instructor/drafts");
  await expect(
    page.getByRole("status").or(page.getByRole("progressbar")).first(),
  ).toBeVisible();
  state.listGate.release();
  await expect(page.getByText(/no.*draft|haven.t.*saved/i)).toBeVisible();
  await newQuestion(page);
  await expect(page).toHaveURL(/\/instructor\/questions\/new$/);
  state.listError = true;
  await page.goto("/instructor/drafts");
  await expect(page.getByRole("alert")).toBeVisible();
  state.listError = false;
  state.saved = Array.from({ length: 51 }, (_, i) => ({
    ...f01Saved,
    id: `f01-page-${i}`,
    title: `F01 page title ${i}`,
  }));
  await page.getByRole("button", { name: /^Retry$/i }).click();
  await expect(draftLink(page, "F01 page title 0")).toBeVisible();
  await expect(draftLink(page, "F01 page title 50")).toHaveCount(0);
  await page.getByRole("button", { name: /^Load more$/i }).click();
  await expect(draftLink(page, "F01 page title 50")).toBeVisible();
  await expect(draftLink(page, "F01 page title 0")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Load more$/i })).toHaveCount(
    0,
  );
  state.detailError = true;
  await draftLink(page, "F01 page title 0").click();
  await expect(page.getByRole("alert")).toBeVisible();
  state.detailError = false;
  await page.getByRole("button", { name: /^Retry$/i }).click();
  await expect(
    page.getByRole("textbox", { name: fields.bugExplanation }),
  ).toHaveValue(f01Saved.bugExplanation);
});
test("B25 HTML/script payloads are literal in editable, saved and list views", async ({
  page,
}) => {
  const state = await install(page);
  const payload =
    "<script>window.f01Probe=1</script><img src=x onerror=alert(1)>";
  state.draft = Object.fromEntries(
    Object.keys(f01Draft).map((key) => [key, payload]),
  ) as typeof f01Draft;
  let dialogs = 0;
  page.on("dialog", async (dialog) => {
    dialogs++;
    await dialog.dismiss();
  });
  await page.goto("/instructor/questions/new");
  await page.getByRole("textbox", { name: /topic/i }).fill(f01Topic);
  await page.getByRole("button", { name: /^Generate$/i }).click();
  for (const name of Object.values(fields))
    await expect(page.getByRole("textbox", { name })).toHaveValue(payload);
  await page.getByRole("button", { name: /^Save draft$/i }).click();
  await expect(page).toHaveURL(/\/instructor\/drafts\/f01-saved-1$/);
  await expect(
    page.locator("script").filter({ hasText: "window.f01Probe" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as Window & { f01Probe?: number }).f01Probe,
    ),
  ).toBeUndefined();
  await page.goto("/instructor/drafts");
  await expect(draftLink(page, payload)).toBeVisible();
  expect(dialogs).toBe(0);
});
test("B01 learner and absent session cannot open instructor flow", async ({
  page,
}) => {
  const state = await install(page);
  state.role = "LEARNER";
  await page.goto("/instructor/questions/new");
  await expect(page).toHaveURL(/\/forbidden$/);
  await expect(
    page.getByRole("textbox", { name: fields.bugExplanation }),
  ).toHaveCount(0);
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.goto("/instructor/drafts");
  await expect(page).toHaveURL(/\/sign-in$/);
});
test("B26 topic and generation support keyboard operation on each configured viewport", async ({
  page,
}) => {
  await install(page);
  await page.goto("/instructor/questions/new");
  const topic = page.getByRole("textbox", { name: /topic/i });
  await topic.focus();
  await expect(topic).toBeFocused();
  await topic.fill(f01Topic);
  const generate = page.getByRole("button", { name: /^Generate$/i });
  await generate.focus();
  await expect(generate).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: fields.title })).toHaveValue(
    f01Draft.title,
  );
  const viewport = page.viewportSize()!;
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(viewport.width + 1);
  // Actual focus visibility, contrast and responsive visual review remain human obligations.
});
