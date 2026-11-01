import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { deploymentFromBuild } from "../apps/backend/src/config/deployment.js";

const destination = fileURLToPath(
  new URL("../generated/deployment.json", import.meta.url),
);
mkdirSync(fileURLToPath(new URL("../generated/", import.meta.url)), {
  recursive: true,
});
const deployment = deploymentFromBuild(process.env);
writeFileSync(destination, `${JSON.stringify(deployment, null, 2)}\n`);
console.log(`Prepared public deployment metadata: ${deployment.kind}`);
