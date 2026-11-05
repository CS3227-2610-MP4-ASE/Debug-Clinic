import { afterEach, describe, expect, it, vi } from "vitest";
import playwrightConfig from "../../../playwright.config.js";

describe("Playwright authentication origin", () => {
  const baseURL = playwrightConfig.use?.baseURL;
  const servers = playwrightConfig.webServer;
  if (!baseURL || !Array.isArray(servers) || servers.length !== 2) {
    throw new Error(
      "Expected explicit backend and frontend application servers",
    );
  }
  const [backend, frontend] = servers;
  const browserOrigin = new URL(baseURL).origin;

  it.each(["APP_ORIGIN", "BETTER_AUTH_URL"])(
    "uses the browser origin for %s",
    (name) => {
      for (const server of servers) {
        expect(server.env?.[name]).toBe(browserOrigin);
      }
    },
  );

  it("allows only the browser origin in CORS", () => {
    for (const server of servers) {
      expect(server.env?.["CORS_ORIGINS"]?.split(",")).toEqual([browserOrigin]);
    }
  });

  it("waits for the proxied API and pins Vite to the browser address", () => {
    expect(frontend?.url).toBe(`${browserOrigin}/api/health`);
    const address = new URL(baseURL);
    expect(frontend?.command).toBe(
      `npm run dev -w @debugclinic/frontend -- --host ${address.hostname} --port ${address.port} --strictPort`,
    );
  });

  it("starts its configured server rather than reusing an unknown environment", () => {
    for (const server of servers) {
      expect(server.reuseExistingServer).toBe(false);
    }
  });

  it("awaits the backend at its configured port before the frontend proxy", () => {
    expect(backend?.command).toBe(
      "node --conditions=development --import tsx apps/backend/src/server.ts",
    );
    expect(backend?.url).toBe(
      `http://127.0.0.1:${backend?.env?.["PORT"]}/api/health`,
    );
  });

  it.each([
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "OAUTH_PROXY_URL",
    "OAUTH_PROXY_SECRET",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "EMAIL_FROM",
    "VITE_API_BASE_URL",
  ])("clears inherited external service settings in %s", (name) => {
    for (const server of servers) {
      expect(server.env?.[name]).toBe("");
    }
  });
});

describe("Playwright isolated database override", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each([
    "postgresql://debugclinic:synthetic@127.0.0.1:55433/browser_test",
    "postgres://debugclinic:synthetic@localhost:55433/browser_test",
  ])(
    "passes the explicit test database to both runtime targets",
    async (url) => {
      vi.stubEnv("E2E_TEST_DATABASE_URL", url);
      vi.resetModules();
      const { default: config } = await import("../../../playwright.config.js");
      const servers = config.webServer;
      if (!Array.isArray(servers))
        throw new Error("Expected application servers");
      for (const server of servers) {
        expect(server.env?.["DATABASE_URL"]).toBe(url);
        expect(server.env?.["DATABASE_URL_POOLED"]).toBe(url);
      }
    },
  );

  it.each([
    "not a database URL",
    "postgresql://debugclinic:synthetic@database.example.test/browser_test",
    "postgresql://debugclinic:synthetic@127.0.0.1:55433/debugclinic",
    "mysql://debugclinic:synthetic@127.0.0.1:55433/browser_test",
    "postgresql://debugclinic:synthetic@127.0.0.1:55433/browser_test?host=database.example.test",
    "postgresql://debugclinic:synthetic@127.0.0.1:55433/browser_test?%68ost=database.example.test",
    "postgresql://debugclinic:synthetic@127.0.0.1:55433/browser_test?host=/var/run/postgresql",
    "postgresql://debugclinic:synthetic@127.0.0.1:55433/browser_test?database=debugclinic",
    "postgresql://debugclinic:synthetic@127.0.0.1:55433/browser_test?sslmode=disable",
    "postgresql://debugclinic:synthetic@127.0.0.1:55433/browser_test#fragment",
  ])(
    "rejects unsafe database targets before starting a server",
    async (url) => {
      vi.stubEnv("E2E_TEST_DATABASE_URL", url);
      vi.resetModules();
      await expect(import("../../../playwright.config.js")).rejects.toThrow(
        "E2E_TEST_DATABASE_URL must identify a loopback PostgreSQL _test database",
      );
    },
  );
});
