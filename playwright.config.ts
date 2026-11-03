import { defineConfig, devices } from "@playwright/test";

const appOrigin = "http://127.0.0.1:5173";
const appAddress = new URL(appOrigin);
const testDatabaseUrl =
  process.env["E2E_TEST_DATABASE_URL"] ??
  "postgresql://debugclinic:debugclinic@127.0.0.1:5433/debugclinic_test";
let databaseAddress: URL;
try {
  databaseAddress = new URL(testDatabaseUrl);
} catch {
  throw new Error(
    "E2E_TEST_DATABASE_URL must identify a loopback PostgreSQL _test database",
  );
}
if (
  !["postgres:", "postgresql:"].includes(databaseAddress.protocol) ||
  !["localhost", "127.0.0.1"].includes(databaseAddress.hostname) ||
  !databaseAddress.pathname.endsWith("_test") ||
  databaseAddress.search !== "" ||
  databaseAddress.hash !== ""
) {
  throw new Error(
    "E2E_TEST_DATABASE_URL must identify a loopback PostgreSQL _test database",
  );
}

const testEnvironment = {
  NODE_ENV: "test",
  PORT: "3001",
  APP_ORIGIN: appOrigin,
  CORS_ORIGINS: appOrigin,
  DATABASE_URL: testDatabaseUrl,
  DATABASE_URL_POOLED: testDatabaseUrl,
  BETTER_AUTH_URL: appOrigin,
  BETTER_AUTH_SECRET: "playwright-only-secret-with-at-least-32-characters",
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
  OAUTH_PROXY_URL: "",
  OAUTH_PROXY_SECRET: "",
  SMTP_USER: "",
  SMTP_PASSWORD: "",
  EMAIL_FROM: "",
  VITE_API_BASE_URL: "",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "silent",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"]
    ? [["html", { open: "never" }], ["line"]]
    : "list",
  use: {
    baseURL: appOrigin,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command:
        "node --conditions=development --import tsx apps/backend/src/server.ts",
      url: `http://127.0.0.1:${testEnvironment.PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: testEnvironment,
    },
    {
      command: `npm run dev -w @debugclinic/frontend -- --host ${appAddress.hostname} --port ${appAddress.port} --strictPort`,
      url: `${appOrigin}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: testEnvironment,
    },
  ],
});
