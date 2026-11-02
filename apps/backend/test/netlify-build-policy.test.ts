import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEV_SITE_ID, PROD_SITE_ID } from "../src/config/deployment.js";

const ignoreScript = fileURLToPath(
  new URL("../../../scripts/netlify-ignore.mjs", import.meta.url),
);

describe("native Netlify build routing", () => {
  it.each([
    {
      label: "development PR preview",
      site: DEV_SITE_ID,
      context: "deploy-preview",
      branch: "feature/test",
      expected: 1,
    },
    {
      label: "development master push",
      site: DEV_SITE_ID,
      context: "production",
      branch: "master",
      expected: 0,
    },
    {
      label: "development branch deploy",
      site: DEV_SITE_ID,
      context: "branch-deploy",
      branch: "feature/test",
      expected: 0,
    },
    {
      label: "production master native build",
      site: PROD_SITE_ID,
      context: "production",
      branch: "master",
      expected: 0,
    },
    {
      label: "production PR preview",
      site: PROD_SITE_ID,
      context: "deploy-preview",
      branch: "feature/test",
      expected: 0,
    },
    {
      label: "unmapped site",
      site: "unknown",
      context: "deploy-preview",
      branch: "feature/test",
      expected: 0,
    },
    {
      label: "missing platform context",
      site: DEV_SITE_ID,
      context: "",
      branch: "master",
      expected: 0,
    },
  ])(
    "routes $label with Netlify's exit-code convention",
    ({ site, context, branch, expected }) => {
      const result = spawnSync(process.execPath, [ignoreScript], {
        env: { SITE_ID: site, CONTEXT: context, BRANCH: branch },
        encoding: "utf8",
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(expected);
      expect(result.stdout).toContain(
        expected === 1 ? "Build the development" : "Skip native build",
      );
    },
  );
});
