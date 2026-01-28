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
   * Buy in with amount (in big blinds)
   * @param {number} bbAmount - Number of big blinds to buy in with
   */
  async buyIn(bbAmount) {
    const slider = this.actionPanel.locator('input[type="range"]');
    // Set slider value directly via JavaScript for reliability
    await slider.evaluate((el, value) => {
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, bbAmount);
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
    return await this.actionPanel
      .getByRole("button", { name: /(Check|Call|Fold)/ })
      .first()
      .isVisible()
      .catch(() => false);
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
    if (actionName === "bet") {
      return await this.actionPanel
        .getByRole("button", { name: /^Bet/ })
        .isVisible()
        .catch(() => false);
    }
    if (actionName === "allIn") {
      // All-In is available if there's a bet/raise slider (we can always go max)
      const hasSlider = await this.actionPanel
        .locator('input[type="range"]')
        .isVisible()
        .catch(() => false);
      return hasSlider;
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
   * Move slider to minimum position (for min raise/bet)
   */
  async _moveSliderToMin() {
    const slider = this.actionPanel.locator('input[type="range"]');
    // Set slider to min value directly via JavaScript
    await slider.evaluate((el) => {
      el.value = el.min;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // Wait for Lit component to re-render with new slider value
    await this.actionPanel.evaluate((el) => el.updateComplete);
  }

  /**
   * Set slider to max value to enable All-In button
   */
  async _clickToAllIn() {
    const slider = this.actionPanel.locator('input[type="range"]');
    // Set slider to max value directly via JavaScript
    await slider.evaluate((el) => {
      el.value = el.max;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // Wait for Lit component to re-render with new slider value
    await this.actionPanel.evaluate((el) => el.updateComplete);
  }

  /**
   * Perform a betting action
   * @param {'check' | 'call' | 'fold' | 'bet' | 'raise' | 'allIn'} action
   */
  async act(action) {
    const handlers = {
      allIn: async () => {
        await this._clickToAllIn();
        await this.actionPanel.getByRole("button", { name: "All-In" }).click();
      },
      call: async () => {
        await this.actionPanel
          .getByRole("button", { name: /^Call \$/ })
          .click();
      },
      check: async () => {
        await this.actionPanel.getByRole("button", { name: "Check" }).click();
      },
      fold: async () => {
        await this.actionPanel.getByRole("button", { name: "Fold" }).click();
      },
      bet: async () => {
        await this._moveSliderToMin();
        await this.actionPanel.getByRole("button", { name: /^Bet/ }).click();
      },
      raise: async () => {
        await this._moveSliderToMin();
        await this.actionPanel
          .getByRole("button", { name: /^Raise to/ })
          .click();
      },
    };
    const handler = handlers[action];
    if (!handler) throw new Error(`Unknown action: ${action}`);
    await handler();
    // Brief wait for the click handler to dispatch the WebSocket message.
    // There is no observable UI state change between click and server processing.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(50);
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
   * Get the stakes displayed on the board
   * @returns {Promise<string>}
   */
  async getStakes() {
    const stakesText = await this.board.locator(".stakes").textContent();
    return stakesText?.trim() ?? "";
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
    // Parse "$5,000" or "$1000" -> 5000 or 1000
    const match = stackText?.match(/\$([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, ""), 10) : 0;
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

  /**
   * Click the history button to navigate to history page
   */
  async openHistory() {
    await this.game.locator("#history-btn").click();
    // Wait for URL to change to history page
    await this.page.waitForURL(/\/history\//, { timeout: 10000 });
    // Wait for history component to load
    await this.page.locator("phg-history").waitFor({ timeout: 10000 });
  }

  /**
   * Navigate to history page for a game via URL (for testing URL-based routing)
   * @param {string} gameId
   */
  async goToHistory(gameId) {
    await this.page.goto(`/history/${gameId}`);
    // Wait for history component to load
    await this.page.locator("phg-history").waitFor({ timeout: 10000 });
  }

  /**
   * Get the history element locator
   */
  get history() {
    return this.page.locator("phg-history");
  }

  /**
   * Check if tournament winner overlay is displayed
   * @returns {Promise<boolean>}
   */
  async hasTournamentWinner() {
    return await this.board
      .locator(".tournament-winner-overlay")
      .isVisible()
      .catch(() => false);
  }

  /**
   * Get the tournament winner name from the overlay
   * @returns {Promise<string|null>}
   */
  async getTournamentWinnerName() {
    const winnerEl = this.board.locator(".tournament-winner-name");
    if (await winnerEl.isVisible().catch(() => false)) {
      return await winnerEl.textContent();
    }
    return null;
  }

  /**
   * Wait for tournament winner overlay to appear
   * @param {number} [timeout=60000]
   */
  async waitForTournamentWinner(timeout = 60000) {
    await this.board.locator(".tournament-winner-overlay").waitFor({ timeout });
  }

  /**
   * Check if player is eliminated (has zero stack and not waiting for a hand)
   * @returns {Promise<boolean>}
   */
  async isEliminated() {
    const stack = await this.getStack();
    return stack === 0;
  }

  /**
   * Get the current tournament level from the UI
   * @returns {Promise<number|null>}
   */
  async getTournamentLevel() {
    const levelEl = this.board.locator(".tournament-level");
    if (await levelEl.isVisible().catch(() => false)) {
      const text = await levelEl.textContent();
      const match = text?.match(/Level (\d+)/);
      return match ? parseInt(match[1], 10) : null;
    }
    return null;
  }

  /**
   * Get the current blinds from the UI
   * @returns {Promise<{small: number, big: number}|null>}
   */
  async getBlinds() {
    const stakesEl = this.board.locator(".stakes");
    if (await stakesEl.isVisible().catch(() => false)) {
      const text = await stakesEl.textContent();
      // Parse "$25/$50" or "$1,000/$2,000" format (with optional decimals and commas)
      const match = text?.match(/\$([\d,]+(?:\.\d+)?)\/\$([\d,]+(?:\.\d+)?)/);
      if (match) {
        return {
          small: parseFloat(match[1].replace(/,/g, "")),
          big: parseFloat(match[2].replace(/,/g, "")),
        };
      }
    }
    return null;
  }

  /**
   * Check if tournament is on break
   * @returns {Promise<boolean>}
   */
  async isOnBreak() {
    // Break overlay has "BREAK" text
    return await this.board
      .locator(".break-overlay, :text('BREAK')")
      .isVisible()
      .catch(() => false);
  }

  /**
   * Wait for tournament break to start
   * @param {number} [timeout=120000]
   */
  async waitForBreak(timeout = 120000) {
    await this.board.locator(".break-overlay").waitFor({ timeout });
  }

  /**
   * Get hand number from the board UI (if displayed)
   * @returns {Promise<number|null>}
   */
  async getHandNumber() {
    const handEl = this.board.locator(".hand-number");
    if (await handEl.isVisible().catch(() => false)) {
      const text = await handEl.textContent();
      const match = text?.match(/Hand #?(\d+)/i);
      return match ? parseInt(match[1], 10) : null;
    }
    return null;
  }

  /**
   * Wait for history to finish loading (loading state is false)
   * @param {number} [timeout=10000]
   */
  async waitForHistoryLoaded(timeout = 10000) {
    // Wait for the hand list sidebar and table state to be visible
    await this.history.locator(".hand-list").waitFor({ timeout });
    await this.history.locator(".table-state").waitFor({ timeout });
  }

  /**
   * Get the number of hands in the history list
   * @returns {Promise<number>}
   */
  async getHistoryHandCount() {
    const items = this.history.locator(".hand-list .hand-item");
    return await items.count();
  }

  /**
   * Get the number of board cards shown in history
   * @returns {Promise<number>}
   */
  async getHistoryBoardCardCount() {
    const cards = this.history.locator(
      ".table-state phg-board .community-cards phg-card",
    );
    return await cards.count();
  }

  /**
   * Get the number of players shown in history table state
   * @returns {Promise<number>}
   */
  async getHistoryPlayerCount() {
    const seats = this.history.locator(".table-state phg-seat:not(.empty)");
    return await seats.count();
  }
}
