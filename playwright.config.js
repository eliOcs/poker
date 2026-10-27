import { defineConfig, devices } from "@playwright/test";
import { randomInt } from "node:crypto";

const STRESS_TESTS = /stress.*\.spec\.js$/;
const COVERAGE = process.env.E2E_COVERAGE === "1";

// Workers inherit the env, so email tests can read the sink.
process.env.E2E_EMAIL_DIR = "test-results/runtime-emails";

// Stress tests explore different deals on every run. The seed is picked here
// rather than left to the server's Math.random so failures can be replayed.
// It goes in the env because workers re-evaluate this config and must agree.
if (!process.env.STRESS_RNG_SEED) {
  process.env.STRESS_RNG_SEED = String(randomInt(2 ** 31));
  console.log(`Stress e2e RNG seed: ${process.env.STRESS_RNG_SEED}`);
}

/**
 * Dedicated server per project, on its own port, so dev servers keep running.
 * @param {string} name
 * @param {number} port
 * @param {string} seed
 */
function server(name, port, seed) {
  const url = `http://localhost:${port}`;
  return {
    command: "node --env-file=.env src/backend",
    url,
    reuseExistingServer: !process.env.CI && !COVERAGE,
    stdout: "pipe",
    // SIGTERM lets the server flush state and V8 coverage before exiting.
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    env: {
      HOST: "localhost",
      PORT: String(port),
      DOMAIN: "localhost",
      APP_ORIGIN: url,
      // Player contexts simulate separate clients through forwarded IPs.
      TRUSTED_PROXY_CIDRS: "127.0.0.1/32,::1/128",
      RNG_SEED: seed,
      TIMER_SPEED: process.env.TIMER_SPEED || "10",
      DATA_DIR: `test-results/runtime-data/${name}`,
      EMAIL_SINK_DIR: process.env.E2E_EMAIL_DIR,
      // A stand-in engine that always checks or calls; see test/README.md.
      BOT_ENGINE_PATH: "test/fake-bot-engine.js",
      BOT_BLUEPRINT_PATH: "none",
      ...(COVERAGE && { NODE_V8_COVERAGE: "coverage/e2e/tmp" }),
    },
  };
}

const e2eServer = server("e2e", 8444, process.env.RNG_SEED || "12345");
const stressServer = server("stress", 8445, process.env.STRESS_RNG_SEED);

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 60000,
  workers: 1,
  reporter: "list",

  use: {
    ...devices["Desktop Chrome"],
    actionTimeout: 5000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      testIgnore: STRESS_TESTS,
      use: { baseURL: e2eServer.url },
    },
    {
      name: "stress",
      testMatch: STRESS_TESTS,
      use: { baseURL: stressServer.url },
    },
  ],

  webServer: [e2eServer, stressServer],
});
