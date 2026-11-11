import { checkpointCoverage } from "./coverage.js";
import { expect } from "@playwright/test";
import { waitForLatestEmail } from "./email.js";

/**
 * @typedef {Object} LateRegistration
 * @property {number} playerIndex
 * @property {"lobby"|"watched table"} entry
 * @property {number} targetLevel
 * @property {number} expectedEntrantCount
 * @property {boolean} registered
 * @property {boolean} queued
 * @property {boolean} assigned
 */

/**
 * @param {{lastProgressAt: number, lastProgressReason: string}} state
 * @param {string} reason
 */
function markProgress(state, reason) {
  state.lastProgressAt = Date.now();
  state.lastProgressReason = reason;
}

/**
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {string} email
 * @param {string} name
 */
async function completeSignUp(player, email, name) {
  await player.page.locator("#profile-sign-up-name").fill(name);
  await player.page.locator("#profile-sign-in-email").fill(email);

  const [signInEmail] = await Promise.all([
    waitForLatestEmail(email),
    player.page.getByRole("button", { name: "Send sign-up link" }).click(),
  ]);

  await player.completeSignInFromEmail(signInEmail.html);
}

/**
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {string} email
 */
export async function signUpTournamentCreator(player, email) {
  await checkpointCoverage(player.page);
  await player.page.goto("/mtt");
  await player.page
    .getByRole("button", { name: "Create Tournament", exact: true })
    .click();
  await completeSignUp(player, email, "Stress Creator");
  await player.page.locator("phg-tournaments").waitFor();
}

/**
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {string} email
 */
export async function signUpTournamentRegistrant(player, email) {
  await player.mttLobby
    .getByRole("button", { name: "Register", exact: true })
    .click();
  await completeSignUp(player, email, player.name);
  await player.mttLobby.waitFor();
  await player.mttLobby.getByRole("button", { name: "Unregister" }).waitFor();
}

/**
 * Simulates the player opening the tournament on another device, where they
 * are not signed in.
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {string} tournamentUrl
 */
export async function continueAsGuestOnAnotherDevice(player, tournamentUrl) {
  await player.context.clearCookies();
  await player.joinTournamentLobbyByUrl(tournamentUrl);
  await expect(
    player.mttLobby.getByRole("button", {
      name: "Already registered? Sign in",
      exact: true,
    }),
  ).toBeVisible();
}

/**
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {string} email
 * @param {number} startedAt
 */
export async function openTableFromStartEmail(player, email, startedAt) {
  const startEmail = await waitForLatestEmail(email, startedAt);
  await player.page.setContent(startEmail.html, {
    waitUntil: "domcontentloaded",
  });
  await player.page.getByRole("link", { name: "Open my table" }).click();
  await player.waitForTournamentTable();
  await expect(player.mySeat).toBeVisible();
}

/**
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {number} entryPeriodLevels
 */
async function lateRegisterFromLobby(player, entryPeriodLevels) {
  const lateRegister = player.mttLobby.getByRole("button", {
    name: "Late Register",
    exact: true,
  });
  await expect(lateRegister).toBeVisible();

  const tooltipTrigger = player.mttLobby.getByRole("button", {
    name: "Late registration details",
  });
  await tooltipTrigger.hover();
  await expect(player.mttLobby.getByRole("tooltip")).toContainText(
    `Late registration is allowed through level ${entryPeriodLevels}.`,
  );

  await lateRegister.click();
}

/**
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {string} tableUrl
 */
async function lateRegisterFromWatchedTable(player, tableUrl) {
  await player.joinGameByUrl(tableUrl);
  await expect(player.actionPanel).toContainText("Watching as a guest");
  await expect(
    player.actionPanel.getByRole("button", {
      name: "Already registered? Sign in",
      exact: true,
    }),
  ).toBeVisible();
  await player.actionPanel
    .getByRole("button", { name: "Late Register", exact: true })
    .click();
}

/**
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {string} email
 * @param {{ entry: LateRegistration["entry"], entryPeriodLevels: number, tableUrl: string }} start
 * @param {number} expectedEntrantCount
 * @param {number} expectedPrizePool
 */
async function signUpLateTournamentRegistrant(
  player,
  email,
  start,
  expectedEntrantCount,
  expectedPrizePool,
) {
  if (start.entry === "lobby") {
    await lateRegisterFromLobby(player, start.entryPeriodLevels);
  } else {
    await lateRegisterFromWatchedTable(player, start.tableUrl);
  }
  await completeSignUp(player, email, player.name);
  await expect
    .poll(
      async () => {
        const snapshot = await player.getTournamentViewSnapshot();
        return ["registered", "seated"].includes(
          snapshot?.currentPlayer.status ?? "",
        );
      },
      { message: `${player.name} did not complete late registration` },
    )
    .toBe(true);

  const snapshot = await player.getTournamentViewSnapshot();
  if (!snapshot) {
    throw new Error(`${player.name} has no tournament view after registering`);
  }
  expect(snapshot.entrantCount).toBe(expectedEntrantCount);
  // Other players may rebuy between the pre-registration snapshot and this
  // one, so the pool can only exceed the expectation by whole buy-ins.
  expect(snapshot.prizePool).toBeGreaterThanOrEqual(expectedPrizePool);
  expect((snapshot.prizePool - expectedPrizePool) % snapshot.buyIn).toBe(0);
  await expect(
    player.page.getByRole("button", { name: "Unregister", exact: true }),
  ).toHaveCount(0);

  if (!snapshot.currentPlayer.tableId) {
    await expect(player.page.locator("phg-toasts")).toContainText(
      "Registered. Waiting for a table.",
    );
  }

  return snapshot;
}

/** @param {LateRegistration[]} lateRegistrations */
export function allLateRegistrationsAssigned(lateRegistrations) {
  return lateRegistrations.every((registration) => registration.assigned);
}

/**
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {LateRegistration} registration
 * @param {Set<number>} activePlayers
 * @param {{lastProgressAt: number, lastProgressReason: string}} state
 */
async function activateLateRegistrant(
  player,
  registration,
  activePlayers,
  state,
) {
  if (!/\/mtt\/[a-z0-9]+\/tables\/[a-z0-9]+$/.test(player.page.url())) {
    return false;
  }

  // Immediate registration can redirect from the HTTP response before the
  // lobby socket receives a playerMoved event. Verify seating, not its toast.
  await player.waitForTournamentTable();
  await expect(player.mySeat).toBeVisible();
  activePlayers.add(registration.playerIndex);
  registration.assigned = true;
  markProgress(state, `late-player-${registration.playerIndex + 1}-assigned`);
  console.log(
    `Player ${registration.playerIndex + 1} joined the active tournament field`,
  );
  return true;
}

/**
 * @param {import('./poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 */
async function getActiveTournamentSnapshot(players, activePlayers) {
  // Every player receives the same tournament view. Stop at the first usable
  // one, while allowing another player to supply it during a table move.
  let tournament = null;
  for (const idx of activePlayers) {
    tournament = await players[idx]
      .getTournamentViewSnapshot()
      .catch(() => null);
    if (tournament) break;
  }
  return tournament;
}

/**
 * @param {import('./poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 */
function findActiveTableUrl(players, activePlayers) {
  const tableUrl = [...activePlayers]
    .map((idx) => players[idx].page.url())
    .find((url) => /\/mtt\/[a-z0-9]+\/tables\/[a-z0-9]+$/.test(url));
  if (!tableUrl) throw new Error("No active player is at a table to watch");
  return tableUrl;
}

/**
 * @param {import('./poker-player.js').PokerPlayer[]} players
 * @param {Set<number>} activePlayers
 * @param {LateRegistration[]} lateRegistrations
 * @param {{lastProgressAt: number, lastProgressReason: string}} state
 */
export async function processLateRegistrations(
  players,
  activePlayers,
  lateRegistrations,
  state,
) {
  if (allLateRegistrationsAssigned(lateRegistrations)) return;

  for (const registration of lateRegistrations) {
    if (registration.registered && !registration.assigned) {
      await activateLateRegistrant(
        players[registration.playerIndex],
        registration,
        activePlayers,
        state,
      );
    }
  }

  const tournament = await getActiveTournamentSnapshot(players, activePlayers);
  if (!tournament || tournament.status !== "running") return;

  const registration = lateRegistrations.find(
    (candidate) =>
      !candidate.registered && tournament.level >= candidate.targetLevel,
  );
  if (!registration) return;

  const player = players[registration.playerIndex];
  const snapshot = await signUpLateTournamentRegistrant(
    player,
    `stress-player-${registration.playerIndex + 1}-${Date.now()}@example.com`,
    {
      entry: registration.entry,
      entryPeriodLevels: tournament.entryPeriodLevels,
      tableUrl: findActiveTableUrl(players, activePlayers),
    },
    registration.expectedEntrantCount,
    tournament.prizePool + tournament.buyIn,
  );
  registration.registered = true;
  registration.queued = !snapshot.currentPlayer.tableId;
  markProgress(
    state,
    `late-player-${registration.playerIndex + 1}-${registration.queued ? "queued" : "registered"}`,
  );
  console.log(
    `Player ${registration.playerIndex + 1} late registered from the ${registration.entry} at level ${tournament.level} (${registration.queued ? "queued" : "assigned immediately"})`,
  );
  await activateLateRegistrant(player, registration, activePlayers, state);
}
