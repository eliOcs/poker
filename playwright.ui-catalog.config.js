import { defineConfig, devices } from "@playwright/test";

const UI_CATALOG_PORT = 8445;

export default defineConfig({
  testDir: "./test/ui-catalog",
  testMatch: "*.test.js",
  timeout: 30000,
  retries: 0,
  reporter: "list",

  // Screenshot comparison settings
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },

  use: {
    baseURL: `http://localhost:${UI_CATALOG_PORT}`,
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1200, height: 800 },
      },
    },
    {
      name: "mobile",
      use: devices["iPhone 12"],
    },
  ],

  webServer: {
    command: "node test/ui-catalog/server.js",
    url: `http://localhost:${UI_CATALOG_PORT}`,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
});
