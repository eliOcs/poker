import * as Betting from "./betting.js";

/**
 * @typedef {import('./types.js').Cents} Cents
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./seat.js').OccupiedSeat} OccupiedSeat
 */

/**
 * @typedef {object} PreActionCheckFold
 * @property {'checkFold'} type
 */

/**
 * @typedef {object} PreActionCallAmount
 * @property {'callAmount'} type
 * @property {Cents} amount
 */

/**
 * @typedef {PreActionCheckFold|PreActionCallAmount} PreAction
 */

/**
 * Sets a pre-action on a seat
 * @param {OccupiedSeat} seat
 * @param {'checkFold'|'callAmount'} type
 * @param {Cents} [amount]
 */
export function setPreAction(seat, type, amount = undefined) {
  if (type === "checkFold") {
    seat.preAction = { type };
    return;
  }
  if (amount === undefined) {
    throw new Error("amount is required for callAmount pre-action");
  }
  seat.preAction = { type, amount };
}

/**
 * Clears pre-action from a seat
 * @param {OccupiedSeat} seat
 */
export function clearPreAction(seat) {
  delete seat.preAction;
}

/**
 * Resolves a pre-action to a concrete action if valid.
 * @param {PreAction} preAction
 * @param {Game} game
 * @param {number} seatIndex
 * @returns {{ action: string, args: Record<string, unknown> } | undefined}
 */
export function resolvePreAction(preAction, game, seatIndex) {
  const seat = /** @type {OccupiedSeat} */ (game.seats[seatIndex]);
  const toCall = Betting.getCallAmount(game, seatIndex);

  if (preAction.type === "checkFold") {
    if (toCall === 0) {
      return { action: "check", args: { seat: seatIndex } };
    }
    return { action: "fold", args: { seat: seatIndex } };
  }

  if (preAction.amount !== toCall) {
    return;
  }

  if (seat.stack <= toCall) {
    return { action: "allIn", args: { seat: seatIndex } };
  }
  return { action: "call", args: { seat: seatIndex } };
}

/**
 * Clears all callAmount pre-actions (called when bet changes)
 * @param {Game} game
 */
export function invalidateCallPreActions(game) {
  for (const seat of game.seats) {
    if (!seat.empty && seat.preAction?.type === "callAmount") {
      delete seat.preAction;
    }
  }
}
