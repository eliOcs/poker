import { test as base, devices } from "@playwright/test";
import { PokerPlayer } from "./poker-player.js";
import { attachDebugListeners } from "./page-debug.js";
import { startCoverage, stopCoverage } from "./coverage.js";
import { ensureEmailSinkDir } from "./email.js";

// Set DEBUG_E2E=1 to enable console/error logging
const DEBUG = process.env.DEBUG_E2E === "1";

/**
 * Creates a player fixture with optional debug logging
 * @param {string} name - Player display name
 * @param {object} [contextOptions] - Extra browser context options (e.g. viewport, isMobile)
 */
function createPlayerFixture(name, contextOptions = {}) {
  return async ({ browser }, use) => {
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
      ...contextOptions,
    });
    const page = await context.newPage();
    await startCoverage(page);

    if (DEBUG) {
      attachDebugListeners(page, { prefix: name });
    }

    const player = new PokerPlayer(context, page, name);
    await use(player);
    if (!page.isClosed()) {
      await stopCoverage(page);
    }
    await context.close().catch(() => {});
  };
}

/**
 * Custom fixtures for poker e2e tests
 * Using fixtures ensures contexts are tracked by Playwright UI
 *
 * Enable debug logging: DEBUG_E2E=1 npm run test:e2e
 */
export const test = base.extend({
  emailSink: [
    async ({}, use) => {
      await ensureEmailSinkDir();
      await use();
    },
    { auto: true },
  ],
  /** @type {PokerPlayer} */
  player1: createPlayerFixture("Player 1"),
  /** @type {PokerPlayer} Player 2 uses a mobile viewport */
  player2: createPlayerFixture("Player 2", devices["Pixel 5"]),
  /** @type {PokerPlayer} */
  player3: createPlayerFixture("Player 3"),
  /** @type {PokerPlayer} */
  player4: createPlayerFixture("Player 4"),
  /** @type {PokerPlayer} */
  player5: createPlayerFixture("Player 5"),
  /** @type {PokerPlayer} */
  player6: createPlayerFixture("Player 6"),
  /** @type {PokerPlayer} */
  player7: createPlayerFixture("Player 7"),
  /** @type {PokerPlayer} */
  player8: createPlayerFixture("Player 8"),
  /** @type {PokerPlayer} */
  player9: createPlayerFixture("Player 9"),
  /** @type {PokerPlayer} */
  player10: createPlayerFixture("Player 10"),
  /** @type {PokerPlayer} */
  player11: createPlayerFixture("Player 11"),
});

export { expect } from "@playwright/test";
