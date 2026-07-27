import * as Tournament from "../shared/tournament.js";
import { calculateBlindStructure } from "./poker/blind-calculator.js";

/**
 * @param {{ buyIn: number, speed: unknown, maxRebuys: unknown }} options
 * @returns {{ speed: Tournament.MttSpeed, maxRebuys: number }}
 */
export function validateMttConfiguration({ buyIn, speed, maxRebuys }) {
  if (!Tournament.isValidBuyin(buyIn)) {
    throw new Error("invalid tournament buy-in");
  }
  if (!Tournament.isValidMttSpeed(speed)) {
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
  const preset = Tournament.getMttSpeedPreset(speed);
  const startingSmallBlind = Tournament.getBlindsForLevel(1).small;
  const structure = calculateBlindStructure({
    playerCount: entrantCount,
    startingStack: initialStack,
    levelDurationMinutes: preset.levelDurationMinutes,
    smallestChip: startingSmallBlind,
    startingSmallBlind,
    expectedRebuys: rebuysEnabled
      ? entrantCount * Tournament.MTT_EXPECTED_REBUY_RATE
      : 0,
    rebuyStack: initialStack,
    antes: false,
    targetAverageGrowth: Tournament.MTT_BLIND_GROWTH,
  });
  const blindLevels = structure.levels.map(({ level, small, big, ante }) => ({
    level,
    small,
    big,
    ante,
  }));

  return {
    blindLevels,
    levelDurationTicks: preset.levelDurationMinutes * 60,
    breakAfterLevels: Tournament.getBreaksForLevelCount(blindLevels.length),
    breakDurationTicks: Tournament.BREAK_DURATION_TICKS,
    durationMinutes: structure.targetLevel * preset.levelDurationMinutes,
  };
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
