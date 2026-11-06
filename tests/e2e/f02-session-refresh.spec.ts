// HTTP doubles exercise AuthProvider, the role guard and the paginated page together.
import { expect, test } from "@playwright/test";
import { f01Learner, f01Owner } from "../support/f01-fixtures.js";

for (const scenario of [
  {
    role: "instructor",
    user: f01Owner,
    path: "/instructor/questions?status=DRAFT",
  },
  { role: "learner", user: f01Learner, path: "/learner/questions" },
]) {
  test(`${scenario.role} pagination survives focus checks while account changes and expiry clear it`, async ({
    page,
  }) => {
    let user: typeof scenario.user | null = scenario.user;
    let checking = false;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const offsets: number[] = [];
    await page.route("**/api/v1/me", async (route) => {
      if (checking) await pending;
      await route.fulfill({
        status: user ? 200 : 401,
        json: user ? { user } : {},
      });
    });
    await page.route(`**/api/v1/${scenario.role}/questions?*`, (route) => {
      const offset = Number(
        new URL(route.request().url()).searchParams.get("offset"),
      );
      offsets.push(offset);
      return route.fulfill({
        json: {
          questions: Array.from(
            { length: offset === 100 ? 1 : 50 },
            (_, index) => ({
              id: `question-${offset + index}`,
              title: `${user?.id === scenario.user.id ? "Question" : "Other account question"} ${offset + index}`,
              topic: "Python lists",
              ...(scenario.role === "instructor"
                ? {
                    status: "DRAFT",
                    createdAt: "2026-11-06T00:00:00.000Z",
                    publishedAt: null,
                    archivedAt: null,
                  }
                : {
                    instructorName: "Instructor A",
                    publishedAt: "2026-11-06T00:00:00.000Z",
                  }),
            }),
          ),
          nextOffset: offset === 100 ? null : offset + 50,
        },
      });
    });
    await page.goto(scenario.path);
    await page.getByRole("button", { name: "Load more", exact: true }).click();
    const secondPage = page.getByRole("link", {
      name: "Open question: Question 99",
      exact: true,
    });
    await expect(secondPage).toBeVisible();
    const previousRequests = [...offsets];
    checking = true;
    const sessionRequest = page.waitForRequest("**/api/v1/me");
    const sessionResponse = page.waitForResponse("**/api/v1/me");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await sessionRequest;
    try {
      // Let React paint the pending refresh while its response is deliberately gated.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          }),
      );
      await expect(page.getByLabel("Loading your session")).toHaveCount(0);
      await expect(secondPage).toBeVisible();
    } finally {
      release();
    }
    await sessionResponse;
    await expect(
      page.getByRole("button", { name: "Load more", exact: true }),
    ).toBeEnabled();
    await expect(secondPage).toBeVisible();
    expect(offsets).toEqual(previousRequests);
    await page.getByRole("button", { name: "Load more", exact: true }).click();
    await expect(
      page.getByRole("link", {
        name: "Open question: Question 100",
        exact: true,
      }),
    ).toBeVisible();
    expect(offsets.slice(previousRequests.length)).toEqual([100]);

    user = {
      ...scenario.user,
      id: `${scenario.user.id}-other`,
      name: "Other account",
    };
    const changedSession = page.waitForResponse("**/api/v1/me");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await changedSession;
    await expect(
      page.getByRole("link", {
        name: "Open question: Other account question 0",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "Open question: Question 100",
        exact: true,
      }),
    ).toHaveCount(0);
    expect(offsets.at(-1)).toBe(0);

    user = null;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(
      page.getByRole("link", { name: /Open question:/ }),
    ).toHaveCount(0);
  });
}
