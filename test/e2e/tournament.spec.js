/* eslint-disable playwright/no-conditional-in-test */
import { test, expect } from "./utils/fixtures.js";
import { createGame } from "./utils/game-helpers.js";
import * as fs from "node:fs";
import * as path from "node:path";

// Tournament E2E test - plays many hands with aggressive/passive mix strategy
test.setTimeout(420000); // 7 minutes for longer tournament

const ACTIONS_FILE = path.join(
  process.cwd(),
  "test/e2e/data/tournament-actions.json",
);

const WEIGHTED_ACTIONS = [
  { threshold: 0.005, action: "allIn" },
  { threshold: 0.1, action: "raise" },
  { threshold: 0.1, action: "bet" },
  { threshold: 0.4, action: "call" },
];

const PASSIVE_FALLBACKS = ["check", "fold"];

/**
 * Check all active players for a tournament winner
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @returns {Promise<string|null>} Winner name or null
 */
async function checkForWinner(players, activePlayers) {
  for (const idx of activePlayers) {
    try {
      if (await players[idx].hasTournamentWinner()) {
        for (const idx2 of activePlayers) {
          try {
            const name = await players[idx2].getTournamentWinnerName();
            if (name) return name;
          } catch {
            // Continue to next player
          }
        }
        return "unknown";
      }
    } catch {
      // Player page might be closed
    }
  }
  return null;
}

/**
 * Find the first active player whose page is still usable
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @returns {Promise<import('./utils/poker-player.js').PokerPlayer|null>}
 */
async function findActivePlayer(players, activePlayers) {
  for (const idx of activePlayers) {
    try {
      await players[idx].page.evaluate(() => true);
      return players[idx];
    } catch {
      activePlayers.delete(idx);
    }
  }
  return null;
}

/**
 * Get available actions for a player
 * @param {import('./utils/poker-player.js').PokerPlayer} player
 * @returns {Promise<string[]>}
 */
async function getAvailableActions(player) {
  const actions = [];
  if (await player.hasAction("check")) actions.push("check");
  if (await player.hasAction("call")) actions.push("call");
  if (await player.hasAction("fold")) actions.push("fold");
  if (await player.hasAction("bet")) actions.push("bet");
  if (await player.hasAction("raise")) actions.push("raise");
  if (await player.hasAction("allIn")) actions.push("allIn");
  return actions;
}

/**
 * Select an action using random weighted strategy
 * @param {string[]} availableActions
 * @returns {string}
 */
function selectRandomAction(availableActions) {
  const roll = Math.random();
  for (const { threshold, action } of WEIGHTED_ACTIONS) {
    if (roll < threshold && availableActions.includes(action)) return action;
  }
  const fallback = PASSIVE_FALLBACKS.find((a) => availableActions.includes(a));
  return fallback || availableActions[0];
}

/**
 * Try to take one action among active players
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @returns {Promise<{seatIdx: number, action: string}|null>}
 */
async function tryTakeAction(players, activePlayers) {
  for (const seatIdx of activePlayers) {
    try {
      const player = players[seatIdx];
      if (await player.isMyTurn().catch(() => false)) {
        const availableActions = await getAvailableActions(player);
        if (availableActions.length > 0) {
          const action = selectRandomAction(availableActions);
          await player.act(action);
          return { seatIdx, action };
        }
      }
    } catch {
      activePlayers.delete(seatIdx);
    }
  }
  return null;
}

/**
 * Wait for any active player to get their turn
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 */
async function waitForAnyTurn(players, activePlayers) {
  await Promise.any(
    [...activePlayers].map((idx) =>
      players[idx].actionPanel
        .getByRole("button", { name: /(Check|Call|Fold)/ })
        .first()
        .waitFor({ timeout: 2000 }),
    ),
  ).catch(() => {});
}

/**
 * Check for level changes and log them
 * @param {import('./utils/poker-player.js').PokerPlayer} player
 * @param {{maxLevelSeen: number}} state
 */
async function checkLevelChange(player, state) {
  const currentLevel = await player.getTournamentLevel().catch(() => null);
  if (currentLevel && currentLevel > state.maxLevelSeen) {
    state.maxLevelSeen = currentLevel;
    const blinds = await player.getBlinds();
    console.log(
      `Level change: now level ${currentLevel}, blinds $${blinds?.small}/$${blinds?.big}`,
    );
  }
}

/**
 * Track hand transitions via phase changes
 * @param {string} currentPhase
 * @param {{handCount: number, lastActionWasNonPreflop: boolean}} state
 */
function trackHandTransition(currentPhase, state) {
  if (currentPhase && currentPhase !== "preflop") {
    state.lastActionWasNonPreflop = true;
  }
  if (state.lastActionWasNonPreflop && currentPhase === "preflop") {
    state.handCount++;
    state.lastActionWasNonPreflop = false;
    if (state.handCount % 10 === 0) {
      console.log(`Completed ${state.handCount} hands...`);
    }
  }
}

/**
 * Save recorded actions to file
 * @param {Array} actions
 * @param {string} filePath
 */
function saveActionsFile(actions, filePath) {
  if (actions.length > 0) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(actions, null, 2));
    console.log(`Saved ${actions.length} actions to ${filePath}`);
  }
}

/**
 * Run the tournament game loop until a winner is found
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @param {{handCount: number, maxLevelSeen: number, lastActionWasNonPreflop: boolean}} state
 * @param {Array} newActions
 * @returns {Promise<string|null>} Winner name or null
 */
async function runTournamentLoop(players, activePlayers, state, newActions) {
  const maxActions = 8000;

  for (let actionCount = 0; actionCount < maxActions; actionCount++) {
    const winnerName = await checkForWinner(players, activePlayers);
    if (winnerName) return winnerName;

    const activePlayer = await findActivePlayer(players, activePlayers);
    if (!activePlayer) return null;

    await checkLevelChange(activePlayer, state);

    const onBreak = await activePlayer.isOnBreak().catch(() => false);
    if (onBreak) {
      console.log("Tournament on break - waiting...");
      await activePlayer.board
        .locator(".break-overlay")
        .waitFor({ state: "hidden", timeout: 30000 });
      continue;
    }

    const currentPhase = await activePlayer.getPhase().catch(() => "");
    trackHandTransition(currentPhase, state);

    const result = await tryTakeAction(players, activePlayers);
    if (result) {
      newActions.push({
        seat: result.seatIdx,
        action: result.action,
        hand: state.handCount,
      });
    } else {
      await waitForAnyTurn(players, activePlayers);
    }
  }

  return null;
}

test.describe("Tournament E2E", () => {
  test("6 players play at least 50 hands until one wins", async ({
    request,
    player1,
    player2,
    player3,
    player4,
    player5,
    player6,
  }) => {
    // Create tournament game
    const gameId = await createGame(request, { type: "tournament" });
    console.log("Tournament created:", gameId);

    const players = [player1, player2, player3, player4, player5, player6];

    // All players join the game
    await player1.joinGame(gameId);
    const gameUrl = await player1.copyGameLink();

    await Promise.all(players.slice(1).map((p) => p.joinGameByUrl(gameUrl)));

    // Each player sits at their seat (0-5)
    for (let i = 0; i < players.length; i++) {
      await players[i].sit(i);
    }
    console.log("All players seated");

    // Verify starting stack (5000 chips)
    const p1Stack = await player1.getStack();
    console.log(`Starting stack: $${p1Stack}`);
    expect(p1Stack).toBe(5000);

    // Verify initial tournament state
    const initialLevel = await player1.getTournamentLevel();
    const initialBlinds = await player1.getBlinds();
    console.log(
      `Initial level: ${initialLevel}, blinds: $${initialBlinds?.small}/$${initialBlinds?.big}`,
    );
    expect(initialLevel).toBe(1);
    expect(initialBlinds?.small).toBe(25);
    expect(initialBlinds?.big).toBe(50);

    // Start the tournament
    await player1.startGame();
    await player1.waitForHandStart();
    console.log("Tournament started");

    // Run tournament loop
    const state = {
      handCount: 1,
      maxLevelSeen: 1,
      lastActionWasNonPreflop: false,
    };
    const newActions = [];
    const activePlayers = new Set([0, 1, 2, 3, 4, 5]);

    const winnerName = await runTournamentLoop(
      players,
      activePlayers,
      state,
      newActions,
    );

    console.log(`Max level seen: ${state.maxLevelSeen}`);

    if (winnerName) {
      console.log(
        `Tournament Winner: ${winnerName} (after ${state.handCount} hands)`,
      );
      saveActionsFile(newActions, ACTIONS_FILE);
    }
    expect(winnerName).toBeTruthy();
  });
});
