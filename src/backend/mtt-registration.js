import { isEntryPeriodOpen } from "./mtt-entry-policy.js";

/**
 * @param {import('./mtt.js').ManagedTournament} tournament
 * @param {import('./user.js').User} user
 * @param {() => string} now
 */
export function addTournamentEntrant(tournament, user, now) {
  if (!user.email) throw new Error("sign up required to register");
  if (tournament.entrants.has(user.id)) {
    throw new Error("player already registered");
  }
  if (tournament.status !== "registration" && !isEntryPeriodOpen(tournament)) {
    throw new Error("registration is closed");
  }

  tournament.entrants.set(user.id, {
    playerId: user.id,
    name: user.name,
    status: "registered",
    stack: tournament.initialStack,
    handsPlayed: 0,
    rebuysUsed: 0,
    registrationOrder: tournament.nextRegistrationOrder,
    registeredAt: now(),
  });
  tournament.nextRegistrationOrder += 1;
}
