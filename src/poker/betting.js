import * as Seat from "./seat.js";
import { nextIndex, findIndex } from "./circular-array.js";

/**
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./game.js').Phase} Phase
 */

/**
 * Counts players still active in the hand (not folded)
 * @param {Game} game
 * @returns {number}
 */
export function countActivePlayers(game) {
  return game.seats.filter(Seat.isActive).length;
}

/**
 * Counts players who can still act (not folded and not all-in)
 * @param {Game} game
 * @returns {number}
 */
export function countPlayersWhoCanAct(game) {
  return game.seats.filter(Seat.canAct).length;
}

/**
 * Gets the index of the small blind seat
 * @param {Game} game
 * @returns {number}
 */
export function getSmallBlindSeat(game) {
  const activePlayers = game.seats.filter(Seat.isActive).length;

  // Heads-up: button is small blind
  if (activePlayers === 2) {
    return findIndex(game.seats, Seat.isActive, game.button);
  }

  // Normal: first active player after button
  return findIndex(
    game.seats,
    Seat.isActive,
    nextIndex(game.seats, game.button),
  );
}

/**
 * Gets the index of the big blind seat
 * @param {Game} game
 * @returns {number}
 */
export function getBigBlindSeat(game) {
  const smallBlind = getSmallBlindSeat(game);
  return findIndex(
    game.seats,
    Seat.isActive,
    nextIndex(game.seats, smallBlind),
  );
}

/**
 * Gets the first player to act in a betting round
 * @param {Game} game
 * @param {Phase} phase - 'preflop', 'flop', 'turn', or 'river'
 * @returns {number} - Seat index
 */
export function getFirstToAct(game, phase) {
  if (phase === "preflop") {
    // Preflop: first player after big blind
    const bigBlind = getBigBlindSeat(game);
    return findIndex(game.seats, Seat.canAct, nextIndex(game.seats, bigBlind));
  }

  // Postflop: first active player after button
  return findIndex(game.seats, Seat.canAct, nextIndex(game.seats, game.button));
}

/**
 * Gets the next player to act after current
 * @param {Game} game
 * @returns {number} - Seat index, or -1 if no one can act
 */
export function getNextToAct(game) {
  if (game.hand.actingSeat === -1) {
    return -1;
  }

  const next = findIndex(
    game.seats,
    Seat.canAct,
    nextIndex(game.seats, game.hand.actingSeat),
  );

  // If we've come back to the same seat, no one else can act
  if (next === game.hand.actingSeat) {
    return -1;
  }

  return next;
}

/**
 * Gets the minimum bet amount
 * @param {Game} game
 * @returns {number}
 */
export function getMinBet(game) {
  return game.blinds.big;
}

/**
 * Gets the minimum raise amount (total bet, not raise increment)
 * @param {Game} game
 * @returns {number}
 */
export function getMinRaise(game) {
  const raiseSize = Math.max(game.hand.lastRaiseSize, game.blinds.big);
  return game.hand.currentBet + raiseSize;
}

/**
 * Gets the amount needed to call for a specific seat
 * @param {Game} game
 * @param {number} seatIndex
 * @returns {number}
 */
export function getCallAmount(game, seatIndex) {
  const seat = game.seats[seatIndex];
  if (seat.empty) return 0;
  return Math.min(game.hand.currentBet - seat.bet, seat.stack);
}

/**
 * Checks if the betting round is complete
 * @param {Game} game
 * @returns {boolean}
 */
export function isBettingRoundComplete(game) {
  const activePlayers = countActivePlayers(game);

  // Only one player left - hand is over
  if (activePlayers <= 1) {
    return true;
  }

  // All remaining players are all-in
  if (countPlayersWhoCanAct(game) === 0) {
    return true;
  }

  // Check if all active players have acted and bets are equal
  for (const seat of game.seats) {
    if (!Seat.isActive(seat)) continue;
    const activeSeat = /** @type {import('./seat.js').OccupiedSeat} */ (seat);
    if (activeSeat.allIn) continue;

    // Player hasn't matched the current bet
    if (activeSeat.bet !== game.hand.currentBet) {
      return false;
    }
  }

  // If we have a last raiser and current player is back to them, round is complete
  if (
    game.hand.lastRaiser !== -1 &&
    game.hand.actingSeat === game.hand.lastRaiser
  ) {
    return true;
  }

  // If no one raised (all checks) and we're back to first actor, round is complete
  if (game.hand.lastRaiser === -1 && game.hand.actingSeat === -1) {
    return true;
  }

  return false;
}

/**
 * Initializes the betting round state
 * @param {Game} game
 * @param {Phase} phase
 */
export function startBettingRound(game, phase) {
  game.hand.phase = phase;

  // Reset bets for postflop rounds
  if (phase !== "preflop") {
    for (const seat of game.seats) {
      if (!seat.empty) {
        seat.bet = 0;
      }
    }
    game.hand.currentBet = 0;
  }

  game.hand.lastRaiser = -1;
  game.hand.lastRaiseSize = phase === "preflop" ? game.blinds.big : 0;
  game.hand.actingSeat = getFirstToAct(game, phase);
}

/**
 * Collects all bets into the pot and resets for next round
 * @param {Game} game
 */
export function collectBets(game) {
  for (const seat of game.seats) {
    if (!seat.empty) {
      game.hand.pot += seat.bet;
      seat.totalInvested += seat.bet;
      seat.bet = 0;
    }
  }
  game.hand.currentBet = 0;
  game.hand.lastRaiser = -1;
  game.hand.lastRaiseSize = 0;
}

/**
 * Advances to the next player after an action
 * @param {Game} game
 */
export function advanceAction(game) {
  // Check for immediate termination conditions
  if (countActivePlayers(game) <= 1) {
    game.hand.actingSeat = -1;
    return;
  }

  // If no one can act anymore (all all-in or folded)
  if (countPlayersWhoCanAct(game) === 0) {
    game.hand.actingSeat = -1;
    return;
  }

  // Find next player to act
  const next = getNextToAct(game);

  // Check if we've come full circle back to the raiser
  if (game.hand.lastRaiser !== -1 && next === game.hand.lastRaiser) {
    game.hand.actingSeat = -1;
    return;
  }

  game.hand.actingSeat = next;
}
