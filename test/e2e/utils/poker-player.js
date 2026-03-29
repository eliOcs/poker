/* eslint-disable max-lines */
/**
 * Represents a player in the e2e test
 * All interactions use visible UI elements only - no component internal access
 */

const TURN_ACTION_BUTTON_NAME = /^(Check|Fold|Call\s+\$|Bet|Raise to|All-In)/;

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
   * Close the player's page/context early. Safe to call more than once.
   */
  async close() {
    if (!this.page.isClosed()) {
      await this.page.close().catch(() => {});
    }
    await this.context.close().catch(() => {});
  }

  get game() {
    return this.page.locator("phg-game");
  }

  get mttLobby() {
    return this.page.locator("phg-mtt-lobby");
  }

  get mySeat() {
    return this.game.locator("phg-seat.current-player");
  }

  get board() {
    return this.game.locator("phg-board");
  }

  get actionPanel() {
    return this.game.locator("phg-action-panel");
  }

  /**
   * Whether the page considers its table connection live
   * @returns {Promise<boolean>}
   */
  async isConnected() {
    return await this.game
      .evaluate((el) => el.connectionStatus === "connected")
      .catch(() => false);
  }

  /**
   * Navigate to game page and wait for UI to load
   * @param {string} gameId
   * @param {"cash"|"sitngo"|"mtt"} [kind]
   * @param {string|null} [tournamentId]
   */
  async joinGame(gameId, kind = "cash", tournamentId = null) {
    const path =
      kind === "mtt"
        ? `/mtt/${tournamentId}/tables/${gameId}`
        : `/${kind}/${gameId}`;
    await this.page.goto(path);
    // Wait for the game element to be visible, then board inside it
    await this.game.waitFor();
    await this.board.waitFor();
  }

  /**
   * Navigate to game page using a URL and wait for UI to load
   * @param {string} url
   */
  async joinGameByUrl(url) {
    await this.page.goto(url);
    await this.game.waitFor();
    await this.board.waitFor();
  }

  /**
   * Navigate to an MTT lobby page and wait for it to load
   * @param {string} url
   */
  async joinTournamentLobbyByUrl(url) {
    await this.page.goto(url);
    await this.mttLobby.waitFor();
  }

  /**
   * Open the navigation drawer if it's not already open
   */
  async openDrawer() {
    const nav = this.game.locator("#drawer-nav");
    if (await nav.isVisible()) return;
    const toggle = this.game.locator("#drawer-toggle");
    if (!(await toggle.isVisible().catch(() => false))) {
      throw new Error("Drawer is closed but toggle is not visible");
    }
    await toggle.click();
    await nav.waitFor();
  }

  /**
   * Close the navigation drawer if it is open
   */
  async closeDrawer() {
    const nav = this.game.locator("#drawer-nav");
    if (!(await nav.isVisible().catch(() => false))) return;
    const toggle = this.game.locator("#drawer-toggle");
    if (!(await toggle.isVisible().catch(() => false))) return;
    await toggle.click();
    await nav.waitFor({ state: "hidden" });
  }

  /**
   * Copy the game link using the Copy Link button
   * @returns {Promise<string>} The copied URL
   */
  async copyGameLink() {
    await this.openDrawer();
    await this.game.getByRole("button", { name: "Copy Link" }).click();
    await this.game.getByRole("button", { name: "Copied!" }).waitFor();
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
   * Register from the MTT lobby
   */
  async registerForTournament() {
    await this.mttLobby.getByRole("button", { name: "Register" }).click();
    await this.mttLobby.getByRole("button", { name: "Unregister" }).waitFor();
  }

  /**
   * Start an MTT from the lobby
   */
  async startTournament() {
    await this.mttLobby
      .getByRole("button", { name: "Start Tournament" })
      .click();
  }

  /**
   * Wait until the app has navigated from the MTT lobby into a table
   */
  async waitForTournamentTable() {
    await this.page.waitForURL(/\/mtt\/[a-z0-9]+\/tables\/[a-z0-9]+$/);
    await this.game.waitFor();
    await this.board.waitFor();
  }

  /**
   * Wait for countdown to start (countdown element visible)
   */
  async waitForCountdownStart() {
    await this.board.locator(".countdown").waitFor();
  }

  /**
   * Wait for hand to start by checking for preflop phase
   */
  async waitForHandStart() {
    await this.board.locator(".phase").filter({ hasText: "preflop" }).waitFor();
  }

  /**
   * Get locator for real action buttons (excludes pre-action toggles)
   */
  get turnButtons() {
    return this.actionPanel
      .locator("phg-button:not([pre-action])")
      .getByRole("button", { name: TURN_ACTION_BUTTON_NAME });
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
    // Wait for actual betting buttons only; excludes pre-action toggles and "Call Clock".
    await this.turnButtons
      .first()
      .waitFor(timeout === undefined ? {} : { timeout });
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
      // All-In is available if there's a bet/raise slider (we can always go max)
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
    // Wait for either "Waiting" phase or winner message to appear
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
    // Wait for Sit In button to confirm sit-out took effect
    await this.actionPanel.getByRole("button", { name: /^Sit In/ }).waitFor();
  }

  /**
   * Click the Sit In button
   */
  async sitIn() {
    await this.actionPanel.getByRole("button", { name: /^Sit In/ }).click();
    // Wait for Sit In button to disappear
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

  /**
   * Open the game settings modal from the drawer
   */
  async openSettings() {
    await this.openDrawer();
    const settingsButton = this.game.getByRole("button", { name: "Settings" });
    await settingsButton.waitFor();
    await settingsButton.evaluate((button) => button.click());
    await this.game.locator("#name-input").waitFor();
  }

  /**
   * Save settings from the in-game settings modal
   * @param {{ name?: string, volumeLabel?: "Off" | "25%" | "75%" | "100%" }} [options]
   */
  async saveSettings(options = {}) {
    await this.openSettings();

    if (options.name !== undefined) {
      const input = this.game.locator("#name-input");
      await input.fill(options.name);
    }

    if (options.volumeLabel) {
      await this.game
        .locator(".volume-slider")
        .getByRole("button", {
          name: options.volumeLabel,
          exact: true,
        })
        .click();
    }

    await this.game.getByRole("button", { name: "Save" }).click();
    await this.game.locator("#name-input").waitFor({ state: "hidden" });
  }

  /**
   * Open the settings modal from the drawer, set the player name, and save
   * @param {string} name
   */
  async setName(name) {
    await this.saveSettings({ name });
  }

  /**
   * Open the profile sign-in modal from the drawer
   */
  async openSignIn() {
    await this.openDrawer();
    const signInButton = this.game.locator(".drawer-sign-in");
    await signInButton.waitFor();
    await signInButton.evaluate((button) => button.click());
    await this.game.locator("#sign-in-email").waitFor();
  }

  /**
   * Request an email sign-in link from the profile sign-in modal
   * @param {string} email
   */
  async requestSignIn(email) {
    await this.openSignIn();
    await this.game.locator("#sign-in-email").fill(email);
    await this.game.getByRole("button", { name: "Send sign-in link" }).click();
  }

  /**
   * Complete sign in by loading the captured email HTML and clicking the sign-in link
   * @param {string} emailHtml
   */
  async completeSignInFromEmail(emailHtml) {
    await this.page.setContent(emailHtml, { waitUntil: "domcontentloaded" });
    await this.page.getByRole("link", { name: "Sign in" }).click();
    await this.page.waitForURL(
      (url) => !url.pathname.startsWith("/auth/email-sign-in/callback"),
    );
  }

  /**
   * Click the history button to navigate to history page
   */
  async openHistory() {
    await this.openDrawer();
    await this.game.getByRole("button", { name: "History" }).click();
    // Wait for URL to change to history page
    await this.page.waitForURL(/\/(?:cash|sitngo)\/[a-z0-9]+\/history/);
    // Wait for history component to load
    await this.page.locator("phg-history").waitFor();
  }

  /**
   * Navigate to history page for a game via URL (for testing URL-based routing)
   * @param {string} gameId
   * @param {"cash"|"sitngo"|"mtt"} [kind]
   * @param {string|null} [tournamentId]
   */
  async goToHistory(gameId, kind = "cash", tournamentId = null) {
    const path =
      kind === "mtt"
        ? `/mtt/${tournamentId}/tables/${gameId}/history`
        : `/${kind}/${gameId}/history`;
    await this.page.goto(path);
    // Wait for history component to load
    await this.page.locator("phg-history").waitFor();
  }

  /**
   * Get the history element locator
   */
  get history() {
    return this.page.locator("phg-history");
  }

  /**
   * Read the tournament winner directly from the component data
   * @returns {Promise<string|null>} Winner name or null
   */
  async getTournamentWinner() {
    return await this.game
      .evaluate((el) => {
        const g = el.game;
        if (!g?.tournament) return null;
        const winner = g.tournament.winner;
        if (winner === null || winner === undefined) return null;
        const seat = g.seats?.[winner];
        return seat && !seat.empty
          ? seat.player?.name || `Seat ${winner + 1}`
          : `Seat ${winner + 1}`;
      })
      .catch(() => null);
  }

  /**
   * Read game snapshot for stress test: winner, hand number, and bust status
   * in a single evaluate call to minimize cross-browser round-trips
   * @returns {Promise<{tournamentWinner: string|null, handNumber: number|null, bustedPosition: number|null, connected: boolean}|null>}
   */
  async getGameSnapshot() {
    return await this.game
      // eslint-disable-next-line complexity
      .evaluate((el) => {
        const g = el.game;
        if (!g) return null;
        const t = g.tournament;
        const w = t ? t.winner : null;
        const winnerSeat = w != null && g.seats ? g.seats[w] : null;
        const winnerName = winnerSeat
          ? winnerSeat.player?.name || `Seat ${w + 1}`
          : null;
        const seats = g.seats || [];
        const mySeat = seats.find((s) => s && s.isCurrentPlayer);
        return {
          tournamentWinner: winnerName,
          handNumber: g.handNumber ?? null,
          bustedPosition:
            mySeat?.bustedPosition ?? el.tournamentFinishPosition ?? null,
          connected: el.connectionStatus === "connected",
        };
      })
      .catch(() => null);
  }

  /**
   * Wait for tournament winner overlay to appear
   */
  async waitForTournamentWinner() {
    await this.board.locator(".tournament-winner-overlay").waitFor();
  }

  /**
   * Check if player is eliminated from the tournament (seat has "busted" class)
   * @returns {Promise<boolean>}
   */
  async isEliminated() {
    return await this.game
      .evaluate(
        (el) =>
          el.tournamentFinishPosition != null ||
          !!el.shadowRoot
            ?.querySelector("phg-seat.current-player")
            ?.classList.contains("busted"),
      )
      .catch(() => false);
  }

  /**
   * Get the current tournament level from the UI
   * @returns {Promise<number|null>}
   */
  async getTournamentLevel() {
    const timerEl = this.game.locator("#info-bar .info-timer");
    if (await timerEl.isVisible().catch(() => false)) {
      const text = await timerEl.textContent();
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
    const blindsEl = this.game.locator("#info-bar .info-blinds");
    if (await blindsEl.isVisible().catch(() => false)) {
      const text = await blindsEl.textContent();
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
    return await this.game
      .evaluate((el) => el.game?.tournament?.onBreak === true)
      .catch(() => false);
  }

  /**
   * Wait for tournament break to start
   */
  async waitForBreak() {
    await this.board.locator(".break-overlay").waitFor();
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
   * Read the hand number directly from the component data
   * @returns {Promise<number|null>}
   */
  async getServerHandNumber() {
    return await this.game
      .evaluate((el) => el.game?.handNumber ?? null)
      .catch(() => null);
  }

  /**
   * Wait for history to finish loading (loading state is false)
   */
  async waitForHistoryLoaded() {
    // Wait for the hand list sidebar and table state to be visible
    await this.history.locator(".hand-list").waitFor();
    await this.history.locator(".table-state").waitFor();
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
