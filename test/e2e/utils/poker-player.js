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
   * Get the phg-game element locator
   */
  get gameElement() {
    return this.page.locator("phg-game");
  }

  /**
   * Navigate to game page and wait for connection
   * @param {string} gameId
   */
  async joinGame(gameId) {
    await this.page.goto(`/games/${gameId}`);
    await this.gameElement.waitFor();
    // Wait for WebSocket connection
    await this.page.waitForFunction(() => {
      const game = document.querySelector("phg-game");
      return game?.socket?.readyState === 1;
    });
  }

  /**
   * Navigate to game page using a URL and wait for connection
   * @param {string} url
   */
  async joinGameByUrl(url) {
    await this.page.goto(url);
    await this.gameElement.waitFor();
    // Wait for WebSocket connection
    await this.page.waitForFunction(() => {
      const game = document.querySelector("phg-game");
      return game?.socket?.readyState === 1;
    });
  }

  /**
   * Copy the game link using the Copy Link button
   * @returns {Promise<string>} The copied URL
   */
  async copyGameLink() {
    // Click the Copy Link button in the action panel
    const actionPanel = this.gameElement.locator("phg-action-panel");
    await actionPanel.getByRole("button", { name: "Copy Link" }).click();

    // Wait for button to show "Copied!" feedback
    await actionPanel.getByRole("button", { name: "Copied!" }).waitFor();

    // Read from clipboard
    const url = await this.page.evaluate(() => navigator.clipboard.readText());
    return url;
  }

  /**
   * Sit at a specific seat
   * @param {number} seatIndex
   */
  async sit(seatIndex) {
    // Click the Sit button in the empty seat
    const seat = this.gameElement.locator(
      `phg-seat:nth-child(${seatIndex + 1})`,
    );
    await seat.getByRole("button", { name: "Sit" }).click();
    // Wait for seat to show as occupied (current-player class)
    await seat.and(this.page.locator(".current-player")).waitFor();
  }

  /**
   * Buy in with amount
   * @param {number} amount
   */
  async buyIn(amount) {
    // Use mouse to drag slider to desired position
    const slider = this.gameElement.locator('input[type="range"]');
    await this.dragSliderToValue(slider, amount);

    await this.gameElement.getByRole("button", { name: "Buy In" }).click();
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
    await this.gameElement.getByRole("button", { name: "Start Game" }).click();
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
   * Drag a slider to a specific value using mouse
   * @param {import('@playwright/test').Locator} slider
   * @param {number} targetValue
   */
  async dragSliderToValue(slider, targetValue) {
    const box = await slider.boundingBox();
    if (!box) throw new Error("Slider not found");

    // Get slider min/max from DOM
    const { min, max } = await slider.evaluate((el) => ({
      min: parseFloat(el.min),
      max: parseFloat(el.max),
    }));

    // Calculate target X position
    const percentage = (targetValue - min) / (max - min);
    const targetX = box.x + box.width * percentage;
    const centerY = box.y + box.height / 2;

    // Drag from current position to target
    await slider.hover();
    await this.page.mouse.down();
    await this.page.mouse.move(targetX, centerY);
    await this.page.mouse.up();
  }

  /**
   * Drag slider to its maximum value using mouse
   * @param {import('@playwright/test').Locator} slider
   */
  async dragSliderToMax(slider) {
    const box = await slider.boundingBox();
    if (!box) throw new Error("Slider not found");

    // Drag to right edge (max value)
    const targetX = box.x + box.width;
    const centerY = box.y + box.height / 2;

    await slider.hover();
    await this.page.mouse.down();
    await this.page.mouse.move(targetX, centerY);
    await this.page.mouse.up();
  }

  /**
   * Perform a betting action
   * @param {'check' | 'call' | 'fold' | 'bet' | 'raise' | 'allIn'} action
   */
  async act(action) {
    if (action === "allIn") {
      // Drag slider to max to trigger All-In button
      const slider = this.gameElement.locator('input[type="range"]');
      await this.dragSliderToMax(slider);
      await this.gameElement.getByRole("button", { name: "All-In" }).click();
    } else if (action === "call") {
      // Call button includes amount (e.g., "Call $25")
      await this.gameElement.getByRole("button", { name: /^Call \$/ }).click();
    } else if (action === "check") {
      await this.gameElement.getByRole("button", { name: "Check" }).click();
    } else if (action === "fold") {
      await this.gameElement.getByRole("button", { name: "Fold" }).click();
    } else if (action === "bet") {
      // Move slider slightly to ensure a valid bet amount
      const slider = this.gameElement.locator('input[type="range"]');
      const box = await slider.boundingBox();
      if (box) {
        // Click at 25% position for a small bet
        const targetX = box.x + box.width * 0.25;
        const centerY = box.y + box.height / 2;
        await slider.hover();
        await this.page.mouse.down();
        await this.page.mouse.move(targetX, centerY);
        await this.page.mouse.up();
      }
      await this.gameElement.getByRole("button", { name: "Bet" }).click();
    } else if (action === "raise") {
      // Move slider slightly to ensure a valid raise amount
      const slider = this.gameElement.locator('input[type="range"]');
      const box = await slider.boundingBox();
      if (box) {
        // Click at 25% position for a small raise
        const targetX = box.x + box.width * 0.25;
        const centerY = box.y + box.height / 2;
        await slider.hover();
        await this.page.mouse.down();
        await this.page.mouse.move(targetX, centerY);
        await this.page.mouse.up();
      }
      await this.gameElement.getByRole("button", { name: /^Raise to/ }).click();
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    // Wait for state to propagate via WebSocket
    await this.page.waitForTimeout(200);
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
