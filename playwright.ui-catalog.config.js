import { defineConfig, devices } from "@playwright/test";

const UI_CATALOG_PORT = 8445;
const UI_CATALOG_WORKERS = Number(process.env.UI_CATALOG_WORKERS || 4);

export default defineConfig({
  testDir: "./test/ui-catalog",
  testMatch: "*.test.js",
  timeout: 30000,
  retries: 0,
  workers: UI_CATALOG_WORKERS,
  reporter: "list",

  // Screenshot comparison settings
  // Use platform-agnostic snapshot names to share between Mac and Linux
  snapshotPathTemplate:
    "{snapshotDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  expect: {
    toHaveScreenshot: {
      // Slightly higher threshold to tolerate cross-platform font rendering differences
      maxDiffPixelRatio: 0.02,
    },
  },

  use: {
    baseURL: `http://localhost:${UI_CATALOG_PORT}`,
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "desktop",
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
