import * as Seat from "./seat.js";
import * as Deck from "./deck.js";
import * as Betting from "./betting.js";
import { isClockCallable } from "./game-tick.js";

// Re-export dealing functions for backward compatibility
export {
  blinds,
  dealPreflop,
  dealFlop,
  dealTurn,
  dealRiver,
} from "./dealing.js";

/**
 * @typedef {import('./types.js').Cents} Cents
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./seat.js').Player} Player
 * @typedef {import('./seat.js').Seat} SeatType
 * @typedef {import('./seat.js').OccupiedSeat} OccupiedSeat
 */

/**
 * Counts players with chips who can play
 * @param {Game} game
 * @returns {number}
 */
export function countPlayersWithChips(game) {
  return game.seats.filter(
    (seat) => !seat.empty && seat.stack > 0 && !seat.sittingOut,
  ).length;
}

/**
 * Starts countdown to begin a new hand
 * @param {Game} game
 */
export function start(game) {
  if (game.hand.phase !== "waiting") {
    throw new Error("hand already in progress");
  }
  if (game.countdown !== null) {
    throw new Error("countdown already started");
  }
  if (countPlayersWithChips(game) < 2) {
    throw new Error("need at least 2 players with chips");
  }
  // Cannot start during tournament break
  if (game.tournament?.onBreak) {
    throw new Error("cannot start during break");
  }
  game.countdown = 5;
}

/**
 * Sits a player at a seat
 * @param {Game} game
 * @param {{ seat: number, player: Player }} options
 */
export function sit(game, { seat, player }) {
  if (game.seats[seat].empty) {
    const playerSeat = game.seats.findIndex(
      (s) => !s.empty && s.player === player,
    );
    if (playerSeat !== -1) {
      game.seats[playerSeat] = Seat.empty();
    }
    game.seats[seat] = Seat.occupied(player);

    // For tournaments, automatically give starting stack
    if (game.tournament?.active) {
      const seatObj = /** @type {OccupiedSeat} */ (game.seats[seat]);
      seatObj.stack = game.tournament.initialStack;
      seatObj.totalBuyIn = game.tournament.initialStack;
    }
  } else {
    throw new Error("seat is already occupied");
  }
}

/**
 * Buys in a player for an amount (adds to existing stack)
 * @param {Game} game
 * @param {{ seat: number, amount: number }} options
 */
export function buyIn(game, { seat, amount }) {
  // No buy-in allowed in tournaments
  if (game.tournament?.active) {
    throw new Error("buy-in not allowed in tournaments");
  }

  const seatObj = game.seats[seat];
  if (!seatObj.empty) {
    const chipAmount = game.blinds.big * amount;
    seatObj.stack += chipAmount;
    seatObj.totalBuyIn += chipAmount;
  } else {
    throw new Error("seat is empty");
  }
}

// --- Betting Actions ---

/**
 * Player checks (passes without betting)
 * @param {Game} game
 * @param {{ seat: number }} options
 */
export function check(game, { seat }) {
  const seatObj = /** @type {OccupiedSeat} */ (game.seats[seat]);

  if (seat !== game.hand.actingSeat) {
    throw new Error("not your turn");
  }
  if (seatObj.bet !== game.hand.currentBet) {
    throw new Error("cannot check - there is a bet to call");
  }

  seatObj.lastAction = "check";
  Betting.advanceAction(game);
}

/**
 * Player places a bet
 * @param {Game} game
 * @param {{ seat: number, amount: Cents }} options
 */
export function bet(game, { seat, amount }) {
  const seatObj = /** @type {OccupiedSeat} */ (game.seats[seat]);

  if (seat !== game.hand.actingSeat) {
    throw new Error("not your turn");
  }
  if (game.hand.currentBet !== 0) {
    throw new Error("cannot bet - there is already a bet");
  }
  if (amount < game.blinds.big) {
    throw new Error("bet must be at least the big blind");
  }
  if (amount > seatObj.stack) {
    throw new Error("bet cannot exceed stack");
  }

  seatObj.stack -= amount;
  seatObj.bet = amount;
  game.hand.currentBet = amount;
  game.hand.lastRaiser = seat;
  game.hand.lastRaiseSize = amount;

  if (seatObj.stack === 0) {
    seatObj.allIn = true;
    seatObj.lastAction = "all-in";
  } else {
    seatObj.lastAction = "bet";
  }

  Betting.advanceAction(game);
}

/**
 * Player calls the current bet
 * @param {Game} game
 * @param {{ seat: number }} options
 */
export function call(game, { seat }) {
  const seatObj = /** @type {OccupiedSeat} */ (game.seats[seat]);

  if (seat !== game.hand.actingSeat) {
    throw new Error("not your turn");
  }

  const toCall = Betting.getCallAmount(game, seat);

  if (toCall === 0) {
    throw new Error("nothing to call");
  }

  seatObj.stack -= toCall;
  seatObj.bet += toCall;

  if (seatObj.stack === 0) {
    seatObj.allIn = true;
    seatObj.lastAction = "all-in";
  } else {
    seatObj.lastAction = "call";
  }

  Betting.advanceAction(game);
}

/**
 * Player raises the bet
 * @param {Game} game
 * @param {{ seat: number, amount: Cents }} options
 */
export function raise(game, { seat, amount }) {
  const seatObj = /** @type {OccupiedSeat} */ (game.seats[seat]);

  if (seat !== game.hand.actingSeat) {
    throw new Error("not your turn");
  }

  const minRaise = Betting.getMinRaise(game);
  if (amount < minRaise) {
    throw new Error(`raise must be at least ${minRaise}`);
  }

  const totalToAdd = amount - seatObj.bet;
  if (totalToAdd > seatObj.stack) {
    throw new Error("raise cannot exceed stack");
  }

  const raiseSize = amount - game.hand.currentBet;

  seatObj.stack -= totalToAdd;
  seatObj.bet = amount;
  game.hand.currentBet = amount;
  game.hand.lastRaiser = seat;
  game.hand.lastRaiseSize = raiseSize;

  if (seatObj.stack === 0) {
    seatObj.allIn = true;
    seatObj.lastAction = "all-in";
  } else {
    seatObj.lastAction = "raise";
  }

  Betting.advanceAction(game);
}

/**
 * Player folds their hand
 * @param {Game} game
 * @param {{ seat: number }} options
 */
export function fold(game, { seat }) {
  const seatObj = /** @type {OccupiedSeat} */ (game.seats[seat]);

  if (seat !== game.hand.actingSeat) {
    throw new Error("not your turn");
  }

  seatObj.folded = true;
  seatObj.cards = [];
  seatObj.lastAction = "fold";

  Betting.advanceAction(game);
}

/**
 * Player goes all-in
 * @param {Game} game
 * @param {{ seat: number }} options
 */
export function allIn(game, { seat }) {
  const seatObj = /** @type {OccupiedSeat} */ (game.seats[seat]);

  if (seat !== game.hand.actingSeat) {
    throw new Error("not your turn");
  }

  const allInAmount = seatObj.stack;
  const newBet = seatObj.bet + allInAmount;

  seatObj.stack = 0;
  seatObj.bet = newBet;
  seatObj.allIn = true;
  seatObj.lastAction = "all-in";

  // Only update current bet and raiser if this is a raise
  if (newBet > game.hand.currentBet) {
    const raiseSize = newBet - game.hand.currentBet;

    // Only counts as a raise if it's at least a min-raise
    // (otherwise it's just a call/incomplete raise)
    if (raiseSize >= game.hand.lastRaiseSize) {
      game.hand.lastRaiser = seat;
      game.hand.lastRaiseSize = raiseSize;
    }

    game.hand.currentBet = newBet;
  }

  Betting.advanceAction(game);
}

// --- Hand Flow ---

/**
 * Starts a new hand
 * @param {Game} game
 */
export function startHand(game) {
  if (countPlayersWithChips(game) < 2) {
    throw new Error("need at least 2 players with chips to start a hand");
  }

  // Reset deck
  game.deck = Deck.create();

  // Reset board
  game.board.cards = [];

  // Reset hand state
  game.hand.phase = "preflop";
  game.hand.pot = 0;
  game.hand.currentBet = 0;
  game.hand.lastRaiser = -1;
  game.hand.actingSeat = -1;
  game.hand.lastRaiseSize = 0;

  // Reset each occupied seat for new hand
  for (const seat of game.seats) {
    if (!seat.empty) {
      Seat.resetForNewHand(seat);
    }
  }
}

/**
 * Ends the current hand and moves button
 * @param {Game} game
 */
export function endHand(game) {
  game.hand.phase = "waiting";
  game.hand.pot = 0;
  game.hand.currentBet = 0;
  game.hand.lastRaiser = -1;
  game.hand.actingSeat = -1;
  game.hand.lastRaiseSize = 0;

  // Increment handsPlayed for all players who were dealt in (not sitting out)
  for (const seat of game.seats) {
    if (!seat.empty && !seat.sittingOut) {
      seat.handsPlayed++;
    }
  }

  // Auto sit-out players with 0 stack (and mark busted in tournaments)
  for (const seat of game.seats) {
    if (!seat.empty && seat.stack === 0 && !seat.sittingOut) {
      seat.sittingOut = true;
      // In tournaments, record the busted position
      if (game.tournament?.active) {
        // Position = number of players still with chips + 1
        const playersWithChips = countPlayersWithChips(game);
        seat.bustedPosition = playersWithChips + 1;
      }
    }
  }

  // Move button to next occupied seat
  moveButton(game);
}

/**
 * Moves the dealer button to the next occupied seat
 * @param {Game} game
 */
export function moveButton(game) {
  const seats = game.seats;
  let next = (game.button + 1) % seats.length;

  // Find next occupied seat that isn't sitting out
  while (next !== game.button) {
    const seat = seats[next];
    if (!seat.empty && !seat.sittingOut) {
      break;
    }
    next = (next + 1) % seats.length;
  }

  game.button = next;
}

// --- Sit Out Actions ---

/**
 * Player sits out (takes a break, won't be dealt into hands)
 * @param {Game} game
 * @param {{ seat: number }} options
 */
export function sitOut(game, { seat }) {
  const seatObj = /** @type {OccupiedSeat} */ (game.seats[seat]);

  if (seatObj.empty) {
    throw new Error("seat is empty");
  }
  if (game.hand?.phase !== "waiting") {
    throw new Error("can only sit out between hands");
  }
  if (seatObj.sittingOut) {
    throw new Error("already sitting out");
  }

  seatObj.sittingOut = true;
}

/**
 * Player sits back in (returns from break, posts big blind)
 * @param {Game} game
 * @param {{ seat: number }} options
 */
export function sitIn(game, { seat }) {
  const seatObj = /** @type {OccupiedSeat} */ (game.seats[seat]);

  if (seatObj.empty) {
    throw new Error("seat is empty");
  }
  if (game.hand?.phase !== "waiting") {
    throw new Error("can only sit in between hands");
  }
  if (!seatObj.sittingOut) {
    throw new Error("not sitting out");
  }

  // Must post big blind to return if missed
  if (seatObj.missedBigBlind) {
    if (seatObj.stack < game.blinds.big) {
      throw new Error("not enough chips to post big blind");
    }
    seatObj.stack -= game.blinds.big;
    // The posted blind goes to the pot when the next hand starts
    seatObj.bet = game.blinds.big;
    seatObj.missedBigBlind = false;
  }

  seatObj.sittingOut = false;
}

/**
 * Player leaves the table (must be sitting out first)
 * @param {Game} game
 * @param {{ seat: number }} options
 */
export function leave(game, { seat }) {
  // Cannot leave during a tournament
  if (game.tournament?.active) {
    throw new Error("cannot leave during a tournament");
  }

  const seatObj = game.seats[seat];

  if (seatObj.empty) {
    throw new Error("seat is empty");
  }
  if (!seatObj.sittingOut) {
    throw new Error("must be sitting out to leave");
  }

  // Make the seat empty (chips are cashed out)
  game.seats[seat] = Seat.empty();
}

// --- Clock Actions ---

/**
 * Calls the clock on the acting player (starts 30 second countdown)
 * @param {Game} game
 * @param {{ seat: number }} options
 */
export function callClock(game, { seat }) {
  const seatObj = game.seats[seat];

  if (seatObj.empty) {
    throw new Error("seat is empty");
  }

  if (game.hand.actingSeat === -1) {
    throw new Error("no one is acting");
  }

  if (seat === game.hand.actingSeat) {
    throw new Error("cannot call clock on yourself");
  }

  if (!isClockCallable(game)) {
    if (game.clockTicks > 0) {
      throw new Error("clock already called");
    }
    throw new Error("must wait 60 seconds before calling clock");
  }
}
