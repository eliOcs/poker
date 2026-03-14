import * as PokerActions from "./poker/actions.js";
import * as HandHistory from "./poker/hand-history/index.js";
import {
  classifyAllInAction,
  recordBettingAction,
} from "./poker/hand-history/record.js";
import { resetActingTicks, startClockTicks } from "./poker/game-tick.js";
import * as PokerGame from "./poker/game.js";
import { finalizePendingHandHistory } from "./poker/game-hand-lifecycle.js";

/**
 * @typedef {import('./poker/seat.js').Player} PlayerType
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./poker/seat.js').OccupiedSeat} OccupiedSeat
 * @typedef {import('./poker/game-hand-lifecycle.js').FinalizedHand} FinalizedHand
 */

export const BETTING_ACTIONS = [
  "check",
  "call",
  "bet",
  "raise",
  "fold",
  "allIn",
];

export const SHOW_CARD_ACTIONS = ["showCard1", "showCard2", "showBothCards"];

export { classifyAllInAction, recordBettingAction };

/**
 * Handles sitOut/leave actions that may cancel countdown
 * @param {Game} game
 * @returns {FinalizedHand | null}
 */
function handleSitOutOrLeave(game) {
  if (game.countdown !== null && PokerActions.countPlayersWithChips(game) < 2) {
    game.countdown = null;
    PokerGame.stopGameTick(game);
    if (game.pendingHandHistory) return finalizePendingHandHistory(game);
  }
  return null;
}

/**
 * Handles betting actions (processes game flow)
 * @param {Game} game
 * @returns {FinalizedHand | null}
 */
function handleBettingAction(game) {
  resetActingTicks(game);
  return PokerGame.processGameFlow(game);
}

/** @type {Record<string, (game: Game) => FinalizedHand | null>} */
export const POST_ACTION_HANDLERS = {
  sitOut: handleSitOutOrLeave,
  cancelSitOut: handleSitOutOrLeave,
  leave: handleSitOutOrLeave,
  callClock: (game) => {
    startClockTicks(game);
    return null;
  },
};

/**
 * Handles post-action side effects for specific actions
 * @param {string} action
 * @param {Game} game
 * @returns {FinalizedHand | null}
 */
export function handlePostAction(action, game) {
  const handler = POST_ACTION_HANDLERS[action];
  if (handler) {
    return handler(game);
  } else if (BETTING_ACTIONS.includes(action)) {
    return handleBettingAction(game);
  }
  return null;
}

/**
 * Gets the player's seat data before an action
 * @param {Game} game
 * @param {PlayerType} player
 * @returns {{ seatIndex: number, seatBefore: OccupiedSeat|null, betBefore: number, currentBetBefore: number }}
 */
export function getSeatStateBefore(game, player) {
  const seatIndex = PokerGame.findPlayerSeatIndex(game, player);
  const seatBefore =
    seatIndex !== -1 &&
    !(
      /** @type {import('./poker/seat.js').Seat} */ (game.seats[seatIndex])
        .empty
    )
      ? /** @type {OccupiedSeat} */ (game.seats[seatIndex])
      : null;
  return {
    seatIndex,
    seatBefore,
    betBefore: seatBefore?.bet || 0,
    currentBetBefore: game.hand.currentBet,
  };
}

/**
 * Processes a poker action and records to history
 * @param {Game} game
 * @param {PlayerType} player
 * @param {string} action
 * @param {Record<string, unknown>} args
 * @returns {FinalizedHand | null}
 */
export function processPokerAction(game, player, action, args) {
  const { seatIndex, seatBefore, betBefore, currentBetBefore } =
    getSeatStateBefore(game, player);

  const actionResult = PokerActions[action](game, { player, ...args });

  if (BETTING_ACTIONS.includes(action) && seatBefore) {
    const seatAfter = /** @type {OccupiedSeat} */ (game.seats[seatIndex]);
    recordBettingAction(
      game,
      player.id,
      action,
      seatAfter,
      betBefore,
      currentBetBefore,
    );
  }

  if (
    SHOW_CARD_ACTIONS.includes(action) &&
    seatBefore &&
    Array.isArray(actionResult) &&
    actionResult.length > 0
  ) {
    HandHistory.recordShowdown(game.id, player.id, actionResult, true);
  }

  return handlePostAction(action, game);
}
