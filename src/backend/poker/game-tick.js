/**
 * Game tick module - handles all time-based game logic
 * Designed to be called every second by the server's tick timer
 *
 * All timing is based on tick counts, not wall-clock time.
 * This makes timing deterministic and testable, and allows
 * TIMER_SPEED to affect all time-based actions uniformly.
 */

import * as TournamentTick from "./tournament-tick.js";

/**
 * @typedef {import('./game.js').Game} Game
 */

// Tick thresholds (in number of ticks, typically 1 tick = 1 second)
export const DISCONNECT_TICKS = 5; // Auto-fold after 5 ticks when disconnected
export const CLOCK_WAIT_TICKS = 60; // "Call Clock" available after 60 ticks
export const CLOCK_DURATION_TICKS = 30; // Clock expires after 30 ticks

/**
 * @typedef {Object} TickResult
 * @property {boolean} shouldBroadcast - Whether to broadcast state to clients
 * @property {boolean} shouldStopTick - Whether to stop the tick timer
 * @property {boolean} startHand - Whether to start a new hand
 * @property {number|null} autoActionSeat - Seat index to auto-action (check/fold), or null
 * @property {'disconnect'|'clock'|null} autoActionReason - Why auto-action triggered
 * @property {boolean} tournamentLevelChanged - Whether tournament blind level changed
 * @property {boolean} tournamentBreakStarted - Whether tournament break started
 * @property {boolean} tournamentBreakEnded - Whether tournament break ended
 * @property {boolean} tournamentEnded - Whether tournament has a winner
 */

/**
 * Handles countdown tick logic
 * @param {Game} game
 * @param {TickResult} result
 */
function handleCountdown(game, result) {
  if (game.countdown === null) return;

  game.countdown -= 1;
  result.shouldBroadcast = true;

  if (game.countdown <= 0) {
    game.countdown = null;
    result.startHand = true;
  }
}

/**
 * Handles disconnect auto-action check
 * @param {Game} game
 * @param {number} actingSeat
 * @param {TickResult} result
 */
function handleDisconnectAutoAction(game, actingSeat, result) {
  const seat = game.seats[actingSeat];
  if (seat.empty || !seat.disconnected) return;

  game.disconnectedActingTicks += 1;
  if (game.disconnectedActingTicks >= DISCONNECT_TICKS) {
    result.autoActionSeat = actingSeat;
    result.autoActionReason = "disconnect";
  }
}

/**
 * Handles clock expiry auto-action check
 * @param {Game} game
 * @param {number} actingSeat
 * @param {TickResult} result
 */
function handleClockExpiry(game, actingSeat, result) {
  if (game.clockTicks === 0 || result.autoActionSeat !== null) return;

  game.clockTicks += 1;
  if (game.clockTicks >= CLOCK_DURATION_TICKS) {
    result.autoActionSeat = actingSeat;
    result.autoActionReason = "clock";
  }
}

/**
 * Creates empty tick result
 * @returns {TickResult}
 */
function createTickResult() {
  return {
    shouldBroadcast: false,
    shouldStopTick: false,
    startHand: false,
    autoActionSeat: null,
    autoActionReason: null,
    tournamentLevelChanged: false,
    tournamentBreakStarted: false,
    tournamentBreakEnded: false,
    tournamentEnded: false,
  };
}

/**
 * Handles tournament tick and returns true if on break
 * @param {Game} game
 * @param {TickResult} result
 * @returns {boolean} Whether tournament is on break
 */
function handleTournamentTick(game, result) {
  if (!game.tournament?.active) return false;

  const tournamentResult = TournamentTick.tick(game);
  result.tournamentLevelChanged = tournamentResult.levelChanged;
  result.tournamentBreakStarted = tournamentResult.breakStarted;
  result.tournamentBreakEnded = tournamentResult.breakEnded;
  result.tournamentEnded = tournamentResult.tournamentEnded;

  const hasChange =
    tournamentResult.levelChanged ||
    tournamentResult.breakStarted ||
    tournamentResult.breakEnded ||
    tournamentResult.tournamentEnded;

  if (hasChange) {
    result.shouldBroadcast = true;
  }

  if (game.tournament.onBreak) {
    result.shouldBroadcast = true;
    return true;
  }

  return false;
}

/**
 * Handles acting player tick
 * @param {Game} game
 * @param {TickResult} result
 * @returns {boolean} Whether there's an acting player
 */
function handleActingTick(game, result) {
  const actingSeat = game.hand?.actingSeat;
  const isActing = actingSeat !== -1 && actingSeat !== undefined;

  if (isActing) {
    game.actingTicks += 1;
    handleDisconnectAutoAction(game, actingSeat, result);
    handleClockExpiry(game, actingSeat, result);
    result.shouldBroadcast = true;
  }

  return isActing;
}

/**
 * Processes one game tick (called every second, or faster with TIMER_SPEED)
 * @param {Game} game
 * @returns {TickResult}
 */
export function tick(game) {
  const result = createTickResult();

  if (handleTournamentTick(game, result)) {
    return result;
  }

  handleCountdown(game, result);
  const isActing = handleActingTick(game, result);

  const isTournamentTicking = TournamentTick.shouldTournamentTick(game);
  if (game.countdown === null && !isActing && !isTournamentTicking) {
    result.shouldStopTick = true;
  }

  return result;
}

/**
 * Checks if the game tick timer should be running
 * @param {Game} game
 * @returns {boolean}
 */
export function shouldTickBeRunning(game) {
  const hasCountdown = game.countdown !== null;
  const hasActingPlayer =
    game.hand?.actingSeat !== -1 && game.hand?.actingSeat !== undefined;
  const isTournamentTicking = TournamentTick.shouldTournamentTick(game);
  return hasCountdown || hasActingPlayer || isTournamentTicking;
}

/**
 * Resets tick counters when action changes to a new player
 * Call this when:
 * - Action advances to a new player
 * - A betting round starts
 * - A player takes an action
 *
 * @param {Game} game
 */
export function resetActingTicks(game) {
  game.actingTicks = 0;
  game.disconnectedActingTicks = 0;
  game.clockTicks = 0;
}

/**
 * Starts the clock countdown (called when someone calls the clock)
 * @param {Game} game
 */
export function startClockTicks(game) {
  game.clockTicks = 1; // Start at 1, will be incremented each tick
}

/**
 * Checks if the "Call Clock" option should be available
 * @param {Game} game
 * @returns {boolean}
 */
export function isClockCallable(game) {
  return game.actingTicks >= CLOCK_WAIT_TICKS && game.clockTicks === 0;
}
