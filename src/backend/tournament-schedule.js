import * as Tournament from "../shared/tournament.js";

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
  const structure = Tournament.calculateTournamentStructure({
    playerCount,
    initialStack,
    rebuysEnabled,
    speed,
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
