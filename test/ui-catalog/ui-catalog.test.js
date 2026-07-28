import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "parallel" });

// Test case IDs (keep in sync with test-cases.js)
const TEST_CASES = [
  // Landing page
  "landing-page",
  "sitngo-creation-speed-tooltip",
  "tournaments-page",
  "tournaments-speed-tooltip",
  "player-profile-summary",

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
  "game-player-folded",
  "game-show-card-actions",
  "game-clock-called",
  "game-sitting-out",
  "game-disconnected-player",
  "game-full-table",

  // Action panel states
  "action-sit-in",
  "action-bet",
  "action-raise",
  "action-raise-preflop",
  "action-all-in",
  "action-fold-or-all-in",
  "action-emote-and-clock",
  "action-show-cards",
  "action-pre-check-fold",
  "action-pre-fold-and-call",
  "action-tournament-winner",
  "action-tournament-busted",

  // Table sizes
  "table-heads-up",
  "table-6max",
  "table-full-ring",

  // Error states (using toast)
  "game-error",

  // Modal states
  "game-rankings-modal",
  "game-rankings-modal-tooltip",
  "game-rankings-modal-tournament",
  "game-tournament-levels-modal",
  "game-settings-modal",

  // Email states
  "email-sign-in",

  // MTT lobby states
  "mtt-lobby-loading",
  "mtt-lobby-error",
  "mtt-lobby-registration-can-register",
  "mtt-lobby-registration-registered",
  "mtt-lobby-registration-owner-can-start",
  "mtt-lobby-registration-action-pending",
  "mtt-lobby-running-can-late-register",
  "mtt-lobby-running-late-register-tooltip",
  "mtt-lobby-running-waiting-for-table",
  "mtt-lobby-running",
  "mtt-lobby-running-on-break",
  "mtt-lobby-running-pending-break",
  "mtt-lobby-running-multiple-tables",
  "mtt-lobby-finished",
  "mtt-lobby-finished-as-winner",

  // Hand history states
  "history-empty",
  "history-preflop-fold",
  "history-showdown-win",
  "history-showdown-lose",
  "history-multiple-hands",
  "history-replay-start",
  "history-replay-mid-action",
  "history-replay-final",
];

function getComponentSelector(testCase) {
  if (testCase.startsWith("email-")) return ".email-preview";
  if (
    [
      "landing-page",
      "sitngo-creation-speed-tooltip",
      "tournaments-page",
      "tournaments-speed-tooltip",
    ].includes(testCase)
  ) {
    return "phg-app-shell";
  }
  if (testCase === "player-profile-summary") return "phg-app-shell";
  if (testCase.startsWith("history-")) return "phg-history";
  if (testCase.startsWith("mtt-lobby-")) return "phg-mtt-lobby";
  // game-*, table-* all use phg-game
  return "phg-game";
}

async function prepareTestCase(testCase, page, component) {
  const replayIndex = {
    "history-replay-start": 0,
    "history-replay-mid-action": 1,
  }[testCase];
  if (replayIndex !== undefined) {
    await component.evaluate(async (element, index) => {
      element.stopPlayback();
      element.replayIndex = index;
      await element.updateComplete;
    }, replayIndex);
  }

  const shellContentSelector = {
    "landing-page": "phg-home",
    "sitngo-creation-speed-tooltip": "phg-home",
    "player-profile-summary": "phg-player-profile",
    "tournaments-page": "phg-tournaments",
    "tournaments-speed-tooltip": "phg-tournaments",
  }[testCase];
  if (shellContentSelector) {
    await expect(component.locator("phg-navigation-drawer")).toHaveCount(1);
    await component
      .locator(shellContentSelector)
      .evaluate((element) => /** @type {any} */ (element).updateComplete);
  }

  if (testCase.startsWith("mtt-lobby-")) {
    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error("UI catalog tests require a configured viewport");
    }
    const viewportHeight = viewport.height;
    const lobbyHeight = await component.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    const drawerHeight = await component
      .locator(".drawer-panel")
      .evaluate((element) => element.getBoundingClientRect().height);
    expect(lobbyHeight).toBeGreaterThanOrEqual(viewportHeight);
    expect(drawerHeight).toBeGreaterThanOrEqual(viewportHeight);
  }

  const tooltipLabel = {
    "game-rankings-modal-tooltip": "Net winnings details",
    "mtt-lobby-running-late-register-tooltip": "Late registration details",
    "sitngo-creation-speed-tooltip": "Tournament speed details",
    "tournaments-speed-tooltip": "Tournament speed details",
  }[testCase];
  if (!tooltipLabel) return;
  await component.evaluate((element, label) => {
    const trigger = element.querySelector(`[aria-label="${label}"]`);
    if (!(trigger instanceof HTMLElement)) {
      throw new Error(`${label} tooltip trigger was not rendered`);
    }
    trigger.focus({ preventScroll: true });
  }, tooltipLabel);
}

for (const testCase of TEST_CASES) {
  // eslint-disable-next-line playwright/valid-title
  test(testCase, async ({ page }) => {
    await page.goto(`/test.html?test=${testCase}`);

    const selector = getComponentSelector(testCase);
    const component = page.locator(selector);
    await component.waitFor();

    // Wait for Lit component to fully render
    await component.evaluate((el) => el.updateComplete);

    await prepareTestCase(testCase, page, component);

    // Capture content that extends below the viewport as well.
    await expect(page).toHaveScreenshot(`${testCase}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
}

// Static article pages
for (const [path, selector] of [
  ["about", "phg-about"],
  ["release-notes", "phg-release-notes"],
]) {
  // eslint-disable-next-line playwright/valid-title
  test(path, async ({ page }) => {
    await page.goto(`/${path}`);

    await page.locator(selector).waitFor();

    await expect(page).toHaveScreenshot(`${path}.png`, { fullPage: true });
  });
}
