/**
 * Represents a player in the e2e test
 * All interactions use visible UI elements only - no component internal access
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
   * Get the game element locator (pierces through phg-app)
   */
  get game() {
    return this.page.locator("phg-game");
  }

  /**
   * Get the current player's seat locator (pierces shadow DOM)
   */
  get mySeat() {
    return this.game.locator("phg-seat.current-player");
  }

  /**
   * Get the board element locator (pierces shadow DOM)
   */
  get board() {
    return this.game.locator("phg-board");
  }

  /**
   * Get the action panel locator (pierces shadow DOM)
   */
  get actionPanel() {
    return this.game.locator("phg-action-panel");
  }

  /**
   * Navigate to game page and wait for UI to load
   * @param {string} gameId
   */
  async joinGame(gameId) {
    await this.page.goto(`/games/${gameId}`);
    // Wait for the game element to be visible, then board inside it
    await this.game.waitFor({ timeout: 10000 });
    await this.board.waitFor({ timeout: 10000 });
  }

  /**
   * Navigate to game page using a URL and wait for UI to load
   * @param {string} url
   */
  async joinGameByUrl(url) {
    await this.page.goto(url);
    await this.game.waitFor({ timeout: 10000 });
    await this.board.waitFor({ timeout: 10000 });
  }

  /**
   * Copy the game link using the Copy Link button
   * @returns {Promise<string>} The copied URL
   */
  async copyGameLink() {
    await this.actionPanel.getByRole("button", { name: "Copy Link" }).click();
    await this.actionPanel.getByRole("button", { name: "Copied!" }).waitFor();
    const url = await this.page.evaluate(() => navigator.clipboard.readText());
    return url;
  }

  /**
   * Sit at a specific seat
   * @param {number} seatIndex
   */
  async sit(seatIndex) {
    const seat = this.game.locator(`phg-seat:nth-child(${seatIndex + 1})`);
    await seat.getByRole("button", { name: "Sit" }).click();
    // Wait for seat to show as occupied (has current-player class)
    await this.mySeat.waitFor();
  }

  /**
   * Buy in with amount using slider
   * @param {number} amount
   */
  async buyIn(amount) {
    const slider = this.actionPanel.locator('input[type="range"]');
    await this.dragSliderToValue(slider, amount);
    await this.actionPanel.getByRole("button", { name: "Buy In" }).click();
    // Wait for stack to appear in our seat
    await this.mySeat.locator(".stack").waitFor();
  }

  /**
   * Click the start game button
   */
  async startGame() {
    await this.actionPanel.getByRole("button", { name: "Start Game" }).click();
  }

  /**
   * Wait for countdown to start (countdown element visible)
   * @param {number} [timeout=5000]
   */
  async waitForCountdownStart(timeout = 5000) {
    await this.board.locator(".countdown").waitFor({ timeout });
  }

  /**
   * Wait for hand to start by checking for preflop phase
   */
  async waitForHandStart() {
    await this.board
      .locator(".phase")
      .filter({ hasText: "preflop" })
      .waitFor({ timeout: 15000 });
  }

  /**
   * Check if it's this player's turn by looking for action buttons
   * @returns {Promise<boolean>}
   */
  async isMyTurn() {
    // If we can see action buttons (Check, Call, Fold, Bet, Raise, All-In), it's our turn
    const hasCheck = await this.actionPanel
      .getByRole("button", { name: "Check" })
      .isVisible()
      .catch(() => false);
    const hasCall = await this.actionPanel
      .getByRole("button", { name: /^Call/ })
      .isVisible()
      .catch(() => false);
    const hasFold = await this.actionPanel
      .getByRole("button", { name: "Fold" })
      .isVisible()
      .catch(() => false);
    return hasCheck || hasCall || hasFold;
  }

  /**
   * Wait for it to be this player's turn
   * @param {number} [timeout=15000]
   */
  async waitForTurn(timeout = 15000) {
    // Wait for any action button to appear
    await this.actionPanel
      .getByRole("button", { name: /(Check|Call|Fold)/ })
      .first()
      .waitFor({ timeout });
  }

  /**
   * Check if a specific action button is available
   * @param {string} actionName
   * @returns {Promise<boolean>}
   */
  async hasAction(actionName) {
    if (actionName === "call") {
      return await this.actionPanel
        .getByRole("button", { name: /^Call/ })
        .isVisible()
        .catch(() => false);
    }
    if (actionName === "raise") {
      return await this.actionPanel
        .getByRole("button", { name: /^Raise/ })
        .isVisible()
        .catch(() => false);
    }
    const buttonName = actionName.charAt(0).toUpperCase() + actionName.slice(1);
    return await this.actionPanel
      .getByRole("button", { name: buttonName })
      .isVisible()
      .catch(() => false);
  }

  /**
   * Drag a slider to a specific value using mouse
   * @param {import('@playwright/test').Locator} slider
   * @param {number} targetValue
   */
  async dragSliderToValue(slider, targetValue) {
    const box = await slider.boundingBox();
    if (!box) throw new Error("Slider not found");

    const { min, max } = await slider.evaluate((el) => ({
      min: parseFloat(el.min),
      max: parseFloat(el.max),
    }));

    const percentage = (targetValue - min) / (max - min);
    const targetX = box.x + box.width * percentage;
    const centerY = box.y + box.height / 2;

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
      const slider = this.actionPanel.locator('input[type="range"]');
      await this.dragSliderToMax(slider);
      await this.actionPanel.getByRole("button", { name: "All-In" }).click();
    } else if (action === "call") {
      await this.actionPanel.getByRole("button", { name: /^Call \$/ }).click();
    } else if (action === "check") {
      await this.actionPanel.getByRole("button", { name: "Check" }).click();
    } else if (action === "fold") {
      await this.actionPanel.getByRole("button", { name: "Fold" }).click();
    } else if (action === "bet") {
      const slider = this.actionPanel.locator('input[type="range"]');
      const box = await slider.boundingBox();
      if (box) {
        const targetX = box.x + box.width * 0.25;
        const centerY = box.y + box.height / 2;
        await slider.hover();
        await this.page.mouse.down();
        await this.page.mouse.move(targetX, centerY);
        await this.page.mouse.up();
      }
      await this.actionPanel.getByRole("button", { name: "Bet" }).click();
    } else if (action === "raise") {
      const slider = this.actionPanel.locator('input[type="range"]');
      const box = await slider.boundingBox();
      if (box) {
        const targetX = box.x + box.width * 0.25;
        const centerY = box.y + box.height / 2;
        await slider.hover();
        await this.page.mouse.down();
        await this.page.mouse.move(targetX, centerY);
        await this.page.mouse.up();
      }
      await this.actionPanel.getByRole("button", { name: /^Raise to/ }).click();
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    // Wait for state to propagate via WebSocket
    await this.page.waitForTimeout(200);
  }

  /**
   * Get current phase from the board UI
   * @returns {Promise<string>}
   */
  async getPhase() {
    const phaseText = await this.board.locator(".phase").textContent();
    return phaseText?.toLowerCase().trim() ?? "";
  }

  /**
   * Get the number of hole cards visible for this player
   * @returns {Promise<number>}
   */
  async getHoleCardCount() {
    // Count visible cards (not hidden, not placeholder) in our seat
    const cards = this.mySeat.locator(
      ".hole-cards phg-card:not(.hidden):not(.placeholder)",
    );
    return await cards.count();
  }

  /**
   * Get the number of community cards on the board
   * @returns {Promise<number>}
   */
  async getBoardCardCount() {
    const cards = this.board.locator(
      ".community-cards phg-card:not(.placeholder)",
    );
    return await cards.count();
  }

  /**
   * Get player's current stack from UI
   * @returns {Promise<number>}
   */
  async getStack() {
    const stackText = await this.mySeat.locator(".stack").textContent();
    // Parse "$1000" -> 1000
    const match = stackText?.match(/\$(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Wait for the phase to change to a specific value
   * @param {string} phase
   * @param {number} [timeout=15000]
   */
  async waitForPhase(phase, timeout = 15000) {
    await this.board
      .locator(".phase")
      .filter({ hasText: phase })
      .waitFor({ timeout });
  }

  /**
   * Wait for the hand to end (waiting phase or winner message)
   * @param {number} [timeout=15000]
   */
  async waitForHandEnd(timeout = 15000) {
    // Wait for either "Waiting" phase or winner message to appear
    await this.board
      .locator(".phase:has-text('Waiting'), .winner-message")
      .first()
      .waitFor({ timeout });
  }

  /**
   * Click the Sit Out button
   */
  async sitOut() {
    await this.actionPanel.getByRole("button", { name: "Sit Out" }).click();
    // Wait for SITTING OUT label to appear in our seat
    await this.mySeat
      .locator(".status-label")
      .filter({ hasText: "SITTING OUT" })
      .waitFor();
  }

  /**
   * Click the Sit In button
   */
  async sitIn() {
    await this.actionPanel.getByRole("button", { name: /^Sit In/ }).click();
    // Wait for SITTING OUT label to disappear
    await this.mySeat
      .locator(".status-label")
      .filter({ hasText: "SITTING OUT" })
      .waitFor({ state: "hidden" });
  }

  /**
   * Check if player is sitting out by looking for the status label
   * @returns {Promise<boolean>}
   */
  async isSittingOut() {
    return await this.mySeat
      .locator(".status-label")
      .filter({ hasText: "SITTING OUT" })
      .isVisible()
      .catch(() => false);
  }

  /**
   * Get current countdown value from UI
   * @returns {Promise<number|null>}
   */
  async getCountdown() {
    const countdownEl = this.board.locator(".countdown");
    if (await countdownEl.isVisible().catch(() => false)) {
      const text = await countdownEl.textContent();
      return text ? parseInt(text, 10) : null;
    }
    return null;
  }

  /**
   * Wait for countdown to be cancelled (countdown element hidden)
   */
  async waitForCountdownCancelled(timeout = 10000) {
    await this.board
      .locator(".countdown")
      .waitFor({ state: "hidden", timeout });
  }
}
