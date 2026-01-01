/**
 * Represents a player in the e2e test
 * Manages their browser context, page, and WebSocket connection
 */
export class PokerPlayer {
  /** @type {import('@playwright/test').BrowserContext} */
  context;
  /** @type {import('@playwright/test').Page} */
  page;
  /** @type {string} */
  name;

  /**
   * @param {import('@playwright/test').BrowserContext} context
   * @param {import('@playwright/test').Page} page
   * @param {string} name - Display name for logging
   */
  constructor(context, page, name) {
    this.context = context;
    this.page = page;
    this.name = name;
  }

  /**
   * Navigate to game page and wait for connection
   * @param {string} gameId
   */
  async joinGame(gameId) {
    await this.page.goto(`/games/${gameId}`);
    await this.page.waitForSelector("phg-game");
    // Wait for WebSocket connection
    await this.page.waitForFunction(() => {
      const game = document.querySelector("phg-game");
      return game?.socket?.readyState === 1;
    });
  }

  /**
   * Sit at a specific seat
   * @param {number} seatIndex
   */
  async sit(seatIndex) {
    // Click the sit button in the empty seat
    const seatSelector = `.seat:nth-child(${seatIndex + 1})`;
    await this.page.waitForSelector(`${seatSelector}.empty button`);
    await this.page.click(`${seatSelector}.empty button`);
    // Wait for seat to show as occupied (current-player class)
    await this.page.waitForSelector(`${seatSelector}.current-player`);
  }

  /**
   * Buy in with amount
   * @param {number} amount
   */
  async buyIn(amount) {
    // Set the slider value and click buy in
    await this.page.waitForSelector("#actions button.buy-in");
    // Set range input value
    await this.page.evaluate((amt) => {
      const input = document.querySelector('#actions input[type="range"]');
      if (input) {
        input.value = amt;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, amount);
    await this.page.click("#actions button.buy-in");
    // Wait for stack to appear
    await this.page.waitForFunction(() => {
      const game = document.querySelector("phg-game");
      const seat = game?.game?.seats?.find((s) => s.isCurrentPlayer);
      return seat?.stack > 0;
    });
  }

  /**
   * Click the start game button
   */
  async startGame() {
    await this.page.waitForSelector("#actions button.start");
    await this.page.click("#actions button.start");
  }

  /**
   * Wait for countdown to complete and hand to start
   */
  async waitForHandStart() {
    await this.page.waitForFunction(
      () => {
        const game = document.querySelector("phg-game");
        return game?.game?.hand?.phase === "preflop";
      },
      { timeout: 15000 },
    );
  }

  /**
   * Check if it's this player's turn
   * @returns {Promise<boolean>}
   */
  async isMyTurn() {
    return await this.page.evaluate(() => {
      const game = document.querySelector("phg-game");
      const seat = game?.game?.seats?.find((s) => s.isCurrentPlayer);
      return seat?.isActing === true;
    });
  }

  /**
   * Wait for it to be this player's turn
   * @param {number} [timeout=15000]
   */
  async waitForTurn(timeout = 15000) {
    await this.page.waitForFunction(
      () => {
        const game = document.querySelector("phg-game");
        const seat = game?.game?.seats?.find((s) => s.isCurrentPlayer);
        return seat?.isActing === true;
      },
      { timeout },
    );
  }

  /**
   * Check if action is available
   * @param {string} actionName
   * @returns {Promise<boolean>}
   */
  async hasAction(actionName) {
    return await this.page.evaluate((name) => {
      const game = document.querySelector("phg-game");
      const seat = game?.game?.seats?.find((s) => s.isCurrentPlayer);
      return seat?.actions?.some((a) => a.action === name) ?? false;
    }, actionName);
  }

  /**
   * Perform a betting action
   * @param {'check' | 'call' | 'fold' | 'bet' | 'raise' | 'allIn'} action
   */
  async act(action) {
    // For allIn, we need to move the slider to max first
    if (action === "allIn") {
      // Move slider to max value to trigger all-in button
      await this.page.waitForSelector('#actions input[type="range"]');
      await this.page.evaluate(async () => {
        const game = document.querySelector("phg-game");
        const input = game?.shadowRoot?.querySelector(
          '#actions input[type="range"]',
        );
        if (input) {
          input.value = input.max;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        // Wait for Lit component to re-render
        await game?.updateComplete;
      });
      // Wait for button text to change to "All-In"
      await this.page.waitForFunction(() => {
        const game = document.querySelector("phg-game");
        const buttons =
          game?.shadowRoot?.querySelectorAll("#actions button") || [];
        return Array.from(buttons).some((b) =>
          b.textContent?.includes("All-In"),
        );
      });
      await this.page.click("#actions button.all-in");
    } else {
      const selector = `#actions button.${action}`;
      await this.page.waitForSelector(selector);
      await this.page.click(selector);
    }
    // Small delay for state propagation
    await this.page.waitForTimeout(100);
  }

  /**
   * Get current game state from player's perspective
   * @returns {Promise<object>}
   */
  async getGameState() {
    return await this.page.evaluate(() => {
      const game = document.querySelector("phg-game");
      return game?.game;
    });
  }

  /**
   * Get current hand phase
   * @returns {Promise<string|null>}
   */
  async getPhase() {
    return await this.page.evaluate(() => {
      const game = document.querySelector("phg-game");
      return game?.game?.hand?.phase ?? null;
    });
  }

  /**
   * Get this player's hole cards
   * @returns {Promise<Array<{rank: string, suit: string}>>}
   */
  async getHoleCards() {
    return await this.page.evaluate(() => {
      const game = document.querySelector("phg-game");
      const seat = game?.game?.seats?.find((s) => s.isCurrentPlayer);
      return seat?.cards?.filter((c) => !c.hidden) || [];
    });
  }

  /**
   * Get community cards on the board
   * @returns {Promise<Array<{rank: string, suit: string}>>}
   */
  async getBoardCards() {
    return await this.page.evaluate(() => {
      const game = document.querySelector("phg-game");
      return game?.game?.board?.cards || [];
    });
  }

  /**
   * Get player's current stack
   * @returns {Promise<number>}
   */
  async getStack() {
    return await this.page.evaluate(() => {
      const game = document.querySelector("phg-game");
      const seat = game?.game?.seats?.find((s) => s.isCurrentPlayer);
      return seat?.stack ?? 0;
    });
  }
}
