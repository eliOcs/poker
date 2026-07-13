import { BREAK_AFTER_LEVEL } from "../shared/tournament.js";

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
 * The rebuy period closes when the first break starts and never reopens.
 *
 * @param {ManagedTournament} tournament
 * @returns {boolean}
 */
export function isRebuyPeriodOpen(tournament) {
  return !tournament.onBreak && tournament.level <= BREAK_AFTER_LEVEL;
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
