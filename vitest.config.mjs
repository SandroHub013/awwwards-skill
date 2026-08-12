import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.mjs"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["docs/demos/soglia/render/lib.mjs"],
      reporter: ["text", "lcov"],
    },
  },
});
