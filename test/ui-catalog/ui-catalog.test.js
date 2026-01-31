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

  // Table sizes
  "table-heads-up",
  "table-6max",
  "table-full-ring",

  // Error states (using toast)
  "game-error",

  // Modal states
  "game-rankings-modal",
  "game-settings-modal",

  // Hand history states
  "history-loading",
  "history-empty",
  "history-preflop-fold",
  "history-showdown-win",
  "history-showdown-lose",
  "history-multiple-hands",
];

function getComponentSelector(testCase) {
  if (testCase === "landing-page") return "phg-home";
  if (testCase.startsWith("history-")) return "phg-history";
  // game-*, table-* all use phg-game
  return "phg-game";
}

for (const testCase of TEST_CASES) {
  // eslint-disable-next-line playwright/valid-title
  test(testCase, async ({ page }) => {
    await page.goto(`/?test=${testCase}`);

    const selector = getComponentSelector(testCase);
    const component = page.locator(selector);
    await component.waitFor();

    // Wait for Lit component to fully render
    await component.evaluate((el) => el.updateComplete);

    // Take screenshot of the root element (full viewport)
    await expect(page.locator("#root")).toHaveScreenshot(`${testCase}.png`, {
      maxDiffPixelRatio: 0.01,
    });
  });
}
