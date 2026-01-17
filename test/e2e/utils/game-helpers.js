/**
 * Create a new game via API
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {{ small?: number, big?: number }} [stakes] - Optional stakes
 * @returns {Promise<string>} - Game ID
 */
export async function createGame(request, stakes) {
  const options = stakes
    ? { data: { small: stakes.small, big: stakes.big } }
    : undefined;
  const response = await request.post("/games", options);
  const { id } = await response.json();
  return id;
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
 * Uses UI-based turn detection
 * @param {import('./poker-player.js').PokerPlayer[]} players
 */
export async function playBettingRound(players) {
  const startingPhase = await players[0].getPhase();
  console.log(`Playing betting round: ${startingPhase}`);

  let iterations = 0;
  const maxIterations = 20;

  while (iterations < maxIterations) {
    iterations++;
    let actionTaken = false;

    for (const player of players) {
      await player.page.waitForTimeout(300);

      const currentPhase = await player.getPhase();
      if (currentPhase !== startingPhase) {
        console.log(`Phase changed from ${startingPhase} to ${currentPhase}`);
        return;
      }

      if (await player.isMyTurn()) {
        if (await player.hasAction("check")) {
          console.log(`${player.name} checking`);
          await player.act("check");
          actionTaken = true;
          await player.page.waitForTimeout(300);
          break;
        } else if (await player.hasAction("call")) {
          console.log(`${player.name} calling`);
          await player.act("call");
          actionTaken = true;
          await player.page.waitForTimeout(300);
          break;
        }
      }
    }

    if (!actionTaken) {
      console.log("No action taken, round complete");
      break;
    }
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
