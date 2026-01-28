import * as PokerActions from "./poker/actions.js";
import * as HandHistory from "./poker/hand-history/index.js";
import { resetActingTicks, startClockTicks } from "./poker/game-tick.js";
import * as PokerGame from "./poker/game.js";

/**
 * @typedef {import('./poker/seat.js').Player} PlayerType
 * @typedef {import('./poker/game.js').Game} Game
 * @typedef {import('./poker/seat.js').OccupiedSeat} OccupiedSeat
 */

export const BETTING_ACTIONS = [
  "check",
  "call",
  "bet",
  "raise",
  "fold",
  "allIn",
];

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
 */
export function recordBettingAction(
  game,
  playerId,
  action,
  seatAfter,
  betBefore,
) {
  const isAllIn = seatAfter.allIn;

  if (action === "fold" || action === "check") {
    HandHistory.recordAction(game.id, playerId, action);
    return;
  }

  if (action === "allIn") {
    const historyAction = classifyAllInAction(
      betBefore,
      game.hand.currentBet,
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

/**
 * Handles the start action
 * @param {Game} game
 * @param {(gameId: string) => void} broadcastGameState
 */
function handleStartAction(game, broadcastGameState) {
  if (game.countdown !== null) {
    PokerGame.startGameTick(game, broadcastGameState);
  }
}

/**
 * Handles sitOut/leave actions that may cancel countdown
 * @param {Game} game
 */
function handleSitOutOrLeave(game) {
  if (game.countdown !== null && PokerActions.countPlayersWithChips(game) < 2) {
    game.countdown = null;
    PokerGame.stopGameTick(game);
  }
}

/**
 * Handles betting actions (processes game flow)
 * @param {Game} game
 * @param {(gameId: string) => void} broadcastGameState
 */
function handleBettingAction(game, broadcastGameState) {
  resetActingTicks(game);
  PokerGame.processGameFlow(game, broadcastGameState);
}

/** @type {Record<string, (game: Game, broadcastGameState: (gameId: string) => void) => void>} */
export const POST_ACTION_HANDLERS = {
  start: handleStartAction,
  sitOut: handleSitOutOrLeave,
  leave: handleSitOutOrLeave,
  callClock: (game) => startClockTicks(game),
};

/**
 * Handles post-action side effects for specific actions
 * @param {string} action
 * @param {Game} game
 * @param {(gameId: string) => void} broadcastGameState
 */
export function handlePostAction(action, game, broadcastGameState) {
  const handler = POST_ACTION_HANDLERS[action];
  if (handler) {
    handler(game, broadcastGameState);
  } else if (BETTING_ACTIONS.includes(action)) {
    handleBettingAction(game, broadcastGameState);
  }
}

/**
 * Gets the player's seat data before an action
 * @param {Game} game
 * @param {PlayerType} player
 * @returns {{ seatIndex: number, seatBefore: OccupiedSeat|null, betBefore: number }}
 */
export function getSeatStateBefore(game, player) {
  const seatIndex = PokerGame.findPlayerSeatIndex(game, player);
  const seatBefore =
    seatIndex !== -1 && !game.seats[seatIndex].empty
      ? /** @type {OccupiedSeat} */ (game.seats[seatIndex])
      : null;
  return { seatIndex, seatBefore, betBefore: seatBefore?.bet || 0 };
}

/**
 * Processes a poker action and records to history
 * @param {Game} game
 * @param {PlayerType} player
 * @param {string} action
 * @param {Record<string, unknown>} args
 * @param {(gameId: string) => void} broadcastGameState
 */
export function processPokerAction(
  game,
  player,
  action,
  args,
  broadcastGameState,
) {
  const { seatIndex, seatBefore, betBefore } = getSeatStateBefore(game, player);

  PokerActions[action](game, { player, ...args });

  if (BETTING_ACTIONS.includes(action) && seatBefore) {
    const seatAfter = /** @type {OccupiedSeat} */ (game.seats[seatIndex]);
    recordBettingAction(game, player.id, action, seatAfter, betBefore);
  }

  handlePostAction(action, game, broadcastGameState);
}
