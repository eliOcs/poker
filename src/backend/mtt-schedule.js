import * as Tournament from "../shared/tournament.js";
import { calculateTournamentSchedule } from "./tournament-schedule.js";

/**
 * @param {{ buyIn: number, speed: unknown, maxRebuys: unknown }} options
 * @returns {{ speed: Tournament.MttSpeed, maxRebuys: number }}
 */
export function validateMttConfiguration({ buyIn, speed, maxRebuys }) {
  if (!Tournament.isValidBuyin(buyIn)) {
    throw new Error("invalid tournament buy-in");
  }
  if (!Tournament.isValidTournamentSpeed(speed)) {
    throw new Error("invalid tournament speed");
  }
  if (
    typeof maxRebuys !== "number" ||
    !Number.isInteger(maxRebuys) ||
    maxRebuys < 0
  ) {
    throw new Error("invalid maximum rebuys");
  }
  return { speed, maxRebuys };
}

/**
 * @param {{ entrantCount: number, initialStack: number, rebuysEnabled: boolean, speed: Tournament.MttSpeed }} options
 * @returns {Tournament.TournamentSchedule}
 */
export function calculateMttSchedule({
  entrantCount,
  initialStack,
  rebuysEnabled,
  speed,
}) {
  return calculateTournamentSchedule({
    playerCount: entrantCount,
    initialStack,
    rebuysEnabled,
    speed,
  });
}

/**
 * Replaces an MTT schedule. During late registration, elapsed and current
 * levels remain immutable while all future levels come from the new estimate.
 * @param {import('./mtt.js').ManagedTournament} tournament
 */
export function recalculateMttSchedule(tournament) {
  const schedule = calculateMttSchedule({
    entrantCount: Math.max(1, tournament.entrants.size),
    initialStack: tournament.initialStack,
    rebuysEnabled: tournament.maxRebuys > 0,
    speed: tournament.speed,
  });

  if (tournament.status === "running") {
    const retainedLevels = tournament.blindLevels.filter(
      ({ level }) => level <= tournament.level,
    );
    schedule.blindLevels = [
      ...retainedLevels.map((level) => ({ ...level })),
      ...schedule.blindLevels
        .filter(({ level }) => level > tournament.level)
        .map((level) => ({ ...level })),
    ];
  }

  Object.assign(tournament, Tournament.copyTournamentSchedule(schedule));
}
