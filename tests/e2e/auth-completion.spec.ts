import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { PrismaClient } from "../../generated/prisma/client.js";

test.skip(
  process.env["E2E_AUTH_COMPLETION"] !== "1",
  "Opt-in real local verification/recovery with private captured outbox and Google transport doubles",
);
test.use({ trace: "off", screenshot: "off" }); // Token/password-bearing network traces are deliberately not recorded.
const channel = resolve(".workflow-state/browser-auth");
const recipients: string[] = [];
const controls: string[] = [];
const password = "Browser-synthetic-password-12345";
async function message(email: string, subject: string): Promise<string> {
  const key = createHash("sha256").update(email).digest("hex");
  let result = "";
  await expect
    .poll(async () => {
      const files = (await readdir(channel))
        .filter((file) => file.startsWith(`mail-${key}-`))
        .sort()
        .reverse();
      for (const file of files) {
        const entry = JSON.parse(
          await readFile(resolve(channel, file), "utf8"),
        ) as { subject: string; text: string };
        if (entry.subject.includes(subject)) {
          result = entry.text.match(/https?:\/\/\S+/)![0];
          return true;
        }
      }
      return false;
    })
    .toBe(true);
  return result;
}
async function logout(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) < 600)
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
}
async function login(
  page: Page,
  email: string,
  secret: string,
  role: "LEARNER" | "INSTRUCTOR",
) {
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill(secret);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(
    role === "LEARNER" ? /\/learner$/ : /\/instructor$/,
  );
}
async function googleController(
  context: BrowserContext,
  page: Page,
  email: string,
  role?: "LEARNER" | "INSTRUCTOR",
  subject = randomUUID(),
) {
  // Substitute the external authorization hop in the controller. Local HTTP,
  // signed state/cookies, callback, provider account subject and provisioning are real.
  const code = randomUUID();
  const file = resolve(channel, `google-${code}.json`);
  controls.push(file);
  await writeFile(file, JSON.stringify({ email, sub: subject }), {
    flag: "wx",
    mode: 0o600,
  });
  const start = await context.request.post("/api/auth/sign-in/social", {
    headers: { origin: "http://127.0.0.1:5173" },
    data: {
      provider: "google",
      requestSignUp: role !== undefined,
      ...(role ? { additionalData: { registrationRole: role } } : {}),
    },
  });
  expect(start.status()).toBe(200);
  const { url } = (await start.json()) as { url: string };
  const state = new URL(url).searchParams.get("state")!;
  await page.goto(
    `/api/auth/callback/google?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
  );
  await expect(page).toHaveURL(/\/(learner|instructor)$/);
  return subject;
}
test.afterAll(async () => {
  if (!recipients.length) return;
  const raw = process.env["E2E_TEST_DATABASE_URL"];
  if (!raw)
    throw new Error("Explicit browser test DB required for owned cleanup");
  const target = new URL(raw);
  if (
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    !["127.0.0.1", "localhost"].includes(target.hostname) ||
    !target.pathname.endsWith("_test") ||
    target.search ||
    target.hash
  )
    throw new Error("Unsafe cleanup target");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: raw }),
  });
  try {
    await prisma.user.deleteMany({ where: { email: { in: recipients } } });
  } finally {
    await prisma.$disconnect();
  }
  const keys = recipients.map(
    (email) => `mail-${createHash("sha256").update(email).digest("hex")}-`,
  );
  for (const file of await readdir(channel))
    if (keys.some((key) => file.startsWith(key)))
      await unlink(resolve(channel, file));
  for (const file of controls) await unlink(file);
});
for (const role of ["LEARNER", "INSTRUCTOR"] as const) {
  test(`BW password ${role}: explicit choice, verification/resend, retry, recovery, restore and logout`, async ({
    page,
  }) => {
    const email = `browser-${randomUUID()}@example.test`;
    recipients.push(email);
    expect((await page.request.get("/api/ready")).status()).toBe(200);
    await page.goto("/register");
    await expect(
      page.getByRole("radio", { name: "Learner", exact: true }),
    ).not.toBeChecked();
    await expect(
      page.getByRole("radio", { name: "Instructor", exact: true }),
    ).not.toBeChecked();
    await page
      .getByRole("radio", {
        name: role === "LEARNER" ? "Learner" : "Instructor",
        exact: true,
      })
      .check();
    await page
      .getByRole("textbox", { name: /^Name/ })
      .fill("Browser synthetic");
    await page
      .getByRole("textbox", { name: /^Email/ })
      .fill(email.toUpperCase());
    await page.getByLabel(/^Password/).fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("alert")).toContainText(
      "If verification is needed",
    );
    expect((await page.request.get("/api/v1/me")).status()).toBe(401);
    await page.getByRole("textbox", { name: /^Email/ }).fill(email);
    await page.getByLabel(/^Password/).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert").first()).toContainText(
      "Verify your email",
    );
    await page.getByRole("link", { name: "Resend verification email" }).click();
    await expect(
      page.getByRole("heading", { name: "Verify your email", exact: true }),
    ).toBeVisible();
    await page.getByRole("textbox", { name: /^Email/ }).fill(email);
    await page
      .getByRole("button", { name: "Resend verification", exact: true })
      .click();
    await expect(page.getByRole("alert")).toHaveText(
      "Request accepted. If verification is needed, check your email. If no message arrives, try again.",
    );
    await page.goto(await message(email, "Verify"));
    await expect(page).toHaveURL(/\/verification\/result$/);
    await expect(page.getByRole("alert")).toContainText(
      "Verification completed",
    );
    expect((await page.request.get("/api/v1/me")).status()).toBe(401);
    await login(page, email, password, role);
    const identity = (await (await page.request.get("/api/v1/me")).json())
      .user as { id: string; role: string };
    expect(identity.role).toBe(role);
    await page.reload();
    await expect(page).toHaveURL(
      role === "LEARNER" ? /\/learner$/ : /\/instructor$/,
    );
    await logout(page);
    await page.getByRole("textbox", { name: /^Email/ }).fill(email);
    await page.getByLabel(/^Password/).fill(`${password}-wrong`);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Check your details");
    await page.getByRole("link", { name: /Forgot password/ }).click();
    await expect(
      page.getByRole("heading", { name: "Reset or establish your password" }),
    ).toBeVisible();
    await page.getByRole("textbox", { name: /^Email/ }).fill(email);
    await page.getByRole("button", { name: "Request recovery link" }).click();
    await expect(page.getByRole("alert")).toContainText("Request accepted");
    await page.goto(await message(email, "Reset"));
    await expect(page).toHaveURL(/\/reset-password$/);
    expect(
      await page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .every(
            (entry) => new URL(entry.name).origin === window.location.origin,
          ),
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() =>
        document
          .querySelector('meta[name="referrer"]')
          ?.getAttribute("content"),
      ),
    ).toBe("no-referrer");
    await page.getByLabel(/^New password/).fill(`${password}-new`);
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByRole("alert")).toContainText("Password saved");
    await page.reload();
    await expect(page.getByRole("alert")).toContainText("missing or invalid");
    await login(page, email, `${password}-new`, role);
    expect((await (await page.request.get("/api/v1/me")).json()).user.id).toBe(
      identity.id,
    );
    await logout(page);
    expect((await page.request.get("/api/v1/me")).status()).toBe(401);
  });
  test(`BW Google-controller ${role}: real callback, Google-first recovery and immutable returning role`, async ({
    page,
    context,
  }) => {
    const email = `google-browser-${randomUUID()}@example.test`;
    recipients.push(email);
    expect((await page.request.get("/api/ready")).status()).toBe(200);
    await page.goto("/register");
    await page
      .getByRole("radio", {
        name: role === "LEARNER" ? "Learner" : "Instructor",
        exact: true,
      })
      .check();
    const subject = await googleController(context, page, email, role);
    const before = (await (await page.request.get("/api/v1/me")).json())
      .user as { id: string; role: string };
    expect(before.role).toBe(role);
    await logout(page);
    await page.goto("/forgot-password");
    await page.getByRole("textbox", { name: /^Email/ }).fill(email);
    await page.getByRole("button", { name: "Request recovery link" }).click();
    await expect(page.getByRole("alert")).toContainText("Request accepted");
    await page.goto(await message(email, "Reset"));
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.getByLabel(/^New password/).fill(password);
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByRole("alert")).toContainText("Password saved");
    await login(page, email, password, role);
    await logout(page);
    await googleController(
      context,
      page,
      email,
      role === "LEARNER" ? "INSTRUCTOR" : "LEARNER",
      subject,
    );
    expect(
      (await (await page.request.get("/api/v1/me")).json()).user,
    ).toMatchObject(before);
    await logout(page);
  });
}
test("BW public auth routes have labelled keyboard controls and fit the viewport", async ({
  page,
}) => {
  for (const route of [
    "/sign-in",
    "/register",
    "/verification",
    "/verification/result",
    "/forgot-password",
    "/reset-password",
    "/auth/error",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => document.activeElement?.tagName !== "BODY"),
    ).toBe(true);
  }
});
