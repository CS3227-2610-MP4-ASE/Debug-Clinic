import { describe, expect, it } from "vitest";
import {
  assertDevelopmentMigrationTarget,
  deploymentEnvironment,
  deploymentFromBuild,
  DEV_ORIGIN,
  DEV_SITE_ID,
  PROD_ORIGIN,
  PROD_SITE_ID,
} from "../src/config/deployment.js";

const preview = (number: string) => ({
  SITE_ID: DEV_SITE_ID,
  CONTEXT: "deploy-preview",
  REVIEW_ID: number,
  DEPLOY_PRIME_URL: `https://deploy-preview-${number}--debugclinic-dev.netlify.app`,
});

describe("immutable deployment configuration", () => {
  it.each(["1", "12", "345"])("isolates the origin for PR %s", (number) => {
    const build = preview(number);
    const metadata = deploymentFromBuild(build);
    const source = {
      APP_ORIGIN: DEV_ORIGIN,
      AI_PROVIDER: "soc",
      SMTP_PASSWORD: "runtime-only",
    };
    expect(deploymentEnvironment(source, metadata)).toMatchObject({
      APP_ORIGIN: build.DEPLOY_PRIME_URL,
      CORS_ORIGINS: build.DEPLOY_PRIME_URL,
      BETTER_AUTH_URL: build.DEPLOY_PRIME_URL,
      AI_PROVIDER: "fake",
      SMTP_PASSWORD: "runtime-only",
    });
    expect(source.APP_ORIGIN).toBe(DEV_ORIGIN);
    expect(JSON.stringify(metadata)).not.toContain("runtime-only");
  });

  it.each([
    { SITE_ID: DEV_SITE_ID, origin: DEV_ORIGIN, kind: "development" },
    { SITE_ID: PROD_SITE_ID, origin: PROD_ORIGIN, kind: "production" },
  ])(
    "maps stable site $kind without trusting a URL variable",
    ({ SITE_ID, origin, kind }) => {
      expect(
        deploymentFromBuild({
          SITE_ID,
          DEPLOY_PRIME_URL: "https://evil.example",
        }),
      ).toEqual({ siteId: SITE_ID, origin, kind });
    },
  );

  it.each([
    { SITE_ID: PROD_SITE_ID },
    { SITE_ID: "unknown" },
    { REVIEW_ID: "0" },
    { REVIEW_ID: "12/path" },
    {
      DEPLOY_PRIME_URL:
        "https://deploy-preview-13--debugclinic-dev.netlify.app",
    },
    {
      DEPLOY_PRIME_URL:
        "https://deploy-preview-12--debugclinic-dev.netlify.app.evil.example",
    },
    { CONTEXT: "branch-deploy" },
  ])("fails closed on unsupported platform metadata %j", (override) => {
    expect(() =>
      deploymentFromBuild({ ...preview("12"), ...override }),
    ).toThrow();
  });

  it("rejects missing hosted site IDs, mismatched runtime sites, and extra artifact fields", () => {
    expect(() => deploymentFromBuild({ NETLIFY: "true" })).toThrow();
    const metadata = deploymentFromBuild(preview("12"));
    expect(() =>
      deploymentEnvironment({ SITE_ID: PROD_SITE_ID }, metadata),
    ).toThrow();
    expect(() =>
      deploymentEnvironment({}, { ...metadata, secret: "never-bundle" }),
    ).toThrow();
  });

  it("preserves local environment configuration", () => {
    const source = { APP_ORIGIN: "http://localhost:5173" };
    expect(deploymentFromBuild({})).toEqual({ kind: "local" });
    expect(deploymentEnvironment(source, { kind: "local" })).toEqual(source);
  });
});

describe("development migration target guard", () => {
  const development =
    "postgresql://postgres.fgfcfqbjgtemffpcpsum:synthetic@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";
  it("accepts the configured development project's session and transaction poolers", () => {
    expect(() =>
      assertDevelopmentMigrationTarget({
        DATABASE_URL: development,
        DATABASE_URL_POOLED: development.replace(":5432", ":6543"),
      }),
    ).not.toThrow();
  });
  it.each([
    undefined,
    "not-a-url",
    "https://example.com",
    development.replace("fgfcfqbjgtemffpcpsum", "ngacjlbzxfwpcapemdtp"),
    development.replace(
      ".pooler.supabase.com",
      ".pooler.supabase.com.evil.example",
    ),
  ])("rejects a missing, invalid or non-development target", (url) => {
    expect(() =>
      assertDevelopmentMigrationTarget({
        DATABASE_URL: url,
        DATABASE_URL_POOLED: development,
      }),
    ).toThrow();
    expect(() =>
      assertDevelopmentMigrationTarget({
        DATABASE_URL: development,
        DATABASE_URL_POOLED: url,
      }),
    ).toThrow();
  });
});
