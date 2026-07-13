/**
 * @typedef {object} ActionClock
 * @property {number} waitTicks - Ticks elapsed before a manual clock call
 * @property {number} countdownTicks - Ticks elapsed in an active countdown
 */

export const CLOCK_WAIT_TICKS = 15;
export const CLOCK_DURATION_TICKS = 60;

/**
 * @returns {ActionClock}
 */
export function create() {
  return { waitTicks: 0, countdownTicks: 0 };
}

/**
 * @param {ActionClock} clock
 * @returns {boolean}
 */
export function isActive(clock) {
  return clock.countdownTicks > 0;
}

/**
 * @param {ActionClock} clock
 * @returns {boolean}
 */
export function canStart(clock) {
  return clock.waitTicks >= CLOCK_WAIT_TICKS && !isActive(clock);
}

/**
 * @param {ActionClock} clock
 */
export function assertCanStart(clock) {
  if (canStart(clock)) return;
  if (isActive(clock)) {
    throw new Error("clock already called");
  }
  throw new Error("must wait 60 seconds before calling clock");
}

/**
 * @param {ActionClock} clock
 */
export function tickWait(clock) {
  clock.waitTicks += 1;
}

/**
 * @param {ActionClock} clock
 * @returns {boolean} Whether the countdown was started
 */
export function start(clock) {
  if (isActive(clock)) return false;
  clock.countdownTicks = 1;
  return true;
}

/**
 * @param {ActionClock} clock
 * @returns {boolean}
 */
export function isExpired(clock) {
  return isActive(clock) && clock.countdownTicks >= CLOCK_DURATION_TICKS;
}

/**
 * @param {ActionClock} clock
 * @returns {boolean} Whether this tick expired the countdown
 */
export function tick(clock) {
  if (!isActive(clock) || isExpired(clock)) return false;
  clock.countdownTicks += 1;
  return isExpired(clock);
}

/**
 * @param {ActionClock} clock
 * @returns {number|undefined}
 */
export function getRemaining(clock) {
  if (!isActive(clock)) return undefined;
  return Math.max(0, CLOCK_DURATION_TICKS - clock.countdownTicks);
}

/**
 * @param {ActionClock} clock
 */
export function reset(clock) {
  clock.waitTicks = 0;
  clock.countdownTicks = 0;
}
