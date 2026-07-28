import * as Tournament from "../shared/tournament.js";
import { calculateBlindStructure } from "./poker/blind-calculator.js";

/**
 * Builds a player-responsive tournament schedule for either a Sit & Go or MTT.
 * @param {{ playerCount: number, initialStack: number, rebuysEnabled?: boolean, speed: Tournament.TournamentSpeed }} options
 * @returns {Tournament.TournamentSchedule}
 */
export function calculateTournamentSchedule({
  playerCount,
  initialStack,
  rebuysEnabled = false,
  speed,
}) {
  const preset = Tournament.getTournamentSpeedPreset(speed);
  const startingSmallBlind = Tournament.getBlindsForLevel(1).small;
  const structure = calculateBlindStructure({
    playerCount,
    startingStack: initialStack,
    levelDurationMinutes: preset.levelDurationMinutes,
    smallestChip: startingSmallBlind,
    startingSmallBlind,
    expectedRebuys: rebuysEnabled
      ? playerCount * Tournament.MTT_EXPECTED_REBUY_RATE
      : 0,
    rebuyStack: initialStack,
    antes: false,
    targetAverageGrowth: Tournament.MTT_BLIND_GROWTH,
  });

  return {
    blindLevels: structure.levels.map(({ level, small, big, ante }) => ({
      level,
      small,
      big,
      ante,
    })),
    levelDurationTicks: preset.levelDurationMinutes * 60,
    breakAfterLevels: Tournament.getBreaksForLevelCount(
      structure.levels.length,
    ),
    breakDurationTicks: Tournament.BREAK_DURATION_TICKS,
    durationMinutes: structure.targetLevel * preset.levelDurationMinutes,
  };
}
