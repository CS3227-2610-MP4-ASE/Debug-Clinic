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
    } finally {
      await context.close();
    }
  }
  process.stdout.write(
    "Built frontend: 16 public route/viewport loads passed; no page errors or external assets.\n",
  );
} finally {
  await browser?.close();
  await new Promise<void>((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
