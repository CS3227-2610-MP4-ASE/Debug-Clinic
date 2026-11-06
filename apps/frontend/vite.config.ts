import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const backendPort = process.env["E2E_BACKEND_PORT"] ?? "3001";
if (
  !/^\d+$/.test(backendPort) ||
  Number(backendPort) < 1 ||
  Number(backendPort) > 65535
)
  throw new Error(
    "E2E_BACKEND_PORT must be an integer port between 1 and 65535",
  );

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": `http://127.0.0.1:${backendPort}`,
    },
  },
  preview: { host: "127.0.0.1", port: 4173 },
});
