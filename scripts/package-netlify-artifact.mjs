import { randomUUID } from "node:crypto";
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Use the exact deploy tool's packager without linking a site or uploading.
// Pass an absolute installed netlify-cli/package.json path (version 27.16.1).
const cliManifest = process.argv[2];
if (!cliManifest || !isAbsolute(cliManifest))
  throw new Error("Pass the absolute pinned netlify-cli/package.json path");
if (process.versions.node.split(".")[0] !== "24")
  throw new Error("Use Node 24");
const metadata = JSON.parse(await readFile(cliManifest, "utf8"));
if (metadata.name !== "netlify-cli" || metadata.version !== "27.16.1")
  throw new Error("Use the project's pinned Netlify CLI 27.16.1");
const require = createRequire(cliManifest);
const { parse } = require("toml");
const { zipFunctions } = await import(
  pathToFileURL(require.resolve("@netlify/zip-it-and-ship-it")).href
);
const { normalizeFunctionsConfig } = await import(
  pathToFileURL(join(dirname(cliManifest), "dist/lib/functions/config.js")).href
);
const root = fileURLToPath(new URL("../", import.meta.url));
const config = parse(await readFile(join(root, "netlify.toml"), "utf8"));
const deployment = JSON.parse(
  await readFile(join(root, "generated/deployment.json"), "utf8"),
);
if (deployment.kind !== "local")
  throw new Error(
    "Build local deployment metadata before this synthetic smoke",
  );
const destination = join(root, ".netlify", `auth-smoke-${randomUUID()}`);
await mkdir(destination, { recursive: true });
const functionsConfig = normalizeFunctionsConfig({
  functionsConfig: { "*": config.functions },
  projectRoot: root,
  siteEnv: { AWS_LAMBDA_JS_RUNTIME: "nodejs24.x" },
});
const packaged = await zipFunctions(
  resolve(root, config.build.functions),
  destination,
  {
    basePath: root,
    repositoryRoot: root,
    config: functionsConfig,
    featureFlags: {
      zisi_functions_api_v2: true,
      zisi_pure_esm: true,
      zisi_pure_esm_mjs: true,
    },
    manifest: join(destination, "manifest.json"),
  },
);
const api = packaged.find((entry) => entry.name === "api");
if (!api || api.runtimeAPIVersion !== 2 || api.outputModuleFormat !== "esm")
  throw new Error("Expected the packaged API to use the ESM Web handler");
process.stdout.write(
  `${JSON.stringify({
    cli: metadata.version,
    artifact: api.path,
    entryFilename: api.entryFilename,
    runtimeAPIVersion: api.runtimeAPIVersion,
    outputModuleFormat: api.outputModuleFormat,
    manifest: join(destination, "manifest.json"),
  })}\n`,
);
