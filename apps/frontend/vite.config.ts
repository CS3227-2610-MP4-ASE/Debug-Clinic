import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  preview: { host: "127.0.0.1", port: 4173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@mui") || id.includes("@emotion")) return "ui";
          if (id.includes("better-auth")) return "auth";
          if (id.includes("react") || id.includes("scheduler")) return "react";
          if (id.includes("zod")) return "validation";
          return "vendor";
        },
      },
    },
  },
});
