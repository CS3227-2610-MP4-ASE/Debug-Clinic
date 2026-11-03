import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "@playwright/test";
import { preview } from "vite";

// Exercise emitted JavaScript. Vite's development server cannot expose chunk
// initialization cycles. Only the unauthenticated API is a synthetic local stub.
assert.equal(process.versions.node.split(".")[0], "24", "Use Node 24");
const root = fileURLToPath(new URL("../apps/frontend/", import.meta.url));
const server = await preview({
  root,
  configFile: fileURLToPath(
    new URL("../apps/frontend/vite.config.ts", import.meta.url),
  ),
  preview: { host: "127.0.0.1", port: 0, strictPort: true, proxy: {} },
  plugins: [
    {
      name: "built-smoke-anonymous-api",
      configurePreviewServer(previewServer) {
        previewServer.middlewares.use((request, response, next) => {
          if (!request.url?.startsWith("/api/")) return next();
          response.statusCode = 401;
          response.setHeader("content-type", "application/json");
          response.end(
            JSON.stringify({
              error: {
                code: "UNAUTHENTICATED",
                message: "Sign in to continue",
                requestId: "built-smoke-synthetic",
              },
            }),
          );
        });
      },
    },
  ],
});
const address = server.httpServer.address();
assert(address && typeof address === "object");
const origin = `http://127.0.0.1:${address.port}`;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  browser = await chromium.launch();
  for (const [label, options] of [
    ["desktop", { viewport: { width: 1280, height: 720 } }],
    ["mobile", devices["Pixel 7"]!],
  ] as const) {
    const context = await browser.newContext(options);
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", () => errors.push("JavaScript page error"));
      page.on("request", (request) => {
        if (!request.url().startsWith(`${origin}/`))
          errors.push("Unexpected external asset request");
      });
      for (const [route, heading] of [
        ["/", "Debug Python without surrendering the thinking."],
        ["/sign-in", "Continue your debugging practice"],
        ["/register", "Create an account"],
        ["/verification", "Verify your email"],
        ["/verification/result", "Email verification"],
        ["/forgot-password", "Reset or establish your password"],
        ["/reset-password", "Choose a password"],
        ["/auth/error", "Google sign-in could not finish"],
      ] as const) {
        await page.goto(`${origin}${route}`);
        await page
          .getByRole("heading", { level: 1, name: heading, exact: true })
          .waitFor();
        if (route === "/register") {
          for (const name of ["Learner", "Instructor"])
            assert.equal(
              await page.getByRole("radio", { name, exact: true }).isChecked(),
              false,
            );
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          true,
          `${label} ${route}: horizontal clipping`,
        );
        assert.deepEqual(
          errors,
          [],
          `${label} ${route}: runtime or asset failure`,
        );
      }
      // M03: inspect real keyboard flow and semantic feedback on emitted pages.
      await page.goto(`${origin}/register`);
      await page
        .getByRole("radiogroup", { name: /Choose your role/ })
        .waitFor();
      const learner = page.getByRole("radio", { name: "Learner", exact: true });
      const instructor = page.getByRole("radio", {
        name: "Instructor",
        exact: true,
      });
      for (let step = 0; step < 12; step++) {
        await page.keyboard.press("Tab");
        if (await learner.evaluate((node) => node === document.activeElement))
          break;
      }
      assert.equal(
        await learner.evaluate((node) => node === document.activeElement),
        true,
      );
      await page.keyboard.press("ArrowDown");
      assert.equal(await instructor.isChecked(), true);
      await page.keyboard.press("ArrowUp");
      assert.equal(await learner.isChecked(), true);
      await page.keyboard.press("Tab");
      assert.equal(
        await page
          .getByRole("button", { name: "Continue with Google", exact: true })
          .evaluate((node) => node === document.activeElement),
        true,
      );
      for (const name of [/^Name/, /^Email/, /^Password/]) {
        await page.keyboard.press("Tab");
        assert.equal(
          await page
            .getByLabel(name)
            .evaluate((node) => node === document.activeElement),
          true,
        );
      }
      await page.keyboard.press("Tab");
      assert.equal(
        await page
          .getByRole("button", { name: "Create account", exact: true })
          .evaluate((node) => node === document.activeElement),
        true,
      );

      await page.goto(`${origin}/register`);
      await page.getByLabel(/^Name/).fill("Keyboard synthetic");
      await page.getByLabel(/^Email/).fill("keyboard@example.test");
      await page.getByLabel(/^Password/).fill("Synthetic-keyboard-only-12345");
      await page
        .getByRole("button", { name: "Create account", exact: true })
        .click();
      const alert = page.getByRole("alert");
      await alert.waitFor();
      assert.match(await alert.innerText(), /Choose Learner or Instructor/);
      await page.waitForFunction(
        () => document.activeElement?.getAttribute("role") === "alert",
      );
      // No role was selected, so this failure happens before any auth API call.
      const menu = page.getByRole("button", {
        name: "Open navigation",
        exact: true,
      });
      if (await menu.isVisible()) {
        await menu.focus();
        await page.keyboard.press("Enter");
        await page.getByText("Navigate", { exact: true }).waitFor();
        await page.keyboard.press("Escape");
        await page
          .getByText("Navigate", { exact: true })
          .waitFor({ state: "hidden" });
        assert.equal(
          await menu.evaluate((node) => node === document.activeElement),
          true,
        );
      }
      assert.deepEqual(
        errors,
        [],
        `${label}: keyboard feedback or asset failure`,
      );
    } finally {
      await context.close();
    }
  }
  process.stdout.write(
    "Built frontend: 16 public route/viewport loads and desktop/mobile keyboard, role-choice, focused-alert and mobile navigation checks passed; no page errors or external assets.\n",
  );
} finally {
  await browser?.close();
  await new Promise<void>((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
