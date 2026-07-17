/**
 * @typedef {import('./mtt.js').ManagedTournament} ManagedTournament
 * @typedef {import('./mtt.js').TournamentEntrant} TournamentEntrant
 */

export const DEFAULT_MAX_REBUYS = 1;

/**
 * @param {ManagedTournament} tournament
 * @param {TournamentEntrant} entrant
 * @returns {number}
 */
export function getRemainingRebuys(tournament, entrant) {
  return Math.max(0, tournament.maxRebuys - entrant.rebuysUsed);
}

/**
 * @param {ManagedTournament} tournament
 * @returns {number}
 */
export function getTotalAcceptedRebuys(tournament) {
  return [...tournament.entrants.values()].reduce(
    (total, entrant) => total + entrant.rebuysUsed,
    0,
  );
}

/**
 * @param {ManagedTournament} tournament
 * @param {TournamentEntrant} entrant
 * @returns {boolean}
 */
export function isRebuyEligibleByCount(tournament, entrant) {
  return entrant.rebuysUsed < tournament.maxRebuys;
}

/**
 * @param {ManagedTournament} tournament
 * @returns {number}
 */
export function calculatePrizePool(tournament) {
  return (
    tournament.buyIn *
    (tournament.entrants.size + getTotalAcceptedRebuys(tournament))
  );
}
