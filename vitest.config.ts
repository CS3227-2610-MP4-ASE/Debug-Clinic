import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "apps/backend/test/**/*.test.ts",
      "packages/contracts/test/**/*.test.ts",
    ],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
