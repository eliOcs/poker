import { test as base } from "@playwright/test";
import { PokerPlayer } from "./poker-player.js";
import { attachDebugListeners } from "./page-debug.js";

// Set DEBUG_E2E=1 to enable console/error logging
const DEBUG = process.env.DEBUG_E2E === "1";

/**
 * Creates a player fixture with optional debug logging
 * @param {string} name - Player display name
 */
function createPlayerFixture(name) {
  return async ({ browser }, use) => {
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();

    if (DEBUG) {
      attachDebugListeners(page, { prefix: name });
    }

    const player = new PokerPlayer(context, page, name);
    await use(player);
    await context.close();
  };
}

/**
 * Custom fixtures for poker e2e tests
 * Using fixtures ensures contexts are tracked by Playwright UI
 *
 * Enable debug logging: DEBUG_E2E=1 npm run test:e2e
 */
export const test = base.extend({
  /** @type {PokerPlayer} */
  player1: createPlayerFixture("Player 1"),
  /** @type {PokerPlayer} */
  player2: createPlayerFixture("Player 2"),
  /** @type {PokerPlayer} */
  player3: createPlayerFixture("Player 3"),
});

export { expect } from "@playwright/test";
