import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // PGlite starts a whole Postgres in memory; give the first test time to boot it.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: { NODE_ENV: "test", LOG_LEVEL: "silent" },
  },
});
