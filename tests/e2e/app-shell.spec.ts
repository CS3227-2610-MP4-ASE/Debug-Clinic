import { expect, test } from "@playwright/test";

test("registration explains required email verification", async ({ page }) => {
  await page.route("**/api/auth/sign-up/email", async (route) => {
    await route.fulfill({
      json: {
        token: null,
        user: {
          id: "test",
          name: "Test learner",
          email: "learner@example.test",
          emailVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });
  });
  await page.goto("/register");
  await page.getByRole("radio", { name: "Learner", exact: true }).check();
  await page.getByRole("textbox", { name: /^Name/ }).fill("Test learner");
  await page
    .getByRole("textbox", { name: /^Email/ })
    .fill("learner@example.test");
  await page.getByLabel(/^Password/).fill("Test-password-12345");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText(/If verification is needed, check your email/),
  ).toBeVisible();
});

test("public home page explains the practice loop", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Debug Python without surrendering/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "The intended practice loop keeps authority clear",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create an account" }),
  ).toBeVisible();
});

test("authentication entry points are reachable", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(
    page.getByRole("heading", { name: "Continue your debugging practice" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(
    page.getByRole("heading", { name: "Create an account" }),
  ).toBeVisible();
});

test("an unauthenticated learner route returns to sign in", async ({
  page,
}) => {
  await page.goto("/learner");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Continue your debugging practice" }),
  ).toBeVisible();
});
