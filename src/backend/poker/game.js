import * as Id from "../id.js";
import * as Deck from "./deck.js";
import * as Seat from "./seat.js";
import * as Betting from "./betting.js";
import * as Showdown from "./showdown.js";
import * as Actions from "./actions.js";
import * as HandHistory from "./hand-history/index.js";
import * as TournamentSummary from "./tournament-summary.js";
import HandRankings from "./hand-rankings.js";
import { tick, shouldTickBeRunning, resetActingTicks } from "./game-tick.js";
import * as logger from "../logger.js";
import * as Tournament from "../../shared/tournament.js";

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
 * @typedef {object} TournamentState
 * @property {boolean} active - Whether this is a tournament game
 * @property {number} level - Current blind level (1-7)
 * @property {number} levelTicks - Ticks elapsed in current level
 * @property {boolean} onBreak - Currently in break period
 * @property {boolean} pendingBreak - Break will start after current hand ends
 * @property {number} breakTicks - Ticks elapsed in current break
 * @property {string|null} startTime - Tournament start time (ISO string)
 * @property {number} initialStack - Starting stack for each player
 * @property {number|null} winner - Seat index of tournament winner (null if ongoing)
 * @property {Cents} buyIn - Buy-in amount in cents
 */

/**
 * @typedef {object} RunoutState
 * @property {boolean} active - Whether runout is in progress
 * @property {number} delayTicks - Ticks remaining before dealing next street
 */

/**
 * @typedef {object} Game
 * @property {import('../id.js').Id} id - Game unique identifier
 * @property {boolean} running - Whether game is running
 * @property {number} button - Dealer button position (seat index)
 * @property {Blinds} blinds - Blind structure
 * @property {Seat[]} seats - Array of seats
 * @property {Card[]} deck - Current deck
 * @property {Board} board - Community cards
 * @property {Hand} hand - Current hand state
 * @property {number} handNumber - Current hand number (0 before first hand)
 * @property {number|null} countdown - Countdown ticks until hand starts (null if not counting)
 * @property {NodeJS.Timeout|null} tickTimer - Unified game tick timer (1 second interval)
 * @property {WinnerMessage|null} winnerMessage - Winner info to display after hand ends
 * @property {number} actingTicks - Ticks the current player has been acting (for call clock availability)
 * @property {number} disconnectedActingTicks - Ticks a disconnected player has been acting (for auto-fold)
 * @property {number} clockTicks - Ticks since clock was called (for clock expiry)
 * @property {TournamentState|null} tournament - Tournament state (null for cash games)
 * @property {RunoutState|null} runout - Runout state for all-in scenarios (null if not running out)
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

// Delay in ticks between dealing streets during runout (all-in scenario)
export const RUNOUT_DELAY_TICKS = 2;

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
  const id = Id.generate();
  /** @type {Seat[]} */
  const seats = [];
  for (let i = 0; i < numberOfSeats; i += 1) {
    seats.push(Seat.empty());
  }
  return {
    id,
    running: true,
    button: 0,
    blinds,
    seats,
    deck: Deck.create(),
    board: { cards: [] },
    hand: createHand(),
    handNumber: 0,
    countdown: null,
    tickTimer: null,
    winnerMessage: null,
    actingTicks: 0,
    disconnectedActingTicks: 0,
    clockTicks: 0,
    tournament: null,
    runout: null,
  };
}

/**
 * @typedef {object} TournamentOptions
 * @property {number} [seats] - Number of seats (default: 6)
 * @property {Cents} [buyIn] - Buy-in amount in cents
 */

/**
 * Creates a new tournament game
 * @param {TournamentOptions} [options] - Tournament options
 * @returns {Game}
 */
export function createTournament({
  seats: numberOfSeats = Tournament.DEFAULT_SEATS,
  buyIn = Tournament.DEFAULT_BUYIN.amount,
} = {}) {
  const level1Blinds = Tournament.getBlindsForLevel(1);
  const blinds = {
    ante: level1Blinds.ante,
    small: level1Blinds.small,
    big: level1Blinds.big,
  };

  const game = create({ seats: numberOfSeats, blinds });

  game.tournament = {
    active: true,
    level: 1,
    levelTicks: 0,
    onBreak: false,
    pendingBreak: false,
    breakTicks: 0,
    startTime: null,
    initialStack: Tournament.INITIAL_STACK,
    winner: null,
    buyIn,
  };

  return game;
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
 * @param {(gameId: string) => void} onBroadcast - Callback to broadcast game state
 */
export function startGameTick(game, onBroadcast) {
  if (game.tickTimer) {
    return; // Already running
  }

  game.tickTimer = setInterval(() => {
    const result = tick(game);

    // Handle startHand event
    if (result.startHand) {
      startHand(game);
    }

    // Handle auto-action (disconnect or clock expiry)
    if (result.autoActionSeat !== null) {
      performAutoAction(game, result.autoActionSeat, onBroadcast);
    }

    // Handle runout street dealing
    if (result.dealNextStreet) {
      dealRunoutStreet(game, onBroadcast);
    }

    // Stop tick if no longer needed
    if (!shouldTickBeRunning(game)) {
      stopGameTick(game);
    }

    // Broadcast state to all clients
    if (result.shouldBroadcast) {
      onBroadcast(game.id);
    }
  }, TIMER_INTERVAL);
}

/**
 * @param {Game} game
 * @param {(gameId: string) => void} onBroadcast - Callback to broadcast game state
 */
export function ensureGameTick(game, onBroadcast) {
  if (shouldTickBeRunning(game) && !game.tickTimer) {
    startGameTick(game, onBroadcast);
  }
}

/**
 * @param {Game} game
 */
export function startHand(game) {
  // Check if we still have enough players (someone might have sat out)
  if (Actions.countPlayersWithChips(game) < 2) {
    return;
  }

  game.winnerMessage = null;
  game.handNumber++;
  Actions.startHand(game);
  HandHistory.startHand(game);

  // Mark tournament start time on first hand
  if (game.tournament?.active && !game.tournament.startTime) {
    game.tournament.startTime = new Date().toISOString();
  }
  TournamentSummary.startTournament(game);

  const playerCount = game.seats.filter(
    (s) => !s.empty && !s.sittingOut,
  ).length;
  logger.info("hand started", {
    gameId: game.id,
    handNumber: game.handNumber,
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
  HandHistory.recordBlind(game.id, sbPlayer.player.id, "sb", sbPlayer.bet);
  HandHistory.recordBlind(game.id, bbPlayer.player.id, "bb", bbPlayer.bet);

  runAll(Actions.dealPreflop(game));

  for (const seat of game.seats) {
    if (!seat.empty && !seat.sittingOut && seat.cards.length > 0) {
      HandHistory.recordDealtCards(game.id, seat.player.id, seat.cards);
    }
  }

  Betting.startBettingRound(game, "preflop");
  game.hand.currentBet = game.blinds.big; // Blinds already posted
  resetActingTicks(game);
}

/**
 * @param {Game} game
 * @param {(gameId: string) => void} [onBroadcast] - Callback to broadcast game state
 */
export function autoStartNextHand(game, onBroadcast) {
  sitOutDisconnectedPlayers(game);

  const playersWithChips = Actions.countPlayersWithChips(game);

  // Check for tournament winner
  if (
    game.tournament?.active &&
    game.tournament.winner === null &&
    playersWithChips === 1
  ) {
    const winnerIndex = game.seats.findIndex(
      (s) => !s.empty && s.stack > 0 && !s.sittingOut,
    );
    game.tournament.winner = winnerIndex;
    TournamentSummary.finalizeTournament(game);
    return;
  }

  if (playersWithChips >= 2) {
    game.countdown = 5; // Countdown between hands
    if (onBroadcast) {
      startGameTick(game, onBroadcast);
    }
  }
}

/**
 * @param {Game} game
 * @param {number} seatIndex
 * @param {(gameId: string) => void} [onBroadcast] - Callback to broadcast game state
 */
export function performAutoAction(game, seatIndex, onBroadcast) {
  const seat = game.seats[seatIndex];
  if (seat.empty) return;

  // Auto check/fold: check if possible, otherwise fold
  if (seat.bet === game.hand.currentBet) {
    Actions.check(game, { seat: seatIndex });
    HandHistory.recordAction(game.id, seat.player.id, "check");
  } else {
    Actions.fold(game, { seat: seatIndex });
    HandHistory.recordAction(game.id, seat.player.id, "fold");
  }

  // Reset tick counters since action was taken
  resetActingTicks(game);

  // Process game flow after the auto-action
  processGameFlow(game, onBroadcast);
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
 * @param {Game} game
 * @param {string} winnerName
 * @param {string} wonBy
 * @param {number} amount
 */
function logHandEnded(game, winnerName, wonBy, amount) {
  logger.info("hand ended", {
    gameId: game.id,
    handNumber: game.handNumber,
    winner: winnerName,
    wonBy,
    amount,
  });
}

/**
 * Handles fold victory (all other players folded)
 * @param {Game} game
 * @param {(gameId: string) => void} [onBroadcast]
 */
function handleFoldWin(game, onBroadcast) {
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

    HandHistory.finalizeHand(game, [
      {
        potAmount: result.amount,
        winners: [result.winner],
        winningHand: null,
        winningCards: null,
        awards: [{ seat: result.winner, amount: result.amount }],
      },
    ]);

    logHandEnded(game, winnerName, "fold", result.amount);
  }
  Actions.endHand(game);
  autoStartNextHand(game, onBroadcast);
}

/**
 * Records showdown cards for active players
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
 * Handles showdown at river
 * @param {Game} game
 * @param {(gameId: string) => void} [onBroadcast]
 */
function handleShowdown(game, onBroadcast) {
  const gen = Showdown.showdown(game);
  let result = gen.next();
  while (!result.done) {
    result = gen.next();
  }
  const potResults = result.value || [];

  recordShowdownCards(game);

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
      game,
      winnerName,
      winnerInfo.handRank || "showdown",
      winnerInfo.amount,
    );
  }

  HandHistory.finalizeHand(game, potResults);
  Actions.endHand(game);
  autoStartNextHand(game, onBroadcast);
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
 * Advances to next phase, enters runout mode when everyone is all-in
 * @param {Game} game
 * @param {(gameId: string) => void} [onBroadcast] - Callback to broadcast game state
 */
export function processGameFlow(game, onBroadcast) {
  const phase = game.hand.phase;

  // Only process if we're in a betting phase
  if (!["preflop", "flop", "turn", "river"].includes(phase)) {
    return;
  }

  // Check if only one player remains (everyone else folded)
  if (Betting.countActivePlayers(game) <= 1) {
    handleFoldWin(game, onBroadcast);
    return;
  }

  // Check if betting round is complete
  if (game.hand.actingSeat !== -1) {
    return;
  }

  Betting.collectBets(game);

  // Handle river (showdown) separately
  if (phase === "river") {
    handleShowdown(game, onBroadcast);
    return;
  }

  // Check if everyone is all-in - enter runout mode
  if (Betting.countPlayersWhoCanAct(game) <= 1) {
    game.runout = { active: true, delayTicks: RUNOUT_DELAY_TICKS };
    if (onBroadcast) {
      ensureGameTick(game, onBroadcast);
    }
    return;
  }

  // Normal: advance to next street
  const handler = STREET_HANDLERS[phase];
  if (handler) {
    runAll(handler.deal(game));
    HandHistory.recordStreet(game.id, handler.next, handler.getCards(game));
    Betting.startBettingRound(game, handler.next);
  }
}

/**
 * Deals next street during runout (all-in scenario)
 * @param {Game} game
 * @param {(gameId: string) => void} [onBroadcast] - Callback to broadcast game state
 */
export function dealRunoutStreet(game, onBroadcast) {
  const phase = game.hand.phase;

  // Handle river -> showdown
  if (phase === "river") {
    handleShowdown(game, onBroadcast);
    return;
  }

  // Deal next street
  const handler = STREET_HANDLERS[phase];
  if (handler) {
    runAll(handler.deal(game));
    HandHistory.recordStreet(game.id, handler.next, handler.getCards(game));
    game.hand.phase = handler.next;
  }

  // Reset delay for next street
  game.runout = { active: true, delayTicks: RUNOUT_DELAY_TICKS };

  if (onBroadcast) onBroadcast(game.id);
}
