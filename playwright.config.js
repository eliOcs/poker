import { defineConfig, devices } from "@playwright/test";
import { randomInt } from "node:crypto";
import path from "node:path";

// Use different ports for e2e tests to avoid conflicts with dev server
const E2E_HOST = "localhost";
const E2E_RESULTS_DIR = path.join(process.cwd(), "test-results");
const E2E_DATA_DIR =
  process.env.DATA_DIR || path.join(E2E_RESULTS_DIR, "runtime-data");
const E2E_EMAIL_DIR =
  process.env.E2E_EMAIL_DIR || path.join(E2E_RESULTS_DIR, "runtime-emails");
const STRESS_TESTS = /stress.*\.spec\.js$/;

process.env.DATA_DIR = E2E_DATA_DIR;
process.env.E2E_EMAIL_DIR = E2E_EMAIL_DIR;

// Stress tests explore different deals on every run. Workers inherit the env,
// so the seed is generated once and can be replayed with STRESS_RNG_SEED.
if (!process.env.STRESS_RNG_SEED) {
  process.env.STRESS_RNG_SEED = String(randomInt(2 ** 31));
  console.log(`Stress e2e RNG seed: ${process.env.STRESS_RNG_SEED}`);
}

/**
 * @param {{ port: number, seed: string, dataDir: string }} options
 */
function createServer({ port, seed, dataDir }) {
  const origin = `http://${E2E_HOST}:${port}`;
  return {
    command: "node --env-file=.env src/backend",
    url: origin,
    reuseExistingServer: !process.env.CI && process.env.E2E_COVERAGE !== "1",
    stdout: /** @type {const} */ ("pipe"),
    stderr: /** @type {const} */ ("pipe"),
    gracefulShutdown: {
      signal: /** @type {const} */ ("SIGTERM"),
      timeout: 5000,
    },
    env: {
      HOST: E2E_HOST,
      PORT: String(port),
      DOMAIN: E2E_HOST,
      APP_ORIGIN: origin,
      // Player contexts simulate separate clients through forwarded IPs.
      TRUSTED_PROXY_CIDRS: "127.0.0.1/32,::1/128",
      RNG_SEED: seed,
      TIMER_SPEED: process.env.TIMER_SPEED || "10", // 10x faster for e2e tests
      DATA_DIR: dataDir,
      EMAIL_SINK_DIR: E2E_EMAIL_DIR,
      ...(process.env.E2E_COVERAGE === "1" && {
        NODE_V8_COVERAGE: "coverage/e2e/tmp",
      }),
    },
  };
}

const e2eServer = createServer({
  port: 8444,
  seed: process.env.RNG_SEED || "12345",
  dataDir: path.join(E2E_DATA_DIR, "e2e"),
});
const stressServer = createServer({
  port: 8445,
  seed: process.env.STRESS_RNG_SEED,
  dataDir: path.join(E2E_DATA_DIR, "stress"),
});

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 60000,
  retries: 0,
  workers: 1,
  reporter: "list",

  use: {
    actionTimeout: 5000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      testIgnore: STRESS_TESTS,
      use: { ...devices["Desktop Chrome"], baseURL: e2eServer.url },
    },
    {
      name: "stress",
      testMatch: STRESS_TESTS,
      use: { ...devices["Desktop Chrome"], baseURL: stressServer.url },
    },
  ],

  webServer: [e2eServer, stressServer],
});
