/**
 * Create a new game via API
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {{ small?: number, big?: number, type?: 'cash' | 'tournament' }} [options] - Optional config
 * @returns {Promise<string>} - Game ID
 */
export async function createGame(request, options) {
  const data = {};
  if (options?.small !== undefined) data.small = options.small;
  if (options?.big !== undefined) data.big = options.big;
  if (options?.type) data.type = options.type;

  const requestOptions = Object.keys(data).length > 0 ? { data } : undefined;
  const response = await request.post("/games", requestOptions);
  const { id } = await response.json();
  return id;
}

/**
 * Create a new game via UI stakes selector
 * @param {import('@playwright/test').Page} page
 * @param {number} stakesIndex - Index of stakes option to select (0-10)
 * @returns {Promise<string>} - Game ID from URL
 */
export async function createGameViaUI(page, stakesIndex) {
  await page.goto("/");
  await page.selectOption("select", String(stakesIndex));
  await page.click("text=Create Game");
  await page.waitForURL(/\/games\/[a-z0-9]+$/);
  const url = page.url();
  const match = url.match(/\/games\/([a-z0-9]+)$/);
  return match[1];
}

/**
 * Wait for a specific game phase using UI
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {string} phase
 * @param {number} [timeout=15000]
 */
export async function waitForPhase(player, phase, timeout = 15000) {
  await player.waitForPhase(phase, timeout);
}

/**
 * Play through a betting round with all players checking/calling
 * Uses UI-based turn detection with proper Playwright waits
 * @param {import('./poker-player.js').PokerPlayer[]} players
 */
export async function playBettingRound(players) {
  const startingPhase = await players[0].getPhase();

  for (let i = 0; i < 20; i++) {
    let acted = false;

    for (const player of players) {
      const currentPhase = await player.getPhase();
      if (currentPhase !== startingPhase) return;

      if (await player.isMyTurn()) {
        if (await player.hasAction("check")) {
          await player.act("check");
        } else if (await player.hasAction("call")) {
          await player.act("call");
        } else {
          continue;
        }
        // Wait for action to be processed: either buttons disappear
        // (turn passed to another player) or phase changes (round ended
        // and same player acts first on the next street)
        await Promise.any([
          player.actionPanel
            .getByRole("button", { name: /(Check|Call|Fold)/ })
            .first()
            .waitFor({ state: "hidden", timeout: 5000 }),
          player.board
            .locator(".phase")
            .filter({ hasNotText: startingPhase })
            .waitFor({ timeout: 5000 }),
        ]);
        acted = true;
        break;
      }
    }

    if (!acted) return;
  }
}

/**
 * Wait for hand to complete (return to waiting phase)
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {number} [timeout=15000]
 */
export async function waitForHandEnd(player, timeout = 15000) {
  await player.waitForHandEnd(timeout);
}
