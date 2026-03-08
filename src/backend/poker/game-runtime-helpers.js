import * as Actions from "./actions.js";
import * as HandHistory from "./hand-history/index.js";
import * as PreAction from "./pre-action.js";
import { recordBettingAction } from "./hand-history/record.js";
import { resetActingTicks } from "./game-tick.js";

/**
 * @typedef {import('./game.js').Game} Game
 */

/** @param {Generator} gen */
export function runAll(gen) {
  while (!gen.next().done);
}

/**
 * @param {Game} game
 * @returns {boolean}
 */
export function autoFoldSittingOutActingPlayers(game) {
  let foldedAny = false;

  while (game.hand.actingSeat !== -1) {
    const actingSeat = game.hand.actingSeat;
    const seat = /** @type {import('./seat.js').Seat} */ (
      game.seats[actingSeat]
    );

    if (
      seat.empty ||
      !(/** @type {import('./seat.js').OccupiedSeat} */ (seat).sittingOut) ||
      /** @type {import('./seat.js').OccupiedSeat} */ (seat).folded
    ) {
      break;
    }

    const occupiedSeat = /** @type {import('./seat.js').OccupiedSeat} */ (seat);
    Actions.fold(game, { seat: actingSeat });
    HandHistory.recordAction(game.id, occupiedSeat.player.id, "fold");
    foldedAny = true;
  }

  return foldedAny;
}

/**
 * @param {Game} game
 */
export function executePreActions(game) {
  while (game.hand.actingSeat !== -1) {
    const seatIndex = game.hand.actingSeat;
    const seat = /** @type {import('./seat.js').Seat} */ (
      game.seats[seatIndex]
    );

    if (
      seat.empty ||
      !(/** @type {import('./seat.js').OccupiedSeat} */ (seat).preAction)
    ) {
      break;
    }

    const occupiedSeat = /** @type {import('./seat.js').OccupiedSeat} */ (seat);
    const preAction = /** @type {import('./pre-action.js').PreAction} */ (
      occupiedSeat.preAction
    );
    const betBefore = occupiedSeat.bet;
    const currentBetBefore = game.hand.currentBet;
    const resolved = PreAction.resolvePreAction(preAction, game, seatIndex);
    PreAction.clearPreAction(occupiedSeat);

    if (!resolved) break;

    Actions[resolved.action](game, resolved.args);

    const seatAfter = /** @type {import('./seat.js').OccupiedSeat} */ (
      game.seats[seatIndex]
    );
    recordBettingAction(
      game,
      seatAfter.player.id,
      resolved.action,
      seatAfter,
      betBefore,
      currentBetBefore,
    );

    resetActingTicks(game);
  }
}
