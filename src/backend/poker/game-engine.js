import * as Betting from "./betting.js";
import * as Actions from "./actions.js";
import * as HandHistory from "./hand-history/index.js";
import * as TournamentSummary from "./tournament-summary.js";
import { tick, shouldTickBeRunning, resetActingTicks } from "./game-tick.js";
import { createLog, emitLog } from "../logger.js";
import { TIMER_INTERVAL } from "./game-constants.js";
import {
  runAll,
  autoFoldSittingOutActingPlayers,
  executePreActions,
} from "./game-runtime-helpers.js";
import { finalizePendingHandHistory } from "./game-hand-lifecycle.js";
import {
  processGameFlow,
  finishCollectBets,
  dealRunoutStreet,
} from "./game-flow.js";

/**
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./game.js').BroadcastHandler} BroadcastHandler
 */

/**
 * @param {Game} game
 * @returns {{ handNumber: number, phase: string, pot: number, actingSeat: number, currentBet: number }}
 */
export function gameStateSnapshot(game) {
  return {
    handNumber: game.handNumber,
    phase: game.hand.phase,
    pot: game.hand.pot,
    actingSeat: game.hand.actingSeat,
    currentBet: game.hand.currentBet,
  };
}

/** @param {Game} game */
export function stopGameTick(game) {
  if (game.tickTimer) {
    clearInterval(game.tickTimer);
    game.tickTimer = null;
  }
}

/**
 * @param {Game} game
 * @param {BroadcastHandler} onBroadcast
 */
export function startGameTick(game, onBroadcast) {
  if (game.tickTimer) {
    return;
  }

  game.tickTimer = setInterval(() => {
    const result = tick(game);

    const timerLog = createLog("timer_action");
    Object.assign(timerLog.context, {
      game: {
        id: game.id,
        ...Object.fromEntries(
          Object.entries(result).filter(
            ([, value]) => value !== false && value !== null,
          ),
        ),
      },
    });

    if (result.startHand) startHand(game, onBroadcast);
    if (result.autoActionSeat !== null) {
      performAutoAction(game, result.autoActionSeat, onBroadcast);
    }
    if (result.collectBets) finishCollectBets(game, onBroadcast);
    if (result.dealNextStreet) dealRunoutStreet(game, onBroadcast);

    if (!shouldTickBeRunning(game)) {
      stopGameTick(game);
    }

    let broadcastStats = { recipients: 0, maxPayloadBytes: 0 };
    if (result.shouldBroadcast) {
      broadcastStats = onBroadcast({ type: "gameState", gameId: game.id });
    }

    Object.assign(timerLog.context, {
      game: { ...(timerLog.context.game || {}), ...gameStateSnapshot(game) },
      broadcast: broadcastStats,
    });
    emitLog(timerLog);
  }, TIMER_INTERVAL);
}

/**
 * @param {Game} game
 * @param {BroadcastHandler} onBroadcast
 */
export function ensureGameTick(game, onBroadcast) {
  if (shouldTickBeRunning(game) && !game.tickTimer) {
    startGameTick(game, onBroadcast);
  }
}

/**
 * @param {Game} game
 * @param {number} playerCount
 */
function startHandEvent(game, playerCount) {
  game.handLog = createLog("hand");
  Object.assign(game.handLog.context, {
    game: {
      id: game.id,
      handNumber: game.handNumber,
      playerCount,
      isTournament: !!game.tournament?.active,
      ...(game.tournament ? { tournamentLevel: game.tournament.level } : {}),
    },
  });
}

/**
 * @param {Game} game
 */
function recordDealtCards(game) {
  for (const seat of game.seats) {
    if (
      !seat.empty &&
      (!seat.sittingOut || seat.bet > 0) &&
      seat.cards.length > 0
    ) {
      HandHistory.recordDealtCards(game.id, seat.player.id, seat.cards);
    }
  }
}

/**
 * @param {Game} game
 * @param {BroadcastHandler} [onBroadcast]
 */
export function startHand(game, onBroadcast) {
  if (game.pendingHandHistory) finalizePendingHandHistory(game, onBroadcast);

  if (Actions.countPlayersWithChips(game) < 2) {
    return;
  }

  game.winnerMessage = null;
  game.handNumber++;
  Actions.startHand(game);

  if (game.tournament?.active && !game.tournament.startTime) {
    game.tournament.startTime = new Date().toISOString();
  }
  TournamentSummary.startTournament(game);

  const playerCount = game.seats.filter(
    (seat) => !seat.empty && !seat.sittingOut,
  ).length;
  startHandEvent(game, playerCount);

  const sbSeat = Betting.getSmallBlindSeat(game);
  const bbSeat = Betting.getBigBlindSeat(game);
  runAll(Actions.blinds(game));
  HandHistory.startHand(game);

  const sbPlayer = /** @type {import('./seat.js').OccupiedSeat} */ (
    game.seats[sbSeat]
  );
  const bbPlayer = /** @type {import('./seat.js').OccupiedSeat} */ (
    game.seats[bbSeat]
  );
  HandHistory.recordBlind(game.id, sbPlayer.player.id, "sb", sbPlayer.bet);
  HandHistory.recordBlind(game.id, bbPlayer.player.id, "bb", bbPlayer.bet);

  runAll(Actions.dealPreflop(game));
  recordDealtCards(game);

  Betting.startBettingRound(game, "preflop");
  autoFoldSittingOutActingPlayers(game);
  game.hand.currentBet = game.blinds.big;
  resetActingTicks(game);
  executePreActions(game);
}

/**
 * @param {Game} game
 * @param {number} seatIndex
 * @param {BroadcastHandler} [onBroadcast]
 */
export function performAutoAction(game, seatIndex, onBroadcast) {
  const seat = /** @type {import('./seat.js').Seat} */ (game.seats[seatIndex]);
  if (seat.empty) return;

  const occupiedSeat = /** @type {import('./seat.js').OccupiedSeat} */ (seat);
  if (occupiedSeat.bet === game.hand.currentBet) {
    Actions.check(game, { seat: seatIndex });
    HandHistory.recordAction(game.id, occupiedSeat.player.id, "check");
  } else {
    Actions.fold(game, { seat: seatIndex });
    HandHistory.recordAction(game.id, occupiedSeat.player.id, "fold");
  }

  resetActingTicks(game);
  processGameFlow(game, onBroadcast);
}
