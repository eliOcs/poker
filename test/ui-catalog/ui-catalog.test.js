import { test, expect } from "@playwright/test";

// Test case IDs (keep in sync with test-cases.js)
const TEST_CASES = [
  // Landing page
  "landing-page",

  // Lobby states
  "game-empty-table",
  "game-waiting-for-players",
  "game-ready-to-start",
  "game-countdown",
  "game-buy-in",

  // Preflop states
  "game-preflop-your-turn",
  "game-preflop-waiting",

  // Flop states
  "game-flop-check-or-bet",
  "game-flop-facing-bet",

  // Turn states
  "game-turn",

  // River states
  "game-river-all-in-decision",

  // Showdown states
  "game-showdown-you-win",
  "game-showdown-you-lose",

  // Special states
  "game-all-in-situation",
  "game-with-folded-players",
  "game-clock-called",
  "game-sitting-out",
  "game-disconnected-player",
  "game-full-table",

  // Error states (using toast)
  "game-error",

  // Modal states
  "game-rankings-modal",

  // Hand history states
  "history-loading",
  "history-empty",
  "history-preflop-fold",
  "history-showdown-win",
  "history-showdown-lose",
  "history-multiple-hands",
];

for (const testCase of TEST_CASES) {
  test(testCase, async ({ page }) => {
    await page.goto(`/?test=${testCase}`);

    // Wait for the appropriate component to render
    let selector;
    if (testCase === "landing-page") {
      selector = "phg-home";
    } else if (testCase.startsWith("history-")) {
      selector = "phg-history";
    } else {
      selector = "phg-game";
    }
    await page.waitForSelector(selector);

    // Give Lit components time to fully render
    await page.waitForTimeout(100);

    // Take screenshot of the root element (full viewport)
    await expect(page.locator("#root")).toHaveScreenshot(`${testCase}.png`, {
      maxDiffPixelRatio: 0.01,
    });
  });
}
