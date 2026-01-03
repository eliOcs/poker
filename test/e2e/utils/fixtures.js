import { test as base } from "@playwright/test";
import { PokerPlayer } from "./poker-player.js";

/**
 * Custom fixtures for poker e2e tests
 * Using fixtures ensures contexts are tracked by Playwright UI
 */
export const test = base.extend({
  /**
   * Player 1 fixture - creates a tracked browser context
   * @type {PokerPlayer}
   */
  player1: async ({ browser }, use) => {
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    const player = new PokerPlayer(context, page, "Player 1");
    await use(player);
    await context.close();
  },

  /**
   * Player 2 fixture - creates a tracked browser context
   * @type {PokerPlayer}
   */
  player2: async ({ browser }, use) => {
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    const player = new PokerPlayer(context, page, "Player 2");
    await use(player);
    await context.close();
  },

  /**
   * Player 3 fixture - creates a tracked browser context
   * @type {PokerPlayer}
   */
  player3: async ({ browser }, use) => {
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    const player = new PokerPlayer(context, page, "Player 3");
    await use(player);
    await context.close();
  },
});

export { expect } from "@playwright/test";
