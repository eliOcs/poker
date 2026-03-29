/**
 * Base class for PokerPlayer: constructor, locator getters, and basic navigation.
 */

const TURN_ACTION_BUTTON_NAME = /^(Check|Fold|Call\s+\$|Bet|Raise to|All-In)/;

export class PokerPlayerBase {
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
   * Get locator for real action buttons (excludes pre-action toggles)
   */
  get turnButtons() {
    return this.actionPanel
      .locator("phg-button:not([pre-action])")
      .getByRole("button", { name: TURN_ACTION_BUTTON_NAME });
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
}
