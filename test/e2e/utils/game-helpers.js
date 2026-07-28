const TOURNAMENT_SPEED_LABELS = {
  normal: "Normal",
  "semi-turbo": "Semi-Turbo",
  turbo: "Turbo",
};

/**
 * @param {'cash' | 'sitngo' | 'mtt' | 'tournament' | undefined} type
 * @returns {'cash' | 'sitngo' | 'mtt'}
 */
function normalizeGameType(type) {
  return type === "tournament" ? "mtt" : type || "cash";
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {'cash' | 'sitngo' | 'mtt'} type
 * @param {number|undefined} stakesIndex
 * @param {number|undefined} buyInIndex
 * @param {'normal' | 'semi-turbo' | 'turbo' | undefined} speed
 */
async function configureGameType(page, type, stakesIndex, buyInIndex, speed) {
  if (type === "mtt") {
    await page.goto("/mtt");
    await page.locator("phg-tournaments").waitFor();
    if (buyInIndex !== undefined) {
      await page.locator("select").first().selectOption(String(buyInIndex));
    }
    if (speed !== undefined) {
      await page
        .locator(".stakes-selector", { hasText: "Speed" })
        .locator("select")
        .selectOption({ label: TOURNAMENT_SPEED_LABELS[speed] });
    }
    return;
  }

  if (type === "cash") {
    if (stakesIndex !== undefined) {
      await page.locator("select").first().selectOption(String(stakesIndex));
    }
    return;
  }

  await page.getByLabel("Sit & Go").click();
  if (buyInIndex !== undefined) {
    await page.locator("select").first().selectOption(String(buyInIndex));
  }
  if (speed !== undefined) {
    await page
      .locator(".stakes-selector", { hasText: "Speed" })
      .locator("select")
      .selectOption({ label: TOURNAMENT_SPEED_LABELS[speed] });
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} tournamentName
 */
export async function renameTournamentInLobby(page, tournamentName) {
  const editLabel = page.locator("phg-edit-label").first();
  await editLabel
    .getByRole("button", { name: /Multi-Table Tournament/ })
    .click();
  await editLabel.getByRole("textbox", { name: "Label" }).fill(tournamentName);
  await editLabel.getByRole("button", { name: "Save label" }).click();
  await page.getByText(tournamentName).waitFor();
}

/**
 * @param {'cash' | 'sitngo' | 'mtt'} type
 * @returns {RegExp}
 */
function getCreatedGameUrlPattern(type) {
  if (type === "mtt") return /\/mtt\/[a-z0-9]+$/;
  if (type === "sitngo") return /\/sitngo\/[a-z0-9]+$/;
  return /\/cash\/[a-z0-9]+$/;
}

/**
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {'cash' | 'sitngo' | 'mtt'} type
 */
async function waitForCreatedGame(player, type) {
  if (type === "mtt") {
    await player.mttLobby.waitFor();
    return;
  }

  await player.game.waitFor();
  await player.board.waitFor();
}

/**
 * Create a new game via the UI home page
 * @param {import('./poker-player.js').PokerPlayer} player - Player who creates the game
 * @param {{ type?: 'cash' | 'sitngo' | 'mtt' | 'tournament', stakesIndex?: number, buyInIndex?: number, tableSize?: number, speed?: 'normal' | 'semi-turbo' | 'turbo' }} [options]
 * @returns {Promise<string>}
 */
export async function createGame(player, options = {}) {
  const { stakesIndex, buyInIndex, tableSize, speed } = options;
  const type = normalizeGameType(options.type);
  const page = player.page;

  if (type !== "mtt") {
    await page.goto("/");
    await page.locator("phg-home").waitFor();
  }
  await configureGameType(page, type, stakesIndex, buyInIndex, speed);

  if (tableSize !== undefined) {
    await page
      .locator(".stakes-selector", { hasText: "Table Size" })
      .locator("select")
      .selectOption(String(tableSize));
  }

  await page
    .getByRole("button", { name: /^Create (?:Game|Tournament)$/ })
    .click();
  await page.waitForURL(getCreatedGameUrlPattern(type));
  await waitForCreatedGame(player, type);
  if (type === "mtt" && speed !== undefined) {
    await player.mttLobby
      .getByText(TOURNAMENT_SPEED_LABELS[speed], { exact: true })
      .waitFor();
    const tournament = await player.getTournamentViewSnapshot();
    if (tournament?.speed !== speed) {
      throw new Error(`Expected ${speed} MTT, received ${tournament?.speed}`);
    }
  }
  return page.url();
}
