/**
 * Tournament tick handler for blind level progression and breaks
 */

import * as Tournament from "../../shared/tournament.js";
import * as TournamentSummary from "./tournament-summary.js";

/**
 * @typedef {import('./game.js').Game} Game
 */

/**
 * @typedef {object} TournamentTickResult
 * @property {boolean} levelChanged - Whether blind level increased
 * @property {boolean} breakStarted - Whether break just started
 * @property {boolean} breakEnded - Whether break just ended
 * @property {boolean} tournamentEnded - Whether tournament has a winner
 */

/**
 * Advances to the next blind level
 * @param {Game} game
 */
function advanceLevel(game) {
  if (!game.tournament) return;

  const maxLevel = Tournament.getMaxLevel();
  if (game.tournament.level < maxLevel) {
    game.tournament.level += 1;
    const newBlinds = Tournament.getBlindsForLevel(game.tournament.level);
    game.blinds = {
      ante: newBlinds.ante,
      small: newBlinds.small,
      big: newBlinds.big,
    };
  }
}

/**
 * Counts players with chips remaining
 * @param {Game} game
 * @returns {number}
 */
function countPlayersWithChips(game) {
  return game.seats.filter((s) => !s.empty && s.stack > 0).length;
}

/**
 * Creates empty tick result
 * @returns {TournamentTickResult}
 */
function createEmptyResult() {
  return {
    levelChanged: false,
    breakStarted: false,
    breakEnded: false,
    tournamentEnded: false,
  };
}

/**
 * Checks for tournament winner and updates result
 * @param {Game} game
 * @param {TournamentTickResult} result
 * @returns {boolean} Whether to return early
 */
function checkWinner(game, result) {
  const tournament = game.tournament;
  if (!tournament) return false;

  const playersWithChips = countPlayersWithChips(game);
  if (playersWithChips === 1 && tournament.winner === null) {
    const winnerIndex = game.seats.findIndex((s) => !s.empty && s.stack > 0);
    tournament.winner = winnerIndex;
    result.tournamentEnded = true;
    // Write tournament summary (fire and forget - no need to wait)
    TournamentSummary.finalizeTournament(game);
    return true;
  }
  return tournament.winner !== null;
}

/**
 * Handles break tick logic
 * @param {Game} game
 * @param {TournamentTickResult} result
 */
function handleBreakTick(game, result) {
  const tournament = game.tournament;
  if (!tournament) return;

  tournament.breakTicks += 1;
  if (tournament.breakTicks >= Tournament.BREAK_DURATION_TICKS) {
    tournament.onBreak = false;
    tournament.breakTicks = 0;
    advanceLevel(game);
    result.breakEnded = true;
    result.levelChanged = true;
  }
}

/**
 * Handles level tick logic
 * @param {Game} game
 * @param {TournamentTickResult} result
 */
function handleLevelTick(game, result) {
  const tournament = game.tournament;
  if (!tournament) return;

  tournament.levelTicks += 1;

  if (tournament.levelTicks >= Tournament.LEVEL_DURATION_TICKS) {
    tournament.levelTicks = 0;

    if (tournament.level === Tournament.BREAK_AFTER_LEVEL) {
      tournament.onBreak = true;
      tournament.breakTicks = 0;
      result.breakStarted = true;
    } else {
      advanceLevel(game);
      result.levelChanged = true;
    }
  }
}

/**
 * Process one tick of tournament state
 * Called every second during active tournament play
 * @param {Game} game
 * @returns {TournamentTickResult}
 */
export function tick(game) {
  const result = createEmptyResult();

  if (!game.tournament?.active) {
    return result;
  }

  if (checkWinner(game, result)) {
    return result;
  }

  if (game.tournament.onBreak) {
    handleBreakTick(game, result);
    return result;
  }

  // Always advance level timer during active play (not just waiting phase)
  handleLevelTick(game, result);

  return result;
}

/**
 * Get seconds remaining until next level or break end
 * @param {Game} game
 * @returns {number|null}
 */
export function getTimeToNextLevel(game) {
  if (!game.tournament?.active) return null;

  if (game.tournament.onBreak) {
    return Tournament.BREAK_DURATION_TICKS - game.tournament.breakTicks;
  }

  return Tournament.LEVEL_DURATION_TICKS - game.tournament.levelTicks;
}

/**
 * Check if the tournament should tick (for keeping timer running)
 * @param {Game} game
 * @returns {boolean}
 */
export function shouldTournamentTick(game) {
  if (!game.tournament?.active) return false;
  // Always keep ticking during active tournaments (level timer runs continuously)
  return true;
}
