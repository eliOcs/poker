/**
 * Sit-n-go tournament tick handler.
 * Delegates clock progression to the shared tournament-clock module.
 */

import * as Tournament from "../../shared/tournament.js";
import { tickClock } from "./tournament-clock.js";

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
 * Syncs game blinds to match the current tournament level.
 * @param {Game} game
 */
function syncBlinds(game) {
  if (!game.tournament) return;
  const blinds = Tournament.getBlindsForLevel(game.tournament.level);
  game.blinds = { ante: blinds.ante, small: blinds.small, big: blinds.big };
}

/**
 * Process one tick of tournament state.
 * Called every tick during active sit-n-go play.
 * @param {Game} game
 * @returns {TournamentTickResult}
 */
export function tick(game) {
  const result = createEmptyResult();

  if (
    !game.tournament?.active ||
    game.tournament.kind !== "sitngo" ||
    !game.tournament.startTime
  ) {
    return result;
  }

  if (game.tournament.winner !== null) {
    result.tournamentEnded = true;
    return result;
  }

  const canStartBreak = game.hand.phase === "waiting";
  const clockResult = tickClock(game.tournament, canStartBreak);

  result.levelChanged = clockResult.levelChanged;
  result.breakStarted = clockResult.breakStarted;
  result.breakEnded = clockResult.breakEnded;

  if (clockResult.levelChanged) {
    syncBlinds(game);
  }

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

  if (!tournament?.pendingBreak || tournament.kind !== "sitngo") {
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
  if (!game.tournament?.active || game.tournament.kind !== "sitngo")
    return false;
  if (!game.tournament.startTime) return false;
  return true;
}
