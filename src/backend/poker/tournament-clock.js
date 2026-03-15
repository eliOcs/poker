/**
 * Shared tournament clock logic for blind level progression and breaks.
 * Used by both sit-n-go (tournament-tick.js) and MTT (mtt.js).
 */

import * as Tournament from "../../shared/tournament.js";

/**
 * @typedef {object} ClockState
 * @property {number} level
 * @property {number} levelTicks
 * @property {number} breakTicks
 * @property {boolean} onBreak
 * @property {boolean} pendingBreak
 */

/**
 * @typedef {object} ClockTickResult
 * @property {boolean} levelChanged
 * @property {boolean} breakStarted
 * @property {boolean} breakEnded
 */

/**
 * @returns {ClockTickResult}
 */
function emptyResult() {
  return { levelChanged: false, breakStarted: false, breakEnded: false };
}

/**
 * @param {ClockState} clock
 */
function advanceLevel(clock) {
  if (clock.level < Tournament.getMaxLevel()) {
    clock.level += 1;
  }
}

/**
 * @param {ClockState} clock
 * @returns {ClockTickResult}
 */
function tickBreak(clock) {
  const result = emptyResult();
  clock.breakTicks += 1;
  if (clock.breakTicks >= Tournament.BREAK_DURATION_TICKS) {
    clock.onBreak = false;
    clock.breakTicks = 0;
    clock.pendingBreak = false;
    advanceLevel(clock);
    result.breakEnded = true;
    result.levelChanged = true;
  }
  return result;
}

/**
 * @param {ClockState} clock
 * @param {boolean} canStartBreak - Whether a break can start now (e.g. all tables waiting)
 * @returns {ClockTickResult}
 */
function tickLevel(clock, canStartBreak) {
  const result = emptyResult();
  clock.levelTicks += 1;

  if (clock.levelTicks < Tournament.LEVEL_DURATION_TICKS) {
    return result;
  }

  clock.levelTicks = 0;

  if (clock.level !== Tournament.BREAK_AFTER_LEVEL) {
    advanceLevel(clock);
    result.levelChanged = true;
    return result;
  }

  if (canStartBreak) {
    clock.onBreak = true;
    clock.breakTicks = 0;
    clock.pendingBreak = false;
    result.breakStarted = true;
  } else {
    clock.pendingBreak = true;
  }

  return result;
}

/**
 * Advance the tournament clock by one tick.
 * @param {ClockState} clock - Mutable clock state
 * @param {boolean} canStartBreak - Whether a break can begin right now
 * @returns {ClockTickResult}
 */
export function tickClock(clock, canStartBreak) {
  if (clock.onBreak) {
    return tickBreak(clock);
  }
  return tickLevel(clock, canStartBreak);
}
