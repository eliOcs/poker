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
  if (betBefore >= currentBet || finalBet <= currentBet) {
    return "call";
  }
  if (currentBet === 0) {
    return "bet";
  }
  return "raise";
}

/**
 * Records a betting action to hand history
 * @param {string} gameId
 * @param {string} playerId
 * @param {string} action
 * @param {OccupiedSeat} seatAfter
 * @param {number} betBefore
 * @param {Game} game
 */
export function recordBettingAction(
  gameId,
  playerId,
  action,
  seatAfter,
  betBefore,
  game,
) {
  const isAllIn = seatAfter.allIn;

  if (action === "fold" || action === "check") {
    HandHistory.recordAction(gameId, playerId, action);
    return;
  }

  if (action === "allIn") {
    const historyAction = classifyAllInAction(
      betBefore,
      game.hand.currentBet,
      seatAfter.bet,
    );
    HandHistory.recordAction(
      gameId,
      playerId,
      historyAction,
      seatAfter.bet,
      true,
    );
    return;
  }

  // call, bet, raise
  HandHistory.recordAction(gameId, playerId, action, seatAfter.bet, isAllIn);
}

/**
 * Handles the start action
 * @param {Game} game
 * @param {string} gameId
 * @param {(gameId: string) => void} broadcastGameState
 */
function handleStartAction(game, gameId, broadcastGameState) {
  if (game.countdown !== null) {
    PokerGame.startGameTick(game, gameId, broadcastGameState);
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
 * @param {string} gameId
 * @param {(gameId: string) => void} broadcastGameState
 */
function handleBettingAction(game, gameId, broadcastGameState) {
  resetActingTicks(game);
  PokerGame.processGameFlow(game, gameId, broadcastGameState);
}

/** @type {Record<string, (game: Game, gameId: string, broadcastGameState: (gameId: string) => void) => void>} */
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
 * @param {string} gameId
 * @param {(gameId: string) => void} broadcastGameState
 */
export function handlePostAction(action, game, gameId, broadcastGameState) {
  const handler = POST_ACTION_HANDLERS[action];
  if (handler) {
    handler(game, gameId, broadcastGameState);
  } else if (BETTING_ACTIONS.includes(action)) {
    handleBettingAction(game, gameId, broadcastGameState);
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
 * @param {string} gameId
 * @param {PlayerType} player
 * @param {string} action
 * @param {Record<string, unknown>} args
 * @param {(gameId: string) => void} broadcastGameState
 */
export function processPokerAction(
  game,
  gameId,
  player,
  action,
  args,
  broadcastGameState,
) {
  const { seatIndex, seatBefore, betBefore } = getSeatStateBefore(game, player);

  PokerActions[action](game, { player, ...args });

  if (BETTING_ACTIONS.includes(action) && seatBefore) {
    const seatAfter = /** @type {OccupiedSeat} */ (game.seats[seatIndex]);
    recordBettingAction(gameId, player.id, action, seatAfter, betBefore, game);
  }

  handlePostAction(action, game, gameId, broadcastGameState);
}
