import { expect, test, type Page } from "@playwright/test";

async function openNavigation(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) < 600) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
}

test("Google sign-in errors are visible and email input is preserved", async ({
  page,
}) => {
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.route("**/api/auth/sign-in/social", (route) =>
    route.fulfill({
      status: 400,
      json: {
        code: "PROVIDER_NOT_FOUND",
        message: "Google is not configured. Use email to sign in.",
      },
    }),
  );
  await page.goto("/sign-in");
  await page
    .getByRole("textbox", { name: /^Email/ })
    .fill("learner@example.test");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Google is not configured. Use email to sign in.",
  );
  await expect(page.getByRole("textbox", { name: /^Email/ })).toHaveValue(
    "learner@example.test",
  );
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled();
});

test("Google sign-in handles an empty server error and network failure without getting stuck", async ({
  page,
}) => {
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  let calls = 0;
  await page.route("**/api/auth/sign-in/social", async (route) => {
    calls += 1;
    if (calls === 1)
      await route.fulfill({ status: 400, json: { message: "" } });
    else await route.abort("failed");
  });
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Google sign-in could not start. Try again or use email.",
  );
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
});

test("sign-out waits for the server, clears the shell, and protects the workspace", async ({
  page,
}) => {
  let signedIn = true;
  let requested = false;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      status: signedIn ? 200 : 401,
      json: signedIn
        ? {
            user: {
              id: "learner-1",
              name: "Test learner",
              email: "learner@example.test",
              role: "LEARNER",
            },
          }
        : {},
    }),
  );
  await page.route("**/api/auth/sign-out", async (route) => {
    expect(route.request().method()).toBe("POST");
    requested = true;
    await pending;
    signedIn = false;
    await route.fulfill({ json: { success: true } });
  });
  await page.goto("/learner");
  await expect(
    page.getByRole("heading", { name: "Your debugging workspace" }),
  ).toBeVisible();
  await openNavigation(page);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await expect(
    page.getByRole("button", { name: "Signing out…" }),
  ).toBeDisabled();
  release();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
  await page.goto("/learner");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("failed sign-out keeps the workspace and offers a successful retry", async ({
  page,
}) => {
  let signedIn = true;
  let attempts = 0;
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      status: signedIn ? 200 : 401,
      json: signedIn
        ? {
            user: {
              id: "instructor-1",
              name: "Test instructor",
              email: "instructor@example.test",
              role: "INSTRUCTOR",
            },
          }
        : {},
    }),
  );
  await page.route("**/api/auth/sign-out", async (route) => {
    attempts += 1;
    if (attempts === 1)
      await route.fulfill({ status: 503, json: { message: "Unavailable" } });
    else {
      signedIn = false;
      await route.fulfill({ json: { success: true } });
    }
  });
  await page.goto("/instructor");
  await openNavigation(page);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "You are not signed out yet",
  );
  await expect(page).toHaveURL(/\/instructor$/);
  await openNavigation(page);
  await expect(
    page.getByRole("link", { name: "Instructor workspace" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(attempts).toBe(2);
});
