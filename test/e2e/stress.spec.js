/* eslint-disable playwright/no-conditional-in-test */
import { test, expect } from "./utils/fixtures.js";
import { createGame } from "./utils/game-helpers.js";

// Tournament E2E test - plays many hands with aggressive/passive mix strategy
test.setTimeout(15 * 60 * 1000);

const WEIGHTED_ACTIONS = [
  { threshold: 0.01, action: "allIn" },
  { threshold: 0.15, action: "raise" },
  { threshold: 0.15, action: "bet" },
  { threshold: 0.6, action: "call" },
];

const PASSIVE_FALLBACKS = ["check", "fold"];
const STALL_TIMEOUT_MS = 15000;
const WAIT_FOR_TURN_TIMEOUT_MS = 2000;
const USER_CREATION_BATCH_LIMIT = 8;
const USER_CREATION_WINDOW_BUFFER_MS = 6500;

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
 * Run async player setup one player at a time to avoid tripping the shared
 * pre-cookie HTTP rate limiter during initial page/bootstrap requests.
 * @template T
 * @param {T[]} items
 * @param {(item: T, index: number) => Promise<void>} task
 */
async function runSequentially(items, task) {
  for (let index = 0; index < items.length; index += 1) {
    await task(items[index], index);
  }
}

/**
 * @param {number} ms
 */
async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Pre-create guest sessions on the home route so later tournament-lobby
 * navigations reuse an existing player cookie instead of hitting the shared
 * pre-cookie IP limiter.
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 */
async function initializeGuestSessions(players) {
  await runSequentially(players, async (player, index) => {
    if (index === USER_CREATION_BATCH_LIMIT) {
      await delay(USER_CREATION_WINDOW_BUFFER_MS);
    }
    await player.page.goto("/");
    await player.page.locator("phg-home").waitFor();
  });
}

/**
 * @typedef {Object} SnapshotResult
 * @property {string|null} winnerName - Tournament winner name if detected
 * @property {number} removedCount - Number of busted players removed
 * @property {number|null} maxHandNumber - Highest hand number seen across players
 */

/**
 * Single pass over active players: check winner, remove busted, track hand number.
 * Uses one evaluate call per player instead of separate loops.
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @returns {Promise<SnapshotResult>}
 */
async function collectGameSnapshots(players, activePlayers) {
  let winnerName = null;
  let removedCount = 0;
  let maxHandNumber = null;

  const snapshotEntries = await Promise.all(
    [...activePlayers].map(async (idx) => ({
      idx,
      snapshot: await players[idx].getGameSnapshot(),
    })),
  );

  for (const { idx, snapshot } of snapshotEntries) {
    if (!snapshot) continue;

    if (snapshot.tournamentWinner) {
      winnerName = snapshot.tournamentWinner;
    }
    if (snapshot.bustedPosition != null) {
      console.log(`Seat ${idx + 1} eliminated`);
      activePlayers.delete(idx);
      removedCount++;
    }
    if (snapshot.handNumber != null) {
      maxHandNumber =
        maxHandNumber == null
          ? snapshot.handNumber
          : Math.max(maxHandNumber, snapshot.handNumber);
    }
  }

  return { winnerName, removedCount, maxHandNumber };
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
  if (await player.hasAction("callClock")) actions.push("callClock");
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
  const seatOrder = [...activePlayers];
  const turnStates = await Promise.all(
    seatOrder.map(async (seatIdx) => ({
      seatIdx,
      isMyTurn: await players[seatIdx].isMyTurn().catch(() => false),
    })),
  );

  for (const { seatIdx, isMyTurn } of turnStates) {
    let attemptedAction = null;
    try {
      const player = players[seatIdx];
      if (isMyTurn) {
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
 * Use the same disconnect recovery path as live play: if a player has stopped
 * acting and the UI exposes "Call the clock", trigger it from any active seat.
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @returns {Promise<{seatIdx: number, action: "callClock"}|null>}
 */
async function tryCallClock(players, activePlayers) {
  const seatOrder = [...activePlayers];
  const callableSeats = await Promise.all(
    seatOrder.map(async (seatIdx) => ({
      seatIdx,
      canCallClock: await players[seatIdx]
        .hasAction("callClock")
        .catch(() => false),
    })),
  );

  for (const { seatIdx, canCallClock } of callableSeats) {
    try {
      const player = players[seatIdx];
      if (canCallClock) {
        await player.callClock();
        return { seatIdx, action: "callClock" };
      }
    } catch (err) {
      console.log(
        `Seat ${seatIdx + 1} call clock attempt failed: ${formatError(err)}`,
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
  const deadline = Date.now() + WAIT_FOR_TURN_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const turnStates = await Promise.all(
      [...activePlayers].map((idx) =>
        players[idx].isMyTurn().catch(() => false),
      ),
    );
    if (turnStates.some(Boolean)) {
      return true;
    }
    await delay(100);
  }

  return false;
}

/**
 * Track hand transitions via server hand number
 * @param {number|null} serverHandNumber
 * @param {{handCount: number}} state
 * @returns {boolean} Whether a new hand was detected
 */
function trackHandTransition(serverHandNumber, state) {
  if (serverHandNumber === null || serverHandNumber <= state.handCount)
    return false;
  const previous = state.handCount;
  state.handCount = serverHandNumber;
  if (state.handCount >= previous + 10 || state.handCount % 10 === 0) {
    console.log(`Completed ${state.handCount} hands...`);
  }
  return true;
}

/**
 * Builds a compact debug snapshot for stall diagnosis
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @param {{handCount: number}} state
 * @returns {Promise<string>}
 */
async function collectStallSnapshot(players, activePlayers, state) {
  const lines = [
    `Stall snapshot: handCount=${state.handCount} activePlayers=${[
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
        serverState,
        path,
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
        player.game
          .evaluate((el) => {
            const g = el.game;
            return {
              handNumber: g?.handNumber,
              phase: g?.hand?.phase,
              actingSeat: g?.hand?.actingSeat,
              tournamentWinner: g?.tournament?.winner ?? null,
            };
          })
          .catch(() => null),
        player.page
          .evaluate(() => window.location.pathname)
          .catch(() => "<error>"),
      ]);

      const compactButtons = buttonTexts
        .map((text) => text.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 8)
        .join(" | ");

      const serverStr = serverState
        ? `server={hand:${serverState.handNumber},phase:${serverState.phase},acting:${serverState.actingSeat},winner:${serverState.tournamentWinner}}`
        : "server=<error>";

      lines.push(
        `Seat ${idx + 1}: path=${path} phase=${phase} level=${level ?? "?"} onBreak=${onBreak} isMyTurn=${isMyTurn} class="${seatClass}" ${serverStr} actions=[${availableActions.join(",")}] buttons=[${compactButtons}]`,
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
 * @param {{handCount: number, lastProgressAt: number, lastProgressReason: string}} state
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
 * Run the tournament game loop until a winner is found
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @param {{handCount: number, lastProgressAt: number, lastProgressReason: string}} state
 * @returns {Promise<string|null>} Winner name or null
 */
async function runTournamentLoop(players, activePlayers, state) {
  const maxActions = 16000;

  for (let actionCount = 0; actionCount < maxActions; actionCount++) {
    await assertNotStalled(players, activePlayers, state);

    // Single pass: winner check + bust detection + hand number tracking
    const snapshots = await collectGameSnapshots(players, activePlayers);
    if (snapshots.winnerName) return snapshots.winnerName;
    if (snapshots.removedCount > 0) {
      markProgress(state, `removed-${snapshots.removedCount}-busted`);
    }
    if (activePlayers.size <= 1) return null;
    if (trackHandTransition(snapshots.maxHandNumber, state)) {
      markProgress(state, `hand-${state.handCount}`);
    }

    const result = await tryTakeAction(players, activePlayers);
    if (result) {
      markProgress(
        state,
        `seat-${result.seatIdx + 1}-${result.action}-hand-${state.handCount}`,
      );
    } else {
      const clockResult = await tryCallClock(players, activePlayers);
      if (clockResult) {
        markProgress(
          state,
          `seat-${clockResult.seatIdx + 1}-callClock-hand-${state.handCount}`,
        );
      } else {
        await waitForAnyTurn(players, activePlayers);
      }
    }
  }

  return null;
}

test.describe("Tournament E2E", () => {
  test("11 players finish a 6-max MTT from multiple tables", async ({
    player1,
    player2,
    player3,
    player4,
    player5,
    player6,
    player7,
    player8,
    player9,
    player10,
    player11,
  }) => {
    const players = [
      player1,
      player2,
      player3,
      player4,
      player5,
      player6,
      player7,
      player8,
      player9,
      player10,
      player11,
    ];

    const tournamentUrl = await createGame(player1, {
      type: "mtt",
      tableSize: 6,
    });
    console.log(`Tournament created at ${tournamentUrl}`);

    const joiningPlayers = players.slice(1);
    await initializeGuestSessions(joiningPlayers);
    console.log("All guest sessions initialized");

    await runSequentially(joiningPlayers, async (player) => {
      await player.joinTournamentLobbyByUrl(tournamentUrl);
    });
    console.log("All players reached the MTT lobby");

    await runSequentially(players.slice(1), async (player) => {
      await player.registerForTournament();
    });
    console.log("All lobby registrations completed");

    await player1.startTournament();
    await Promise.all(players.map((player) => player.waitForTournamentTable()));
    console.log("Tournament started and all players reached a table");

    const initialTableIds = new Set(
      players
        .map(
          (player) =>
            player.page
              .url()
              .match(/\/mtt\/[a-z0-9]+\/tables\/([a-z0-9]+)$/)?.[1],
        )
        .filter(Boolean),
    );
    console.log(
      `Initial tables: ${[...initialTableIds]
        .map((tableId) => tableId)
        .join(", ")}`,
    );
    expect(initialTableIds.size).toBeGreaterThan(1);

    const p1Stack = await player1.getStack();
    console.log(`Starting stack: ${p1Stack}`);
    expect(p1Stack).toBe("$5,000");

    const initialLevel = await player1.getTournamentLevel();
    const initialBlinds = await player1.getBlinds();
    console.log(
      `Initial level: ${initialLevel}, blinds: $${initialBlinds?.small}/$${initialBlinds?.big}`,
    );
    expect(initialLevel).toBe(1);
    expect(initialBlinds?.small).toBe(25);
    expect(initialBlinds?.big).toBe(50);

    // Run tournament loop
    const state = {
      handCount: 1,
      lastProgressAt: Date.now(),
      lastProgressReason: "tournament-started",
    };
    const activePlayers = new Set(players.map((_, idx) => idx));
    const winnerName = await runTournamentLoop(players, activePlayers, state);

    if (winnerName) {
      console.log(
        `Tournament Winner: ${winnerName} (after ${state.handCount} hands)`,
      );
    }
    expect(winnerName).toBeTruthy();
  });
});
