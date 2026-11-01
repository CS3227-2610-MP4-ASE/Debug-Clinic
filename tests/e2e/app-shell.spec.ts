import { expect, test } from "@playwright/test";

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
    page.getByRole("link", { name: "Create a learner account" }),
  ).toBeVisible();
});

test("authentication entry points are reachable", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(
    page.getByRole("heading", { name: "Continue your debugging practice" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Create a learner account" }).click();
  await expect(
    page.getByRole("heading", { name: "Create a learner account" }),
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
