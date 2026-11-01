import { defineConfig, devices } from "@playwright/test";

const testEnvironment = {
  NODE_ENV: "test",
  PORT: "3001",
  APP_ORIGIN: "http://127.0.0.1:4173",
  CORS_ORIGINS: "http://127.0.0.1:4173",
  DATABASE_URL:
    "postgresql://debugclinic:debugclinic@127.0.0.1:5433/debugclinic_test",
  DATABASE_URL_POOLED:
    "postgresql://debugclinic:debugclinic@127.0.0.1:5433/debugclinic_test",
  BETTER_AUTH_URL: "http://127.0.0.1:4173",
  BETTER_AUTH_SECRET: "playwright-only-secret-with-at-least-32-characters",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "silent",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["line"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: testEnvironment,
  },
});
