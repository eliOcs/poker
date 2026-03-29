import { PokerPlayerBase } from "./poker-player-base.js";

/**
 * Adds game actions to PokerPlayer: seating, betting, and social actions.
 */
export class PokerPlayerActions extends PokerPlayerBase {
  /**
   * Sit at a specific seat
   * @param {number} seatIndex
   */
  async sit(seatIndex) {
    const seat = this.game.locator(`phg-seat:nth-child(${seatIndex + 1})`);
    await seat.getByRole("button", { name: "Sit" }).click();
    await this.mySeat.waitFor();
  }

  /**
   * Sit using the waiting-panel "sit anywhere" button
   */
  async sitAnywhere() {
    await this.actionPanel
      .getByRole("button", { name: /^Sit(?:\s+\$.*)?$/ })
      .click();
    await this.mySeat.waitFor();
  }

  /**
   * Buy in with amount (in big blinds)
   * @param {number} bbAmount - Number of big blinds to buy in with
   */
  async buyIn(bbAmount) {
    const slider = this.actionPanel.locator('input[type="range"]');
    await slider.evaluate((el, value) => {
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, bbAmount);
    await this.actionPanel.getByRole("button", { name: "Buy In" }).click();
    await this.mySeat.locator(".stack").waitFor();
  }

  /**
   * Click the start game button
   */
  async startGame() {
    await this.actionPanel.getByRole("button", { name: "Start Game" }).click();
  }

  /**
   * Check if a specific action button is available
   * @param {string} actionName
   * @returns {Promise<boolean>}
   */
  async hasAction(actionName) {
    if (!(await this.isConnected())) return false;
    if (actionName === "call") {
      return await this.actionPanel
        .getByRole("button", { name: /^Call\s+\$/ })
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
      const hasSlider = await this.actionPanel
        .locator('input[type="range"]')
        .isVisible()
        .catch(() => false);
      return hasSlider;
    }
    if (actionName === "callClock") {
      return await this.actionPanel
        .getByRole("button", { name: "Call the clock" })
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
   * Check if it's this player's turn by looking for action buttons
   * @returns {Promise<boolean>}
   */
  async isMyTurn() {
    if (!(await this.isConnected())) return false;
    return await this.turnButtons
      .first()
      .isVisible()
      .catch(() => false);
  }

  /**
   * Wait for it to be this player's turn
   */
  async waitForTurn(timeout = undefined) {
    await this.turnButtons
      .first()
      .waitFor(timeout === undefined ? {} : { timeout });
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
    await slider.evaluate((el) => {
      el.value = el.min;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await this.actionPanel.evaluate((el) => el.updateComplete);
  }

  /**
   * Set slider to max value to enable All-In button
   */
  async _clickToAllIn() {
    const slider = this.actionPanel.locator('input[type="range"]');
    await slider.evaluate((el) => {
      el.value = el.max;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
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
    await handler();
  }

  /**
   * Select a bet preset then click the bet/raise button
   * @param {'bet' | 'raise'} action
   * @param {string} preset - Preset label (e.g. "Min", "½ Pot", "Pot", "3 BB", "Max")
   */
  async actWithPreset(action, preset) {
    await this.actionPanel
      .locator(".bet-presets")
      .getByRole("button", { name: preset, exact: true })
      .click();
    const name = action === "bet" ? /^Bet/ : /^Raise to/;
    await this.actionPanel.getByRole("button", { name }).click();
  }

  /**
   * Type a dollar amount into the number input then click the bet/raise button
   * @param {'bet' | 'raise'} action
   * @param {number} dollars - Amount in dollars (e.g. 1.50)
   */
  async actWithAmount(action, dollars) {
    const input = this.actionPanel.locator(
      'phg-currency-slider input[type="number"]',
    );
    await input.fill(String(dollars));
    const name = action === "bet" ? /^Bet/ : /^Raise to/;
    await this.actionPanel.getByRole("button", { name }).click();
  }

  /**
   * Send an emote via the emote picker modal
   * @param {string} emoji - The emoji to send
   */
  async emote(emoji) {
    await this.actionPanel.getByRole("button", { name: "Emote" }).click();
    await this.game.locator(".emote-grid").waitFor();
    await this.game
      .locator(".emote-grid button", {
        hasText: emoji,
      })
      .click();
  }

  /**
   * Send a chat message via the chat modal
   * @param {string} message - The message to send
   */
  async chat(message) {
    await this.actionPanel.getByRole("button", { name: "Chat" }).click();
    const input = this.game.locator("#chat-input");
    await input.waitFor();
    await input.fill(message);
    await this.game.getByRole("button", { name: "Send" }).click();
  }

  /**
   * Click the "Call the clock" button
   */
  async callClock() {
    await this.actionPanel
      .getByRole("button", { name: "Call the clock" })
      .click();
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
    const stakesText = await this.game
      .locator("#info-bar .info-blinds")
      .textContent();
    return stakesText?.trim() ?? "";
  }

  /**
   * Get the number of hole cards visible for this player
   * @returns {Promise<number>}
   */
  async getHoleCardCount() {
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
   * Get player's current stack display text from UI
   * @returns {Promise<string>} e.g. "$5,000", "$2.90", "$0"
   */
  async getStack() {
    const stackText = await this.mySeat.locator(".stack").textContent();
    return stackText?.trim() ?? "";
  }

  /**
   * Wait for the phase to change to a specific value
   * @param {string} phase
   */
  async waitForPhase(phase) {
    await this.board
      .locator(".phase")
      .filter({ hasText: new RegExp(`^${phase}$`, "i") })
      .waitFor();
  }

  /**
   * Wait for the hand to end (waiting phase or winner message)
   */
  async waitForHandEnd() {
    await this.board
      .locator(".phase:has-text('Waiting'), .winner-message")
      .first()
      .waitFor();
  }

  /**
   * Click the Sit Out button in the drawer
   */
  async sitOut() {
    await this.openDrawer();
    await this.game.getByRole("button", { name: "Sit Out" }).click();
    await this.actionPanel.getByRole("button", { name: /^Sit In/ }).waitFor();
  }

  /**
   * Click the Sit In button
   */
  async sitIn() {
    await this.actionPanel.getByRole("button", { name: /^Sit In/ }).click();
    await this.actionPanel
      .getByRole("button", { name: /^Sit In/ })
      .waitFor({ state: "hidden" });
  }

  /**
   * Check if player is sitting out by looking for the Sit In button
   * @returns {Promise<boolean>}
   */
  async isSittingOut() {
    return await this.actionPanel
      .getByRole("button", { name: /^Sit In/ })
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
  async waitForCountdownCancelled() {
    await this.board.locator(".countdown").waitFor({ state: "hidden" });
  }
}
