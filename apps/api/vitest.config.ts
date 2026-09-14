import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
    // Integration tests share one Postgres database (todays_merit_test) —
    // each test uses uniquely-generated data so independent tests don't
    // collide, but running whole files in parallel worker processes adds
    // a class of flakiness (shared connection pools, timing) not worth the
    // speedup at this suite's size. Revisit if the suite gets slow.
    fileParallelism: false,
  },
});
