// Separate renderer acceptance suite; never creates an execution service.
export default {
  esbuild: { jsx: "automatic" },
  test: { include: ["tests/frontend/*.test.ts"] },
};
