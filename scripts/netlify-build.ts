import { execFileSync } from "node:child_process";
import {
  assertDevelopmentMigrationTarget,
  deploymentFromBuild,
} from "../apps/backend/src/config/deployment.js";

const deployment = deploymentFromBuild(process.env);
if (deployment.kind === "local") {
  throw new Error(
    "Netlify build requires explicit site metadata; use npm run build locally",
  );
}
if (deployment.kind === "production") {
  throw new Error(
    "Production must use the protected GitHub workflow, not a native Netlify build",
  );
}
if (deployment.kind === "development" || deployment.kind === "preview") {
  assertDevelopmentMigrationTarget(process.env);
  // Native Netlify deployment waits for schema readiness. No parallel GitHub
  // migration/deployment job can race this build. Never run development seeds.
  execFileSync("npm", ["run", "db:deploy"], { stdio: "inherit" });
}
execFileSync("npm", ["run", "build"], { stdio: "inherit" });
