import { expect, test } from "@playwright/test";
const cases = [
  {
    name: "registration",
    route: "/register",
    path: "sign-up/email",
    button: "Create account",
    code: "REGISTRATION_ROLE_REQUIRED",
  },
  {
    name: "sign-in",
    route: "/sign-in",
    path: "sign-in/email",
    button: "Sign in",
    code: "INVALID_EMAIL_OR_PASSWORD",
  },
  {
    name: "Google",
    route: "/sign-in",
    path: "sign-in/social",
    button: "Continue with Google",
    code: "PROVIDER_NOT_FOUND",
  },
  {
    name: "resend",
    route: "/verification",
    path: "send-verification-email",
    button: "Resend verification",
    code: "EMAIL_UNAVAILABLE",
  },
  {
    name: "recovery",
    route: "/forgot-password",
    path: "request-password-reset",
    button: "Request recovery link",
    code: "EMAIL_UNAVAILABLE",
  },
  {
    name: "reset",
    route: "/reset-password?token=synthetic-controller-token",
    path: "reset-password",
    button: "Save password",
    code: "INVALID_TOKEN",
  },
];
for (const action of cases)
  for (const failure of ["typed", "unknown", "network"] as const) {
    test(`BF ${action.name} ${failure}: pending lock, safe error and successful retry`, async ({
      page,
    }) => {
      let authenticated = false;
      let calls = 0;
      let requested!: () => void;
      let release!: () => void;
      const started = new Promise<void>((resolve) => {
        requested = resolve;
      });
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route("**/api/v1/me", (route) =>
        route.fulfill({
          status: authenticated ? 200 : 401,
          json: authenticated
            ? {
                user: {
                  id: "synthetic",
                  name: "Synthetic",
                  email: "synthetic@example.test",
                  role: "LEARNER",
                },
              }
            : {},
        }),
      );
      await page.route("https://accounts.google.com/**", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: "<h1>Synthetic provider authorization transport</h1>",
        }),
      );
      await page.route(`**/api/auth/${action.path}`, async (route) => {
        calls += 1;
        if (calls === 1) {
          requested();
          await pending;
          if (failure === "network") await route.abort("failed");
          else
            await route.fulfill({
              status: 400,
              json: {
                code: failure === "typed" ? action.code : "PRIVATE_CODE_CANARY",
                message: "PRIVATE_EXCEPTION_CANARY database password token",
              },
            });
        } else {
          if (action.name === "sign-in") authenticated = true;
          await route.fulfill({
            json:
              action.name === "Google"
                ? {
                    url: "https://accounts.google.com/o/oauth2/v2/auth?synthetic=1",
                    redirect: true,
                  }
                : action.name === "registration"
                  ? {
                      token: null,
                      user: { id: "untrusted-synthetic-duplicate" },
                    }
                  : { status: true },
          });
        }
      });
      await page.goto(action.route);
      if (action.name === "registration") {
        await page
          .getByRole("radio", { name: "Instructor", exact: true })
          .check();
        await page.getByRole("textbox", { name: /^Name/ }).fill("Synthetic");
      }
      if (action.name !== "reset")
        await page
          .getByRole("textbox", { name: /^Email/ })
          .fill("synthetic@example.test");
      if (["registration", "sign-in"].includes(action.name))
        await page.getByLabel(/^Password/).fill("Synthetic-password-12345");
      if (action.name === "reset")
        await page.getByLabel(/^New password/).fill("Synthetic-password-12345");
      const button =
        action.name === "Google"
          ? page.getByRole("button", { name: /Google/ })
          : page.locator('form button[type="submit"]');
      await button.click();
      await started;
      await expect(button).toBeDisabled();
      await expect(page.getByRole("status")).toBeVisible();
      await page.keyboard.press("Enter");
      expect(calls).toBe(1);
      release();
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("alert")).toBeFocused();
      await expect(page.getByRole("alert")).not.toContainText("PRIVATE_");
      await expect(button).toBeEnabled();
      await button.click();
      if (action.name === "registration") {
        await expect(page).toHaveURL(/\/sign-in$/);
        await expect(page.getByRole("alert")).toContainText(
          "If verification is needed",
        );
      } else if (action.name === "sign-in")
        await expect(page).toHaveURL(/\/learner$/);
      else if (action.name === "Google")
        await expect(
          page.getByRole("heading", {
            name: "Synthetic provider authorization transport",
          }),
        ).toBeVisible();
      else
        await expect(page.getByRole("alert")).toContainText(
          action.name === "reset" ? "Password saved" : "Request accepted",
        );
      expect(calls).toBe(2);
    });
  }
test("BF completion refresh failure and invalid verification/reset result remain recoverable", async ({
  page,
}) => {
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { code: "PRIVATE_CANARY", message: "PRIVATE_CANARY" } },
    }),
  );
  await page.goto("/auth/complete?returnTo=https://evil.example");
  await expect(page.getByRole("alert")).toContainText(
    "We could not complete sign-in",
  );
  await expect(
    page.getByRole("button", { name: "Retry completion" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Retry completion" }).click();
  await expect(page).toHaveURL(/\/auth\/complete/);
  await page.goto("/verification/result?error=PRIVATE_CANARY");
  await expect(page.getByRole("alert")).toContainText("invalid or expired");
  await expect(page.getByRole("alert")).not.toContainText("PRIVATE_");
  await page.goto("/reset-password?error=PRIVATE_CANARY");
  await expect(page).toHaveURL(/\/reset-password$/);
  await expect(page.getByRole("alert")).toContainText("missing or invalid");
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Request a new recovery link" }),
  ).toBeVisible();
});

test("BF delayed pre-signout session read cannot restore the signed-out user", async ({
  page,
}) => {
  let hold = false;
  let released!: () => void;
  let requested!: () => void;
  let signedOut = false;
  const pending = new Promise<void>((resolve) => {
    released = resolve;
  });
  const started = new Promise<void>((resolve) => {
    requested = resolve;
  });
  const identity = {
    id: "synthetic-stale",
    name: "Synthetic",
    email: "synthetic@example.test",
    role: "LEARNER",
  };
  await page.route("**/api/v1/me", async (route) => {
    if (hold && !signedOut) {
      requested();
      await pending;
      await route.fulfill({ json: { user: identity } });
    } else
      await route.fulfill({
        status: signedOut ? 401 : 200,
        json: signedOut ? {} : { user: identity },
      });
  });
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.fulfill({ json: { status: true } }),
  );
  await page.route("**/api/auth/sign-out", (route) => {
    signedOut = true;
    return route.fulfill({ json: { success: true } });
  });
  await page.goto("/sign-in");
  await page
    .getByRole("textbox", { name: /^Email/ })
    .fill("synthetic@example.test");
  await page.getByLabel(/^Password/).fill("Synthetic-password-12345");
  hold = true;
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await started;
  if ((page.viewportSize()?.width ?? 1280) < 600)
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  released();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
  await page.goto("/learner");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("BF session restore failure grants no workspace and retries against fresh server state", async ({
  page,
}) => {
  let failing = true;
  await page.route("**/api/v1/me", (route) =>
    route.fulfill({
      status: failing ? 503 : 200,
      json: failing
        ? {}
        : {
            user: {
              id: "synthetic",
              name: "Synthetic",
              email: "synthetic@example.test",
              role: "INSTRUCTOR",
            },
          },
    }),
  );
  await page.goto("/instructor");
  await expect(page.getByRole("alert")).toContainText(
    "could not restore your session",
  );
  await expect(
    page.getByRole("heading", { name: "Your instructor workspace" }),
  ).toHaveCount(0);
  failing = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page).toHaveURL(/\/instructor$/);
});
