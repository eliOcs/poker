/**
 * Represents a player in the e2e test
 * All interactions use visible UI elements only - no component internal access
 */
import { PokerPlayerActions } from "./poker-player-actions.js";

export class PokerPlayer extends PokerPlayerActions {
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
      .evaluate((el) => {
        /** @param {number|null|undefined} winnerIndex @param {any[]} seats */
        function resolveWinnerName(winnerIndex, seats) {
          if (winnerIndex == null) return null;
          const seat = seats[winnerIndex];
          if (!seat) return null;
          return seat.player && seat.player.name
            ? seat.player.name
            : `Seat ${winnerIndex + 1}`;
        }
        const g = el.game;
        if (!g) return null;
        const seats = g.seats || [];
        const tournament = g.tournament || null;
        const winnerName = resolveWinnerName(
          tournament ? tournament.winner : null,
          seats,
        );
        const mySeat = seats.find((s) => s && s.isCurrentPlayer) || null;
        return {
          tournamentWinner: winnerName,
          handNumber: g.handNumber !== undefined ? g.handNumber : null,
          bustedPosition:
            (mySeat && mySeat.bustedPosition != null
              ? mySeat.bustedPosition
              : el.tournamentFinishPosition) ?? null,
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
   * Click the history button to navigate to history page
   */
  async openHistory() {
    await this.openDrawer();
    await this.game.getByRole("button", { name: "History" }).click();
    await this.page.waitForURL(/\/(?:cash|sitngo)\/[a-z0-9]+\/history/);
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
    await this.page.locator("phg-history").waitFor();
  }

  /**
   * Get the history element locator
   */
  get history() {
    return this.page.locator("phg-history");
  }

  /**
   * Wait for history to finish loading (loading state is false)
   */
  async waitForHistoryLoaded() {
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
