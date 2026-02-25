import * as HandHistory from "./index.js";

/**
 * @typedef {import('../game.js').Game} Game
 * @typedef {import('../seat.js').OccupiedSeat} OccupiedSeat
 */

/**
 * Classifies an all-in action as call, bet, or raise based on game context
 * @param {number} betBefore - Player's bet before the action
 * @param {number} currentBet - Current bet to match
 * @param {number} finalBet - Player's bet after going all-in
 * @returns {'call'|'bet'|'raise'}
 */
export function classifyAllInAction(betBefore, currentBet, finalBet) {
  // No current bet means this is an opening bet
  if (currentBet === 0) {
    return "bet";
  }
  // Final bet <= current bet means calling (possibly for less)
  if (finalBet <= currentBet) {
    return "call";
  }
  // Going all-in for more than current bet is a raise
  return "raise";
}

/**
 * Records a betting action to hand history
 * @param {Game} game
 * @param {string} playerId
 * @param {string} action
 * @param {OccupiedSeat} seatAfter
 * @param {number} betBefore
 * @param {number} currentBetBefore - The current bet BEFORE the action was executed
 */
export function recordBettingAction(
  game,
  playerId,
  action,
  seatAfter,
  betBefore,
  currentBetBefore,
) {
  const isAllIn = seatAfter.allIn;

  if (action === "fold" || action === "check") {
    HandHistory.recordAction(game.id, playerId, action);
    return;
  }

  if (action === "allIn") {
    const historyAction = classifyAllInAction(
      betBefore,
      currentBetBefore,
      seatAfter.bet,
    );
    HandHistory.recordAction(
      game.id,
      playerId,
      historyAction,
      seatAfter.bet,
      true,
    );
    return;
  }

  // call, bet, raise
  HandHistory.recordAction(game.id, playerId, action, seatAfter.bet, isAllIn);
}
