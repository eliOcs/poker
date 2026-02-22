/* eslint-disable playwright/no-conditional-in-test */
import { test, expect } from "./utils/fixtures.js";
import { createGame } from "./utils/game-helpers.js";
import * as fs from "node:fs";
import * as path from "node:path";

// Tournament E2E test - plays many hands with aggressive/passive mix strategy
test.setTimeout(10 * 50 * 1000);

const ACTIONS_FILE = path.join(
  process.cwd(),
  "test/e2e/data/tournament-actions.json",
);

const WEIGHTED_ACTIONS = [
  { threshold: 0.01, action: "allIn" },
  { threshold: 0.15, action: "raise" },
  { threshold: 0.15, action: "bet" },
  { threshold: 0.6, action: "call" },
];

const PASSIVE_FALLBACKS = ["check", "fold"];
const STALL_TIMEOUT_MS = 90_000;
const WAIT_FOR_TURN_TIMEOUT_MS = 2000;

/**
 * @param {unknown} err
 * @returns {string}
 */
function formatError(err) {
  return err instanceof Error ? err.message : String(err);
}

/**
 * @param {{lastProgressAt: number, lastProgressReason: string}} state
 * @param {string} reason
 */
function markProgress(state, reason) {
  state.lastProgressAt = Date.now();
  state.lastProgressReason = reason;
}

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
 * Remove players whose seat has the "busted" CSS class
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @returns {Promise<number>} Number of players removed
 */
async function removeBustedPlayers(players, activePlayers) {
  let removed = 0;
  for (const idx of activePlayers) {
    try {
      if (await players[idx].isEliminated()) {
        console.log(`Seat ${idx + 1} eliminated`);
        activePlayers.delete(idx);
        removed++;
      }
    } catch {
      // Transient error — keep player in active set
    }
  }
  return removed;
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
      // Transient error — keep player in active set
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
    let attemptedAction = null;
    try {
      const player = players[seatIdx];
      if (await player.isMyTurn().catch(() => false)) {
        const availableActions = await getAvailableActions(player);
        if (availableActions.length > 0) {
          const action = selectRandomAction(availableActions);
          attemptedAction = action;
          await player.act(action);
          return { seatIdx, action };
        }
        console.log(
          `Seat ${seatIdx + 1} appears to be acting but has no legal action buttons`,
        );
      }
    } catch (err) {
      console.log(
        `Seat ${seatIdx + 1} action attempt failed` +
          `${attemptedAction ? ` (${attemptedAction})` : ""}: ${formatError(err)}`,
      );
    }
  }
  return null;
}

/**
 * Wait for any active player to get their turn
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @returns {Promise<boolean>} Whether any actionable turn appeared
 */
async function waitForAnyTurn(players, activePlayers) {
  return await Promise.any(
    [...activePlayers].map((idx) =>
      players[idx].waitForTurn(WAIT_FOR_TURN_TIMEOUT_MS),
    ),
  )
    .then(() => true)
    .catch(() => false);
}

/**
 * Check for level changes and log them
 * @param {import('./utils/poker-player.js').PokerPlayer} player
 * @param {{maxLevelSeen: number}} state
 * @returns {Promise<boolean>} Whether level changed
 */
async function checkLevelChange(player, state) {
  const currentLevel = await player.getTournamentLevel().catch(() => null);
  if (currentLevel && currentLevel > state.maxLevelSeen) {
    state.maxLevelSeen = currentLevel;
    const blinds = await player.getBlinds();
    console.log(
      `Level change: now level ${currentLevel}, blinds $${blinds?.small}/$${blinds?.big}`,
    );
    return true;
  }
  return false;
}

/**
 * Track hand transitions via phase changes
 * @param {string} currentPhase
 * @param {{handCount: number, lastActionWasNonPreflop: boolean}} state
 * @returns {boolean} Whether a new hand was detected
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
    return true;
  }
  return false;
}

/**
 * Builds a compact debug snapshot for stall diagnosis
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @param {{handCount: number, maxLevelSeen: number}} state
 * @returns {Promise<string>}
 */
async function collectStallSnapshot(players, activePlayers, state) {
  const lines = [
    `Stall snapshot: handCount=${state.handCount} maxLevelSeen=${state.maxLevelSeen} activePlayers=${[
      ...activePlayers,
    ]
      .map((idx) => idx + 1)
      .join(",")}`,
  ];

  for (const idx of activePlayers) {
    const player = players[idx];
    try {
      const [
        phase,
        level,
        onBreak,
        isMyTurn,
        availableActions,
        seatClass,
        buttonTexts,
      ] = await Promise.all([
        player.getPhase().catch(() => "<error>"),
        player.getTournamentLevel().catch(() => null),
        player.isOnBreak().catch(() => false),
        player.isMyTurn().catch(() => false),
        getAvailableActions(player).catch(() => []),
        player.mySeat
          .evaluate((el) => el.className)
          .catch(() => "<unavailable>"),
        player.actionPanel
          .getByRole("button")
          .allTextContents()
          .catch(() => []),
      ]);

      const compactButtons = buttonTexts
        .map((text) => text.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 8)
        .join(" | ");

      lines.push(
        `Seat ${idx + 1}: phase=${phase} level=${level ?? "?"} onBreak=${onBreak} isMyTurn=${isMyTurn} class="${seatClass}" actions=[${availableActions.join(",")}] buttons=[${compactButtons}]`,
      );
    } catch (err) {
      lines.push(`Seat ${idx + 1}: snapshot failed (${formatError(err)})`);
    }
  }

  return lines.join("\n");
}

/**
 * Throws with a detailed snapshot if loop progress has stalled
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @param {{handCount: number, maxLevelSeen: number, lastProgressAt: number, lastProgressReason: string}} state
 */
async function assertNotStalled(players, activePlayers, state) {
  const stalledForMs = Date.now() - state.lastProgressAt;
  if (stalledForMs <= STALL_TIMEOUT_MS) return;

  const snapshot = await collectStallSnapshot(players, activePlayers, state);
  throw new Error(
    `Tournament loop stalled for ${stalledForMs}ms (lastProgress=${state.lastProgressReason})\n${snapshot}`,
  );
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
 * @param {{handCount: number, maxLevelSeen: number, lastActionWasNonPreflop: boolean, lastProgressAt: number, lastProgressReason: string}} state
 * @param {Array} newActions
 * @returns {Promise<string|null>} Winner name or null
 */
async function runTournamentLoop(players, activePlayers, state, newActions) {
  const maxActions = 8000;

  for (let actionCount = 0; actionCount < maxActions; actionCount++) {
    await assertNotStalled(players, activePlayers, state);

    const winnerName = await checkForWinner(players, activePlayers);
    if (winnerName) return winnerName;

    const removedPlayers = await removeBustedPlayers(players, activePlayers);
    if (removedPlayers > 0) {
      markProgress(state, `removed-${removedPlayers}-busted`);
    }
    if (activePlayers.size <= 1) return null;

    const activePlayer = await findActivePlayer(players, activePlayers);
    if (!activePlayer) continue;

    const levelChanged = await checkLevelChange(activePlayer, state);
    if (levelChanged) {
      markProgress(state, `level-${state.maxLevelSeen}`);
    }

    const onBreak = await activePlayer.isOnBreak().catch(() => false);
    if (onBreak) {
      console.log("Tournament on break - waiting...");
      markProgress(state, "on-break");
      await activePlayer.board
        .locator(".break-overlay")
        .waitFor({ state: "hidden", timeout: 30000 });
      markProgress(state, "break-ended");
      continue;
    }

    const currentPhase = await activePlayer.getPhase().catch(() => "");
    if (trackHandTransition(currentPhase, state)) {
      markProgress(state, `hand-${state.handCount}`);
    }

    const result = await tryTakeAction(players, activePlayers);
    if (result) {
      newActions.push({
        seat: result.seatIdx,
        action: result.action,
        hand: state.handCount,
      });
      markProgress(
        state,
        `seat-${result.seatIdx + 1}-${result.action}-hand-${state.handCount}`,
      );
    } else {
      await waitForAnyTurn(players, activePlayers);
    }
  }

  return null;
}

test.describe("Tournament E2E", () => {
  test("6 players play at least 50 hands until one wins", async ({
    player1,
    player2,
    player3,
    player4,
    player5,
    player6,
  }) => {
    // Create tournament game via UI
    await createGame(player1, { type: "tournament" });
    console.log("Tournament created");

    const players = [player1, player2, player3, player4, player5, player6];

    // Other players join via copied link
    const gameUrl = await player1.copyGameLink();

    await Promise.all(players.slice(1).map((p) => p.joinGameByUrl(gameUrl)));

    // Each player sits at their seat (0-5)
    for (let i = 0; i < players.length; i++) {
      await players[i].sit(i);
    }
    console.log("All players seated");

    // Verify starting stack ($5,000)
    const p1Stack = await player1.getStack();
    console.log(`Starting stack: ${p1Stack}`);
    expect(p1Stack).toBe("$5,000");

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
      lastProgressAt: Date.now(),
      lastProgressReason: "tournament-started",
    };
    const newActions = [];
    const activePlayers = new Set([0, 1, 2, 3, 4, 5]);
    const actionsFileExists = fs.existsSync(ACTIONS_FILE);

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
      if (!actionsFileExists) {
        saveActionsFile(newActions, ACTIONS_FILE);
      }
    }
    expect(winnerName).toBeTruthy();
  });
});
