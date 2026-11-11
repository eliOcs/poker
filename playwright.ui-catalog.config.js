import { defineConfig, devices } from "@playwright/test";
import { reservePort } from "./test/reserve-port.js";

// A free port, so tests never reuse a catalog server started for browsing.
const UI_CATALOG_PORT = await reservePort("UI_CATALOG_PORT");
const UI_CATALOG_WORKERS = Number(process.env.UI_CATALOG_WORKERS || 4);

export default defineConfig({
  testDir: "./test/ui-catalog",
  outputDir: "./test-results/ui-catalog",
  testMatch: "*.test.js",
  timeout: 5000,
  retries: 0,
  workers: UI_CATALOG_WORKERS,
  reporter: "list",

  // Keep all catalog screenshots together with platform-agnostic names.
  snapshotPathTemplate:
    "{testDir}/ui-catalog.test.js-snapshots/{arg}-{projectName}{ext}",
  use: {
    baseURL: `http://localhost:${UI_CATALOG_PORT}`,
    screenshot: "only-on-failure",
    locale: "en-US",
    timezoneId: "UTC",
  },

  projects: [
    {
      name: "desktop",
      testIgnore: "**/table-landscape.test.js",
      use: devices["Desktop Chrome"],
    },
    {
      name: "mobile",
      testIgnore: ["**/table-layout.test.js", "**/action-layout.test.js"],
      use: devices["Pixel 5"],
    },
  ],

  webServer: {
    command: "npm run start:ui-catalog",
    url: `http://localhost:${UI_CATALOG_PORT}`,
    env: { UI_CATALOG_PORT: String(UI_CATALOG_PORT) },
    stdout: "pipe",
    stderr: "pipe",
  },
});
