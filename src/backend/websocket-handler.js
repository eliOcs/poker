import * as PokerActions from "./poker/actions.js";
import * as HandHistory from "./poker/hand-history/index.js";
import {
  classifyAllInAction,
  recordBettingAction,
} from "./poker/hand-history/record.js";
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

export const SHOW_CARD_ACTIONS = ["showCard1", "showCard2", "showBothCards"];

export { classifyAllInAction, recordBettingAction };

/**
 * Handles the start action
 * @param {Game} game
 * @param {(gameId: string) => void} broadcastGameState
 * @param {(gameId: string, handNumber: number) => void} [onHandRecorded]
 */
function handleStartAction(game, broadcastGameState, onHandRecorded) {
  if (game.countdown !== null) {
    PokerGame.startGameTick(game, broadcastGameState, onHandRecorded);
  }
}

/**
 * Handles sitOut/leave actions that may cancel countdown
 * @param {Game} game
 * @param {(gameId: string) => void} _broadcastGameState
 * @param {(gameId: string, handNumber: number) => void} [onHandRecorded]
 */
function handleSitOutOrLeave(game, _broadcastGameState, onHandRecorded) {
  if (game.countdown !== null && PokerActions.countPlayersWithChips(game) < 2) {
    game.countdown = null;
    PokerGame.stopGameTick(game);
    if (game.pendingHandHistory) {
      const finalizedHandNumber = game.handNumber;
      HandHistory.finalizeHand(game, game.pendingHandHistory).then(() =>
        onHandRecorded?.(game.id, finalizedHandNumber),
      );
      game.pendingHandHistory = null;
    }
  }
}

/**
 * Handles betting actions (processes game flow)
 * @param {Game} game
 * @param {(gameId: string) => void} broadcastGameState
 * @param {(gameId: string, handNumber: number) => void} [onHandRecorded]
 */
function handleBettingAction(game, broadcastGameState, onHandRecorded) {
  resetActingTicks(game);
  PokerGame.processGameFlow(game, broadcastGameState, onHandRecorded);
}

/** @type {Record<string, (game: Game, broadcastGameState: (gameId: string) => void, onHandRecorded?: (gameId: string, handNumber: number) => void) => void>} */
export const POST_ACTION_HANDLERS = {
  start: handleStartAction,
  sitOut: handleSitOutOrLeave,
  cancelSitOut: handleSitOutOrLeave,
  leave: handleSitOutOrLeave,
  callClock: (game) => startClockTicks(game),
};

/**
 * Handles post-action side effects for specific actions
 * @param {string} action
 * @param {Game} game
 * @param {(gameId: string) => void} broadcastGameState
 * @param {(gameId: string, handNumber: number) => void} [onHandRecorded]
 */
export function handlePostAction(
  action,
  game,
  broadcastGameState,
  onHandRecorded,
) {
  const handler = POST_ACTION_HANDLERS[action];
  if (handler) {
    handler(game, broadcastGameState, onHandRecorded);
  } else if (BETTING_ACTIONS.includes(action)) {
    handleBettingAction(game, broadcastGameState, onHandRecorded);
  }
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
    seatIndex !== -1 && !game.seats[seatIndex].empty
      ? /** @type {OccupiedSeat} */ (game.seats[seatIndex])
      : null;
  return {
    seatIndex,
    seatBefore,
    betBefore: seatBefore?.bet || 0,
    currentBetBefore: game.hand?.currentBet || 0,
  };
}

/**
 * Processes a poker action and records to history
 * @param {Game} game
 * @param {PlayerType} player
 * @param {string} action
 * @param {Record<string, unknown>} args
 * @param {(gameId: string) => void} broadcastGameState
 * @param {(gameId: string, handNumber: number) => void} [onHandRecorded]
 */
export function processPokerAction(
  game,
  player,
  action,
  args,
  broadcastGameState,
  onHandRecorded,
) {
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

  handlePostAction(action, game, broadcastGameState, onHandRecorded);
}
