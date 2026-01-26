import * as Deck from "./deck.js";
import * as Seat from "./seat.js";
import * as Betting from "./betting.js";
import * as Showdown from "./showdown.js";
import * as Actions from "./actions.js";
import * as HandHistory from "./hand-history/index.js";
import HandRankings from "./hand-rankings.js";
import { tick, shouldTickBeRunning, resetActingTicks } from "./game-tick.js";
import * as logger from "../logger.js";

/**
 * @typedef {import('./types.js').Cents} Cents
 * @typedef {import('./deck.js').Card} Card
 * @typedef {import('./seat.js').Seat} Seat
 * @typedef {import('./seat.js').Player} PlayerType
 */

/**
 * @typedef {'waiting'|'preflop'|'flop'|'turn'|'river'|'showdown'} Phase
 */

/**
 * @typedef {object} Blinds
 * @property {Cents} ante - Ante amount
 * @property {Cents} small - Small blind amount
 * @property {Cents} big - Big blind amount
 */

/**
 * @typedef {object} Board
 * @property {Card[]} cards - Community cards
 */

/**
 * @typedef {object} Hand
 * @property {Phase} phase - Current phase of the hand
 * @property {Cents} pot - Total chips in pot
 * @property {Cents} currentBet - Highest bet in current round
 * @property {number} lastRaiser - Seat index of last raiser (-1 if none)
 * @property {number} actingSeat - Seat index of player to act (-1 if none)
 * @property {Cents} lastRaiseSize - Size of the last raise (for min-raise calculation)
 */

/**
 * @typedef {object} WinnerMessage
 * @property {string} playerName - Winner's player name/ID
 * @property {string|null} handRank - Winning hand description (null if won by fold)
 * @property {Cents} amount - Amount won
 */

/**
 * @typedef {object} Game
 * @property {boolean} running - Whether game is running
 * @property {number} button - Dealer button position (seat index)
 * @property {Blinds} blinds - Blind structure
 * @property {Seat[]} seats - Array of seats
 * @property {Card[]} deck - Current deck
 * @property {Board} board - Community cards
 * @property {Hand} hand - Current hand state
 * @property {number|null} countdown - Countdown ticks until hand starts (null if not counting)
 * @property {NodeJS.Timeout|null} tickTimer - Unified game tick timer (1 second interval)
 * @property {WinnerMessage|null} winnerMessage - Winner info to display after hand ends
 * @property {number} actingTicks - Ticks the current player has been acting (for call clock availability)
 * @property {number} disconnectedActingTicks - Ticks a disconnected player has been acting (for auto-fold)
 * @property {number} clockTicks - Ticks since clock was called (for clock expiry)
 */

/**
 * @typedef {object} GameOptions
 * @property {number} [seats] - Number of seats
 * @property {Blinds} [blinds] - Blind structure
 */

// Timer interval in ms (can be reduced via TIMER_SPEED env var for faster e2e tests)
export const TIMER_INTERVAL = process.env.TIMER_SPEED
  ? Math.floor(1000 / parseInt(process.env.TIMER_SPEED, 10))
  : 1000;

/** @param {Generator} gen */
function runAll(gen) {
  while (!gen.next().done);
}

/**
 * Creates initial hand state
 * @returns {Hand}
 */
export function createHand() {
  return {
    phase: "waiting",
    pot: 0,
    currentBet: 0,
    lastRaiser: -1,
    actingSeat: -1,
    lastRaiseSize: 0,
  };
}

/**
 * Creates a new game
 * @param {GameOptions} [options] - Game options
 * @returns {Game}
 */
export function create({
  seats: numberOfSeats = 9,
  blinds = { ante: 5, small: 25, big: 50 },
} = {}) {
  /** @type {Seat[]} */
  const seats = [];
  for (let i = 0; i < numberOfSeats; i += 1) {
    seats.push(Seat.empty());
  }
  return {
    running: true,
    button: 0,
    blinds,
    seats,
    deck: Deck.create(),
    board: { cards: [] },
    hand: createHand(),
    countdown: null,
    tickTimer: null,
    winnerMessage: null,
    actingTicks: 0,
    disconnectedActingTicks: 0,
    clockTicks: 0,
  };
}

/**
 * @param {Game} game
 * @param {PlayerType} player
 * @returns {number} Seat index or -1 if not found
 */
export function findPlayerSeatIndex(game, player) {
  return game.seats.findIndex(
    (seat) => !seat.empty && seat.player?.id === player.id,
  );
}

/** @param {Game} game */
export function sitOutDisconnectedPlayers(game) {
  for (const seat of game.seats) {
    if (!seat.empty && seat.disconnected && !seat.sittingOut) {
      seat.sittingOut = true;
    }
  }
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
 * @param {string} gameId
 * @param {(gameId: string) => void} onBroadcast - Callback to broadcast game state
 */
export function startGameTick(game, gameId, onBroadcast) {
  if (game.tickTimer) {
    return; // Already running
  }

  game.tickTimer = setInterval(() => {
    const result = tick(game);

    // Handle startHand event
    if (result.startHand) {
      startHand(game, gameId);
    }

    // Handle auto-action (disconnect or clock expiry)
    if (result.autoActionSeat !== null) {
      performAutoAction(game, gameId, result.autoActionSeat, onBroadcast);
    }

    // Stop tick if no longer needed
    if (result.shouldStopTick) {
      stopGameTick(game);
    }

    // Broadcast state to all clients
    if (result.shouldBroadcast) {
      onBroadcast(gameId);
    }
  }, TIMER_INTERVAL);
}

/**
 * @param {Game} game
 * @param {string} gameId
 * @param {(gameId: string) => void} onBroadcast - Callback to broadcast game state
 */
export function ensureGameTick(game, gameId, onBroadcast) {
  if (shouldTickBeRunning(game) && !game.tickTimer) {
    startGameTick(game, gameId, onBroadcast);
  }
}

/**
 * @param {Game} game
 * @param {string} gameId
 */
export function startHand(game, gameId) {
  // Check if we still have enough players (someone might have sat out)
  if (Actions.countPlayersWithChips(game) < 2) {
    return;
  }

  game.winnerMessage = null;
  Actions.startHand(game);
  HandHistory.startHand(gameId, game);

  const playerCount = game.seats.filter(
    (s) => !s.empty && !s.sittingOut,
  ).length;
  logger.info("hand started", {
    gameId,
    handNumber: HandHistory.getHandNumber(gameId),
    playerCount,
  });

  const sbSeat = Betting.getSmallBlindSeat(game);
  const bbSeat = Betting.getBigBlindSeat(game);
  runAll(Actions.blinds(game));

  const sbPlayer = /** @type {import('./seat.js').OccupiedSeat} */ (
    game.seats[sbSeat]
  );
  const bbPlayer = /** @type {import('./seat.js').OccupiedSeat} */ (
    game.seats[bbSeat]
  );
  HandHistory.recordBlind(gameId, sbPlayer.player.id, "sb", sbPlayer.bet);
  HandHistory.recordBlind(gameId, bbPlayer.player.id, "bb", bbPlayer.bet);

  runAll(Actions.dealPreflop(game));

  for (const seat of game.seats) {
    if (!seat.empty && !seat.sittingOut && seat.cards.length > 0) {
      HandHistory.recordDealtCards(gameId, seat.player.id, seat.cards);
    }
  }

  Betting.startBettingRound(game, "preflop");
  game.hand.currentBet = game.blinds.big; // Blinds already posted
  resetActingTicks(game);
}

/**
 * @param {Game} game
 * @param {string} gameId
 * @param {(gameId: string) => void} [onBroadcast] - Callback to broadcast game state
 */
export function autoStartNextHand(game, gameId, onBroadcast) {
  sitOutDisconnectedPlayers(game);

  if (Actions.countPlayersWithChips(game) >= 2) {
    game.countdown = 3; // Shorter countdown between hands
    if (onBroadcast) {
      startGameTick(game, gameId, onBroadcast);
    }
  }
}

/**
 * @param {Game} game
 * @param {string} gameId
 * @param {number} seatIndex
 * @param {(gameId: string) => void} [onBroadcast] - Callback to broadcast game state
 */
export function performAutoAction(game, gameId, seatIndex, onBroadcast) {
  const seat = game.seats[seatIndex];
  if (seat.empty) return;

  // Auto check/fold: check if possible, otherwise fold
  if (seat.bet === game.hand.currentBet) {
    Actions.check(game, { seat: seatIndex });
    HandHistory.recordAction(gameId, seat.player.id, "check");
  } else {
    Actions.fold(game, { seat: seatIndex });
    HandHistory.recordAction(gameId, seat.player.id, "fold");
  }

  // Reset tick counters since action was taken
  resetActingTicks(game);

  // Process game flow after the auto-action
  processGameFlow(game, gameId, onBroadcast);
}

/**
 * Gets winner info from pot results
 * @param {Game} game
 * @param {import('./showdown.js').PotResult[]} potResults
 * @returns {{ winnerSeat: import('./seat.js').OccupiedSeat, seatIndex: number, amount: number, handRank: string|null } | null}
 */
function getWinnerInfo(game, potResults) {
  if (potResults.length === 0 || potResults[0].winners.length === 0) {
    return null;
  }
  const mainPot = potResults[0];
  const seatIndex = mainPot.winners[0];
  const winnerSeat = /** @type {import('./seat.js').OccupiedSeat} */ (
    game.seats[seatIndex]
  );
  const amount = mainPot.awards.reduce((sum, a) => sum + a.amount, 0);
  const handRank = mainPot.winningHand
    ? HandRankings.formatHand(mainPot.winningHand)
    : null;
  return { winnerSeat, seatIndex, amount, handRank };
}

/**
 * Logs hand ended event
 * @param {string} gameId
 * @param {string} winnerName
 * @param {string} wonBy
 * @param {number} amount
 */
function logHandEnded(gameId, winnerName, wonBy, amount) {
  logger.info("hand ended", {
    gameId,
    handNumber: HandHistory.getHandNumber(gameId),
    winner: winnerName,
    wonBy,
    amount,
  });
}

/**
 * Handles fold victory (all other players folded)
 * @param {Game} game
 * @param {string} gameId
 * @param {(gameId: string) => void} [onBroadcast]
 */
function handleFoldWin(game, gameId, onBroadcast) {
  const result = Showdown.awardToLastPlayer(game);
  if (result.winner !== -1) {
    const winnerSeat = /** @type {import('./seat.js').OccupiedSeat} */ (
      game.seats[result.winner]
    );
    const winnerName = winnerSeat.player?.name || `Seat ${result.winner + 1}`;

    game.winnerMessage = {
      playerName: winnerName,
      handRank: null,
      amount: result.amount,
    };

    HandHistory.finalizeHand(gameId, game, [
      {
        potAmount: result.amount,
        winners: [result.winner],
        winningHand: null,
        winningCards: null,
        awards: [{ seat: result.winner, amount: result.amount }],
      },
    ]);

    logHandEnded(gameId, winnerName, "fold", result.amount);
  }
  Actions.endHand(game);
  autoStartNextHand(game, gameId, onBroadcast);
}

/**
 * Records showdown cards for active players
 * @param {Game} game
 * @param {string} gameId
 */
function recordShowdownCards(game, gameId) {
  for (const seat of game.seats) {
    if (
      !seat.empty &&
      !seat.folded &&
      !seat.sittingOut &&
      seat.cards.length > 0
    ) {
      HandHistory.recordShowdown(gameId, seat.player.id, seat.cards, true);
    }
  }
}

/**
 * Handles showdown at river
 * @param {Game} game
 * @param {string} gameId
 * @param {(gameId: string) => void} [onBroadcast]
 */
function handleShowdown(game, gameId, onBroadcast) {
  const gen = Showdown.showdown(game);
  let result = gen.next();
  while (!result.done) {
    result = gen.next();
  }
  const potResults = result.value || [];

  recordShowdownCards(game, gameId);

  const winnerInfo = getWinnerInfo(game, potResults);
  if (winnerInfo) {
    const winnerName =
      winnerInfo.winnerSeat.player?.name || `Seat ${winnerInfo.seatIndex + 1}`;
    game.winnerMessage = {
      playerName: winnerName,
      handRank: winnerInfo.handRank,
      amount: winnerInfo.amount,
    };
    logHandEnded(
      gameId,
      winnerName,
      winnerInfo.handRank || "showdown",
      winnerInfo.amount,
    );
  }

  HandHistory.finalizeHand(gameId, game, potResults);
  Actions.endHand(game);
  autoStartNextHand(game, gameId, onBroadcast);
}

/** @type {Record<string, { next: Phase, deal: (game: Game) => Generator, getCards: (game: Game) => Card[] }>} */
const STREET_HANDLERS = {
  preflop: {
    next: "flop",
    deal: Actions.dealFlop,
    getCards: (g) => g.board.cards,
  },
  flop: {
    next: "turn",
    deal: Actions.dealTurn,
    getCards: (g) => [g.board.cards[3]],
  },
  turn: {
    next: "river",
    deal: Actions.dealRiver,
    getCards: (g) => [g.board.cards[4]],
  },
};

/**
 * Advances to next phase, loops through streets when everyone is all-in
 * @param {Game} game
 * @param {string} gameId
 * @param {(gameId: string) => void} [onBroadcast] - Callback to broadcast game state
 */
export function processGameFlow(game, gameId, onBroadcast) {
  // Loop to handle all-in situations where we need to run out the board
  while (true) {
    const phase = game.hand.phase;

    // Only process if we're in a betting phase
    if (!["preflop", "flop", "turn", "river"].includes(phase)) {
      return;
    }

    // Check if only one player remains (everyone else folded)
    if (Betting.countActivePlayers(game) <= 1) {
      handleFoldWin(game, gameId, onBroadcast);
      return;
    }

    // Check if betting round is complete
    if (game.hand.actingSeat !== -1) {
      return;
    }

    Betting.collectBets(game);

    // Handle river (showdown) separately
    if (phase === "river") {
      handleShowdown(game, gameId, onBroadcast);
      return;
    }

    // Advance to next street using dispatch map
    const handler = STREET_HANDLERS[phase];
    if (handler) {
      runAll(handler.deal(game));
      HandHistory.recordStreet(gameId, handler.next, handler.getCards(game));
      Betting.startBettingRound(game, handler.next);
    }

    // If actingSeat is still -1 after starting new round (everyone all-in),
    // continue looping to deal next street
  }
}
