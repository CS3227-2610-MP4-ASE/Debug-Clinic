import "dotenv/config";
import { readEnv } from "../apps/backend/src/config/env.js";

const result = (() => {
  try {
    const config = readEnv();
    console.log(
      `Configuration valid for ${config.nodeEnv}. Values are not printed.`,
    );
    console.log(
      `Google OAuth: ${config.googleClientId ? "configured" : "not configured"}`,
    );
    console.log(
      `Authentication email: ${config.resendApiKey ? "configured" : "disabled (local development only)"}`,
    );
    console.log(`AI provider: ${config.aiProvider}`);
    return 0;
  } catch {
    console.error(
      "Configuration invalid. Check the required names in .env.example and docs/CredentialsSetup.md. Secret values are intentionally omitted.",
    );
    return 1;
  }
})();
process.exitCode = result;
