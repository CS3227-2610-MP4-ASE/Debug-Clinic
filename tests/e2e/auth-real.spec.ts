import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

test.skip(
  process.env["E2E_REAL_AUTH"] !== "1",
  "Requires E2E_REAL_AUTH=1 and an isolated migrated PostgreSQL _test database (default 127.0.0.1:5433/debugclinic_test or validated E2E_TEST_DATABASE_URL); no network interception or email provider is used.",
);

async function signOut(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) < 600) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
}

test("real password registration, session restore, denied login, retry, and logout", async ({
  page,
  context,
}) => {
  const email = `browser-${randomUUID()}@example.test`;
  const password = "Isolated-browser-password-12345";

  expect((await page.request.get("/api/ready")).status()).toBe(200);
  await page.goto("/register");
  await page.getByRole("radio", { name: "Learner", exact: true }).check();
  await page.getByRole("textbox", { name: /^Name/ }).fill("Browser learner");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  const registration = page.waitForResponse("**/api/auth/sign-up/email");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  expect((await registration).status()).toBe(200);
  await expect(page).toHaveURL(/\/learner$/);
  await expect(
    page.getByRole("heading", { name: "Your debugging workspace" }),
  ).toBeVisible();

  const profile = await page.request.get("/api/v1/me");
  expect(profile.status()).toBe(200);
  expect((await profile.json()).user).toMatchObject({ email, role: "LEARNER" });
  expect(
    (await context.cookies()).find((cookie) =>
      cookie.name.includes("session_token"),
    ),
  ).toMatchObject({ httpOnly: true, sameSite: "Lax" });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your debugging workspace" }),
  ).toBeVisible();

  await signOut(page);
  expect((await page.request.get("/api/v1/me")).status()).toBe(401);
  await page.goto("/learner");
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill(`${password}-incorrect`);
  const denied = page.waitForResponse("**/api/auth/sign-in/email");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  expect((await denied).status()).toBe(401);
  await expect(page.getByRole("alert")).toBeVisible();
  expect((await page.request.get("/api/v1/me")).status()).toBe(401);

  await page.getByLabel(/^Password/).fill(password);
  const signIn = page.waitForResponse("**/api/auth/sign-in/email");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  expect((await signIn).status()).toBe(200);
  await expect(page).toHaveURL(/\/learner$/);
  const restored = await page.request.get("/api/v1/me");
  expect(restored.status()).toBe(200);
  expect((await restored.json()).user.email).toBe(email);
  await signOut(page);
  expect((await page.request.get("/api/v1/me")).status()).toBe(401);
});
