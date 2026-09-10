/* eslint-disable playwright/no-conditional-in-test */
import { test, expect } from "./utils/fixtures.js";
import { createGame, renameTournamentInLobby } from "./utils/game-helpers.js";
import {
  allLateRegistrationsAssigned,
  processLateRegistrations,
  signUpTournamentCreator,
  signUpTournamentRegistrant,
} from "./utils/mtt-registration.js";
import {
  installUnstableTournamentConnection,
  UNSTABLE_TOURNAMENT_LATENCY_MS,
  waitForUnstableTournamentRecovery,
} from "./utils/websocket-faults.js";
import {
  getAvailableActions,
  selectRandomAction,
} from "./utils/random-actions.js";
import * as Stress from "./utils/stress-helpers.js";
import { playRandomSocialActions } from "./utils/random-social-actions.js";
import { takeRandomCardAction } from "./utils/random-card-actions.js";
import { startActionRunner } from "./utils/action-runner.js";

/** @typedef {import('./utils/mtt-registration.js').LateRegistration} LateRegistration */

// Tournament E2E test - plays many hands with aggressive/passive mix strategy
test.setTimeout(20 * 60 * 1000);

const STALL_TIMEOUT_MS = 15000;
const BOOKKEEPING_INTERVAL_MS = 500;
/**
 * @typedef {Object} SnapshotResult
 * @property {string|null} winnerName - Tournament winner name if detected
 * @property {number} removedCount - Number of busted players removed
 * @property {number|null} maxHandNumber - Highest hand number seen across players
 * @property {boolean} onBreak
 * @property {boolean} reconnecting
 */

/**
 * @typedef {{ bustedPosition: number, confirmations: number }} EliminationCandidate
 */

/**
 * @param {Map<number, EliminationCandidate>} eliminationCandidates
 * @param {number} idx
 * @param {number|null} bustedPosition
 * @returns {number|null}
 */
function confirmEliminationCandidate(
  eliminationCandidates,
  idx,
  bustedPosition,
) {
  if (bustedPosition == null) {
    eliminationCandidates.delete(idx);
    return null;
  }

  const previousCandidate = eliminationCandidates.get(idx);
  const confirmations =
    previousCandidate?.bustedPosition === bustedPosition
      ? previousCandidate.confirmations + 1
      : 1;
  eliminationCandidates.set(idx, { bustedPosition, confirmations });
  return confirmations >= 2 ? bustedPosition : null;
}

/**
 * Single pass over active players: check winner, remove busted, track hand number.
 * Uses one evaluate call per player instead of separate loops.
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @param {Map<number, EliminationCandidate>} eliminationCandidates
 * @returns {Promise<SnapshotResult>}
 */
async function collectGameSnapshots(
  players,
  activePlayers,
  eliminationCandidates,
) {
  let winnerName = null;
  let removedCount = 0;
  let maxHandNumber = null;
  const eliminatedPlayerIndexes = [];
  let onBreak = false;
  let reconnecting = false;

  const snapshotEntries = await Promise.all(
    [...activePlayers].map(async (idx) => ({
      idx,
      snapshot: await players[idx].getGameSnapshot(),
    })),
  );

  for (const { idx, snapshot } of snapshotEntries) {
    if (!snapshot) {
      eliminationCandidates.delete(idx);
      continue;
    }

    onBreak ||= snapshot.onBreak;
    reconnecting ||= !snapshot.connected;
    if (snapshot.tournamentWinner) {
      winnerName = snapshot.tournamentWinner;
    }
    const confirmedBustedPosition = confirmEliminationCandidate(
      eliminationCandidates,
      idx,
      snapshot.bustedPosition,
    );
    if (confirmedBustedPosition != null) {
      console.log(
        `Seat ${idx + 1} eliminated in position ${confirmedBustedPosition}`,
      );
      activePlayers.delete(idx);
      removedCount++;
      eliminatedPlayerIndexes.push(idx);
      eliminationCandidates.delete(idx);
    }
    if (snapshot.handNumber != null) {
      maxHandNumber =
        maxHandNumber == null
          ? snapshot.handNumber
          : Math.max(maxHandNumber, snapshot.handNumber);
    }
  }

  for (const idx of eliminatedPlayerIndexes) {
    await players[idx].close();
  }

  return { winnerName, removedCount, maxHandNumber, onBreak, reconnecting };
}

/**
 * Recheck rendered choices after a notification. All clicks, including clock
 * recovery, run inside this player's queue.
 * @param {import('./utils/poker-player.js').PokerPlayer} player
 */
async function takeAvailableAction(player) {
  const cardAction = await takeRandomCardAction(player);
  if (cardAction) return cardAction;
  const availableActions = await getAvailableActions(player);
  if (availableActions.length === 0) return null;
  const action = selectRandomAction(availableActions);
  if (action === "callClock") await player.callClock();
  else if (action === "bet" || action === "raise")
    await player.actWithRandomPreset(action);
  else await player.act(action);
  return action;
}

/**
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @param {Map<number, Awaited<ReturnType<typeof startActionRunner>>>} runners
 * @param {{handCount: number, lastProgressAt: number, lastProgressReason: string}} state
 */
async function syncPlayerRunners(players, activePlayers, runners, state) {
  for (const [idx, runner] of runners) {
    if (!activePlayers.has(idx)) {
      await runner.stop();
      runners.delete(idx);
    }
  }
  for (const idx of activePlayers) {
    if (runners.has(idx)) continue;
    const player = players[idx];
    const nextSocialAt = new Map();
    const runner = await startActionRunner(player.page, {
      act: async () => {
        const action = await takeAvailableAction(player);
        if (action) {
          Stress.markProgress(
            state,
            `seat-${idx + 1}-${action}-hand-${state.handCount}`,
          );
        }
      },
      social: () => playRandomSocialActions([player], nextSocialAt),
      onError: (error) => {
        if (!player.page.isClosed()) {
          console.log(
            `Seat ${idx + 1} action attempt failed: ${Stress.formatError(error)}`,
          );
        }
      },
    });
    runners.set(idx, runner);
  }
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
      lines.push(
        `Seat ${idx + 1}: snapshot failed (${Stress.formatError(err)})`,
      );
    }
  }

  return lines.join("\n");
}

/**
 * Throws with a detailed snapshot if loop progress has stalled
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @param {{handCount: number, lastProgressAt: number, lastProgressReason: string, lateRegistrations: LateRegistration[]}} state
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
 * @param {string|null} winnerName
 * @param {number} activePlayerCount
 * @param {LateRegistration[]} lateRegistrations
 * @returns {string|null|undefined}
 */
function getTournamentLoopResult(
  winnerName,
  activePlayerCount,
  lateRegistrations,
) {
  if (!winnerName && activePlayerCount > 1) return;
  if (!allLateRegistrationsAssigned(lateRegistrations)) {
    throw new Error(
      "Tournament ended before both scheduled late entrants reached a table",
    );
  }
  return winnerName;
}

/**
 * Run the tournament game loop until a winner is found
 * @param {import('./utils/poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @param {{handCount: number, lastProgressAt: number, lastProgressReason: string, lateRegistrations: LateRegistration[]}} state
 * @returns {Promise<string|null>} Winner name or null
 */
async function runTournamentLoop(players, activePlayers, state) {
  /** @type {Map<number, EliminationCandidate>} */
  const eliminationCandidates = new Map();
  /** @type {Map<number, Awaited<ReturnType<typeof startActionRunner>>>} */
  const runners = new Map();
  try {
    for (;;) {
      await processLateRegistrations(
        players,
        activePlayers,
        state.lateRegistrations,
        state,
      );
      const snapshots = await collectGameSnapshots(
        players,
        activePlayers,
        eliminationCandidates,
      );
      const result = getTournamentLoopResult(
        snapshots.winnerName,
        activePlayers.size,
        state.lateRegistrations,
      );
      if (result !== undefined) return result;
      if (snapshots.removedCount > 0) {
        Stress.markProgress(state, `removed-${snapshots.removedCount}-busted`);
      }
      if (trackHandTransition(snapshots.maxHandNumber, state)) {
        Stress.markProgress(state, `hand-${state.handCount}`);
      }
      await syncPlayerRunners(players, activePlayers, runners, state);
      for (const runner of runners.values()) runner.requestSocial();
      if (snapshots.onBreak)
        Stress.markProgress(state, `break-hand-${state.handCount}`);
      if (snapshots.reconnecting)
        Stress.markProgress(state, `reconnecting-hand-${state.handCount}`);
      await assertNotStalled(players, activePlayers, state);
      await Stress.delay(BOOKKEEPING_INTERVAL_MS);
    }
  } finally {
    await Promise.all([...runners.values()].map((runner) => runner.stop()));
  }
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
    const connectionFaults = await installUnstableTournamentConnection(player2);
    console.log(
      `Player 2 network latency: ${UNSTABLE_TOURNAMENT_LATENCY_MS}ms`,
    );

    const creatorEmail = `stress-creator-${Date.now()}@example.com`;
    await signUpTournamentCreator(player1, creatorEmail);
    console.log(`Tournament creator signed up as ${creatorEmail}`);

    const tournamentUrl = await createGame(player1, {
      type: "mtt",
      tableSize: 6,
      speed: "turbo",
    });
    await expect(
      player1.mttLobby.getByText("Rebuys", { exact: true }),
    ).toBeVisible();
    await expect(
      player1.mttLobby.getByText("1", { exact: true }),
    ).toBeVisible();
    await renameTournamentInLobby(player1.page, "Stress Test Championship");
    await expect(
      player1.page.getByText("Stress Test Championship"),
    ).toBeVisible();
    console.log(`Tournament created at ${tournamentUrl}`);

    const startingPlayers = players.slice(0, 9);
    const preStartRegistrants = players.slice(1, 9);
    await Promise.all(
      players.map(async (player) => {
        await player.joinTournamentLobbyByUrl(tournamentUrl);
        const drawer = player.page.locator("phg-navigation-drawer");
        if ((await drawer.getAttribute("open")) === null) {
          await drawer.locator(".drawer-toggle").click();
        }
        await player.page
          .getByRole("button", { name: "Settings", exact: true })
          .click();
        await player.page
          .getByRole("link", { name: "Change", exact: true })
          .click();
        await player.page
          .getByRole("button", { name: "Randomize", exact: true })
          .click();
        await player.page
          .getByRole("button", { name: "Done", exact: true })
          .click();
        await player.page
          .getByRole("button", { name: "Save", exact: true })
          .click();
        await expect(player.page).toHaveURL(tournamentUrl);
        await expect(player.mttLobby).toBeVisible();

        const response = await player.page.request.get("/api/users/me");
        expect(response.ok()).toBeTruthy();
        const user = await response.json();
        expect(user.settings.avatar).toBeTruthy();
      }),
    );
    console.log("All eleven players saved randomized avatars");

    await Promise.all(
      preStartRegistrants.map(async (player, index) => {
        await signUpTournamentRegistrant(
          player,
          `stress-player-${index + 2}-${Date.now()}@example.com`,
        );
      }),
    );
    console.log("Nine starting players signed up and registered");

    await player1.startTournament();
    await Promise.all(
      startingPlayers.map((player) => player.waitForTournamentTable()),
    );
    console.log("Tournament started and nine players reached a table");

    await waitForUnstableTournamentRecovery(player2, connectionFaults);
    console.log("Player 2 recovered from the injected connection interruption");

    const initialTableIds = new Set(
      startingPlayers
        .map(
          (player) =>
            player.page
              .url()
              .match(/\/mtt\/[a-z0-9]+\/tables\/([a-z0-9]+)$/)?.[1],
        )
        .filter(Boolean),
    );
    console.log(`Initial tables: ${[...initialTableIds].join(", ")}`);
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
      lateRegistrations: [
        {
          playerIndex: 9,
          targetLevel: 2,
          expectedEntrantCount: 10,
          registered: false,
          queued: false,
          assigned: false,
        },
        {
          playerIndex: 10,
          targetLevel: 3,
          expectedEntrantCount: 11,
          registered: false,
          queued: false,
          assigned: false,
        },
      ],
    };
    const activePlayers = new Set(startingPlayers.map((_, idx) => idx));
    const winnerName = await runTournamentLoop(players, activePlayers, state);

    if (winnerName) {
      console.log(
        `Tournament Winner: ${winnerName} (after ${state.handCount} hands)`,
      );
    }
    expect(allLateRegistrationsAssigned(state.lateRegistrations)).toBe(true);
    expect(connectionFaults.forwardedGameActions).toBeGreaterThan(0);
    expect(winnerName).toBeTruthy();
  });
});
