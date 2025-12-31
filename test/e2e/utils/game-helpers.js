/**
 * Create a new game via API
 * @param {import('@playwright/test').APIRequestContext} request
 * @returns {Promise<string>} - Game ID
 */
export async function createGame(request) {
  const response = await request.post("/games");
  const { id } = await response.json();
  return id;
}

/**
 * Wait for a specific game phase
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {string} phase
 * @param {number} [timeout=15000]
 */
export async function waitForPhase(player, phase, timeout = 15000) {
  await player.page.waitForFunction(
    (p) => {
      const game = document.querySelector("phg-game");
      return game?.game?.hand?.phase === p;
    },
    phase,
    { timeout },
  );
}

/**
 * Play through a betting round with all players checking/calling
 * Stops when the phase changes or no one can act
 * @param {import('./poker-player.js').PokerPlayer[]} players
 */
export async function playBettingRound(players) {
  // Get starting phase to know when round is complete
  const initialState = await players[0].getGameState();
  const startingPhase = initialState?.hand?.phase;
  console.log(`Playing betting round: ${startingPhase}`);

  let iterations = 0;
  const maxIterations = 20; // Safety limit

  while (iterations < maxIterations) {
    iterations++;
    let actionTaken = false;

    for (const player of players) {
      // Wait a bit for state to propagate
      await player.page.waitForTimeout(300);

      const state = await player.getGameState();
      const currentPhase = state?.hand?.phase;

      // Phase changed - betting round is complete
      if (currentPhase !== startingPhase) {
        console.log(`Phase changed from ${startingPhase} to ${currentPhase}`);
        return;
      }

      const mySeat = state?.seats?.find((s) => s.isCurrentPlayer);
      console.log(
        `${player.name}: actingSeat=${state?.hand?.actingSeat}, myIsActing=${mySeat?.isActing}, phase=${currentPhase}`,
      );

      if (await player.isMyTurn()) {
        // Check what actions are available
        if (await player.hasAction("check")) {
          console.log(`${player.name} checking`);
          await player.act("check");
          actionTaken = true;
          // Wait for action to process
          await player.page.waitForTimeout(300);
          break; // Re-check who's acting
        } else if (await player.hasAction("call")) {
          console.log(`${player.name} calling`);
          await player.act("call");
          actionTaken = true;
          // Wait for action to process
          await player.page.waitForTimeout(300);
          break; // Re-check who's acting
        }
      }
    }

    // If no action was taken, the round is likely complete
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
  await waitForPhase(player, "waiting", timeout);
}
