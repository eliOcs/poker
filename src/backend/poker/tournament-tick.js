/**
 * Tournament tick handler for blind level progression and breaks
 */

import * as Tournament from "../../shared/tournament.js";

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
 * Checks if tournament has a winner (set by autoStartNextHand after endHand)
 * @param {Game} game
 * @param {TournamentTickResult} result
 * @returns {boolean} Whether tournament has ended
 */
function checkWinner(game, result) {
  const tournament = game.tournament;
  if (!tournament) return false;

  if (tournament.winner !== null) {
    result.tournamentEnded = true;
    return true;
  }
  return false;
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
      // If hand is in progress, defer break until hand ends
      if (game.hand.phase !== "waiting") {
        tournament.pendingBreak = true;
      } else {
        tournament.onBreak = true;
        tournament.breakTicks = 0;
        result.breakStarted = true;
      }
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

  if (!game.tournament?.active || !game.tournament.startTime) {
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
 * Starts a pending break (called when a hand ends)
 * @param {Game} game
 * @returns {TournamentTickResult}
 */
export function startPendingBreak(game) {
  const result = createEmptyResult();
  const tournament = game.tournament;

  if (!tournament?.pendingBreak) {
    return result;
  }

  tournament.pendingBreak = false;
  tournament.onBreak = true;
  tournament.breakTicks = 0;
  result.breakStarted = true;

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
  // Only tick after tournament has started (first hand dealt)
  if (!game.tournament.startTime) return false;
  return true;
}
