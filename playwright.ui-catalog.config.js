import { defineConfig, devices } from "@playwright/test";

const UI_CATALOG_PORT = 8445;
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
      use: devices["Pixel 5"],
    },
  ],

  webServer: {
    command: "npm run start:ui-catalog",
    url: `http://localhost:${UI_CATALOG_PORT}`,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
});
