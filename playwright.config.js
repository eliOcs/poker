import { defineConfig, devices } from "@playwright/test";

// Use a different port for e2e tests to avoid conflicts with dev server
const E2E_PORT = 8444;
const E2E_HOST = "127.0.0.1";

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 60000,
  retries: 0,
  workers: 1,
  reporter: "list",

  use: {
    baseURL: `http://${E2E_HOST}:${E2E_PORT}`,
    actionTimeout: 5000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: devices["Desktop Chrome"],
    },
  ],

  webServer: {
    command: "node --env-file=.env src/backend",
    url: `http://${E2E_HOST}:${E2E_PORT}`,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    env: {
      HOST: E2E_HOST,
      PORT: String(E2E_PORT),
      DOMAIN: E2E_HOST,
      RNG_SEED: process.env.RNG_SEED || "12345",
      TIMER_SPEED: process.env.TIMER_SPEED || "10", // 10x faster for e2e tests
      ...(process.env.E2E_COVERAGE === "1" && {
        NODE_V8_COVERAGE: "coverage/e2e/tmp",
      }),
    },
  },
});
