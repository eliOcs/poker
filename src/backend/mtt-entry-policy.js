import * as Tournament from "../shared/tournament.js";

/**
 * @typedef {import('./mtt.js').ManagedTournament} ManagedTournament
 */

export const DEFAULT_ENTRY_PERIOD_LEVELS = 4;

/**
 * @param {unknown} entryPeriodLevels
 * @returns {number}
 */
export function validateEntryPeriodLevels(entryPeriodLevels) {
  if (
    typeof entryPeriodLevels !== "number" ||
    !Number.isInteger(entryPeriodLevels) ||
    entryPeriodLevels < 0 ||
    entryPeriodLevels > Tournament.getMaxLevel()
  ) {
    throw new Error("invalid entry period levels");
  }

  return entryPeriodLevels;
}

/**
 * @param {ManagedTournament} tournament
 * @returns {boolean}
 */
export function isEntryPeriodOpen(tournament) {
  return tournament.status === "running" && tournament.entryPeriodOpen;
}

/**
 * @param {ManagedTournament} tournament
 * @param {number|undefined} completedLevel
 */
export function applyEntryPeriodCutoff(tournament, completedLevel) {
  if (
    completedLevel !== undefined &&
    completedLevel >= tournament.entryPeriodLevels
  ) {
    tournament.entryPeriodOpen = false;
  }
}
