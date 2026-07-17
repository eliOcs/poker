import { expect } from "@playwright/test";
import { waitForLatestEmail } from "./email.js";

/**
 * @typedef {Object} LateRegistration
 * @property {number} playerIndex
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
  await player.page.goto("/mtt");
  await player.page.locator("phg-tournaments").waitFor();
  await completeSignUp(player, email, "Stress Creator");
  await player.page.locator("phg-tournaments").waitFor();
}

/**
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {string} email
 */
export async function signUpTournamentRegistrant(player, email) {
  await player.mttLobby.getByRole("button", { name: "Register" }).click();
  await completeSignUp(player, email, player.name);
  await player.mttLobby.waitFor();
  await player.mttLobby.getByRole("button", { name: "Unregister" }).waitFor();
}

/**
 * @param {import('./poker-player.js').PokerPlayer} player
 * @param {string} email
 * @param {number} entryPeriodLevels
 * @param {number} expectedEntrantCount
 * @param {number} expectedPrizePool
 */
async function signUpLateTournamentRegistrant(
  player,
  email,
  entryPeriodLevels,
  expectedEntrantCount,
  expectedPrizePool,
) {
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
  expect(snapshot.prizePool).toBe(expectedPrizePool);
  await expect(
    player.page.getByRole("button", { name: "Unregister", exact: true }),
  ).toHaveCount(0);

  if (!snapshot.currentPlayer.tableId) {
    await expect(player.page.locator("phg-toast")).toContainText(
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

  await expect(player.page.locator("phg-toast")).toContainText("Moved to ");
  await player.waitForTournamentTable();
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
 * @param {LateRegistration[]} lateRegistrations
 * @param {{lastProgressAt: number, lastProgressReason: string}} state
 */
export async function processLateRegistrations(
  players,
  activePlayers,
  lateRegistrations,
  state,
) {
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

  const tournamentSnapshots = await Promise.all(
    [...activePlayers].map((idx) =>
      players[idx].getTournamentViewSnapshot().catch(() => null),
    ),
  );
  const tournament = tournamentSnapshots.find((snapshot) => snapshot !== null);
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
    tournament.entryPeriodLevels,
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
    `Player ${registration.playerIndex + 1} late registered at level ${tournament.level} (${registration.queued ? "queued" : "assigned immediately"})`,
  );
  await activateLateRegistrant(player, registration, activePlayers, state);
}
