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
 */
async function configureGameType(page, type, stakesIndex, buyInIndex) {
  if (type === "cash") {
    if (stakesIndex !== undefined) {
      await page.locator("select").first().selectOption(String(stakesIndex));
    }
    return;
  }

  await page.getByLabel(type === "sitngo" ? "Sit & Go" : "Tournament").click();
  if (buyInIndex !== undefined) {
    await page.locator("select").first().selectOption(String(buyInIndex));
  }
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
 * @param {{ type?: 'cash' | 'sitngo' | 'mtt' | 'tournament', stakesIndex?: number, buyInIndex?: number, tableSize?: number }} [options]
 * @returns {Promise<string>}
 */
export async function createGame(player, options = {}) {
  const { stakesIndex, buyInIndex, tableSize } = options;
  const type = normalizeGameType(options.type);
  const page = player.page;

  await page.goto("/");
  await configureGameType(page, type, stakesIndex, buyInIndex);

  if (tableSize !== undefined) {
    await page.locator("select").last().selectOption(String(tableSize));
  }

  await page
    .getByRole("button", { name: /^Create (?:Game|Tournament)$/ })
    .click();
  await page.waitForURL(getCreatedGameUrlPattern(type));
  await waitForCreatedGame(player, type);
  return page.url();
}
