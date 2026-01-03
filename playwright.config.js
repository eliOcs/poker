import { defineConfig, devices } from "@playwright/test";

// Use a different port for e2e tests to avoid conflicts with dev server
const E2E_PORT = 8444;

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 60000,
  retries: 0,
  workers: 1, // Serial execution for poker games
  reporter: "list",

  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "node --env-file=.env src/backend",
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: false, // Always start fresh server for tests
    stdout: "pipe",
    stderr: "pipe",
    env: {
      PORT: String(E2E_PORT),
      DOMAIN: "localhost",
      RNG_SEED: process.env.RNG_SEED || "12345",
      TIMER_SPEED: process.env.TIMER_SPEED || "10", // 10x faster for e2e tests
    },
  },
});
