import * as Betting from "./betting.js";
import * as Showdown from "./showdown.js";
import * as Actions from "./actions.js";
import * as HandHistory from "./hand-history/index.js";
import HandRankings from "./hand-rankings.js";
import { resetActingTicks } from "./game-tick.js";
import { RUNOUT_DELAY_TICKS } from "./game-constants.js";
import {
  autoFoldSittingOutActingPlayers,
  executePreActions,
  runAll,
} from "./game-runtime-helpers.js";
import { autoStartNextHand } from "./game-hand-lifecycle.js";
import { emitLog } from "../logger.js";

/**
 * @typedef {import('./deck.js').Card} Card
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./game.js').Phase} Phase
 * @typedef {import('./game-hand-lifecycle.js').FinalizedHand} FinalizedHand
 */

/**
 * @param {Game} game
 * @param {import('./showdown.js').PotResult[]} potResults
 * @returns {{ winnerSeat: import('./seat.js').OccupiedSeat, seatIndex: number, amount: number, handRank: string|null, isSplit: boolean } | null}
 */
function getWinnerInfo(game, potResults) {
  if (potResults.length === 0) return null;

  const mainPot = /** @type {import('./showdown.js').PotResult} */ (
    potResults[0]
  );
  if (mainPot.winners.length === 0) return null;

  const isSplit = mainPot.winners.length > 1;
  const seatIndex = /** @type {number} */ (mainPot.winners[0]);
  const winnerSeat = /** @type {import('./seat.js').OccupiedSeat} */ (
    game.seats[seatIndex]
  );
  const amount = mainPot.awards.reduce((sum, award) => sum + award.amount, 0);
  const handRank = mainPot.winningHand
    ? HandRankings.formatHand(mainPot.winningHand)
    : null;
  return { winnerSeat, seatIndex, amount, handRank, isSplit };
}

/**
 * @param {Game} game
 * @param {string} winnerName
 * @param {string} wonBy
 * @param {number} amount
 */
function logHandEnded(game, winnerName, wonBy, amount) {
  if (!game.handLog) return;

  Object.assign(game.handLog.context, {
    winner: { name: winnerName, wonBy, amount },
  });
  emitLog(game.handLog);
  game.handLog = null;
}

/**
 * @param {Game} game
 * @returns {FinalizedHand | null}
 */
function handleFoldWin(game) {
  const result = Showdown.awardToLastPlayer(game);
  if (result.winner !== -1) {
    const winnerSeat = /** @type {import('./seat.js').OccupiedSeat} */ (
      game.seats[result.winner]
    );
    const winnerName = winnerSeat.player.name || `Seat ${result.winner + 1}`;

    game.winnerMessage = {
      playerName: winnerName,
      handRank: null,
      amount: result.amount,
      isSplit: false,
    };

    game.pendingHandHistory = [
      {
        potAmount: result.amount,
        winners: [result.winner],
        winningHand: null,
        winningCards: null,
        awards: [{ seat: result.winner, amount: result.amount }],
      },
    ];

    logHandEnded(game, winnerName, "fold", result.amount);
  }

  Actions.endHand(game);
  return autoStartNextHand(game);
}

/**
 * @param {Game} game
 */
function recordShowdownCards(game) {
  for (const seat of game.seats) {
    if (
      !seat.empty &&
      !seat.folded &&
      !seat.sittingOut &&
      seat.cards.length > 0
    ) {
      HandHistory.recordShowdown(game.id, seat.player.id, seat.cards, true);
    }
  }
}

/**
 * @param {Game} game
 * @returns {FinalizedHand | null}
 */
function handleShowdown(game) {
  const gen = Showdown.showdown(game);
  let result = gen.next();
  while (!result.done) {
    result = gen.next();
  }
  const potResults = result.value;

  HandHistory.recordStreet(game.id, "showdown");
  recordShowdownCards(game);

  const winnerInfo = getWinnerInfo(game, potResults);
  if (winnerInfo) {
    const winnerName =
      winnerInfo.winnerSeat.player.name || `Seat ${winnerInfo.seatIndex + 1}`;
    game.winnerMessage = {
      playerName: winnerInfo.isSplit ? null : winnerName,
      handRank: winnerInfo.handRank,
      amount: winnerInfo.amount,
      isSplit: winnerInfo.isSplit,
    };
    logHandEnded(
      game,
      winnerName,
      winnerInfo.handRank || "showdown",
      winnerInfo.amount,
    );
  }

  game.pendingHandHistory = potResults;
  Actions.endHand(game);
  return autoStartNextHand(game);
}

/** @type {Record<string, { next: Phase, deal: (game: Game) => Generator, getCards: (game: Game) => Card[] }>} */
const STREET_HANDLERS = {
  preflop: {
    next: "flop",
    deal: Actions.dealFlop,
    getCards: (game) => game.board.cards,
  },
  flop: {
    next: "turn",
    deal: Actions.dealTurn,
    getCards: (game) => [/** @type {Card} */ (game.board.cards[3])],
  },
  turn: {
    next: "river",
    deal: Actions.dealRiver,
    getCards: (game) => [/** @type {Card} */ (game.board.cards[4])],
  },
};

/**
 * @param {Game} game
 * @returns {FinalizedHand | null}
 */
export function processGameFlow(game) {
  const phase = game.hand.phase;
  if (!["preflop", "flop", "turn", "river"].includes(phase)) {
    return null;
  }

  if (autoFoldSittingOutActingPlayers(game)) {
    resetActingTicks(game);
  }
  executePreActions(game);

  if (Betting.countActivePlayers(game) <= 1) {
    return handleFoldWin(game);
  }

  if (game.hand.actingSeat !== -1) {
    return null;
  }

  game.collectingBets = { active: false, delayTicks: 1 };
  return null;
}

/**
 * @param {Game} game
 * @returns {FinalizedHand | null}
 */
export function finishCollectBets(game) {
  const phase = game.hand.phase;
  game.collectingBets = null;

  Betting.collectBets(game);

  if (phase === "river") {
    return handleShowdown(game);
  }

  if (Betting.countPlayersWhoCanAct(game) <= 1) {
    game.runout = { active: true, delayTicks: RUNOUT_DELAY_TICKS };
    return null;
  }

  const handler = STREET_HANDLERS[phase];
  if (!handler) return null;

  runAll(handler.deal(game));
  HandHistory.recordStreet(game.id, handler.next, handler.getCards(game));
  Betting.startBettingRound(game, handler.next);

  if (autoFoldSittingOutActingPlayers(game)) {
    resetActingTicks(game);
  }
  executePreActions(game);
  return processGameFlow(game);
}

/**
 * @param {Game} game
 * @returns {FinalizedHand | null}
 */
export function dealRunoutStreet(game) {
  const phase = game.hand.phase;
  if (phase === "river") {
    return handleShowdown(game);
  }

  const handler = STREET_HANDLERS[phase];
  if (handler) {
    runAll(handler.deal(game));
    HandHistory.recordStreet(game.id, handler.next, handler.getCards(game));
    game.hand.phase = handler.next;
  }

  game.runout = { active: true, delayTicks: RUNOUT_DELAY_TICKS };
  return null;
}
