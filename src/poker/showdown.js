import HandRankings from "./hand-rankings.js";
import * as Pots from "./pots.js";
import * as Seat from "./seat.js";
import { nextIndex } from "./circular-array.js";

/**
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./deck.js').Card} Card
 * @typedef {import('./seat.js').Seat} SeatType
 * @typedef {import('./seat.js').OccupiedSeat} OccupiedSeat
 * @typedef {import('./pots.js').Pot} Pot
 * @typedef {import('./pots.js').Award} Award
 * @typedef {import('./hand-rankings.js').EvaluatedHand} EvaluatedHand
 */

/**
 * @typedef {object} HandResult
 * @property {number} seat - Seat index
 * @property {EvaluatedHand} hand - Evaluated hand from hand-rankings
 */

/**
 * @typedef {object} WinnerResult
 * @property {number[]} winners - Seat indices of winners
 * @property {EvaluatedHand|null} winningHand - The winning hand (for display)
 */

/**
 * @typedef {object} PotResult
 * @property {number} potAmount - Amount in this pot
 * @property {number[]} winners - Seat indices of winners
 * @property {EvaluatedHand|null} winningHand - The winning hand (for display)
 * @property {Award[]} awards - Array of { seat, amount } for each winner
 */

/**
 * @typedef {object} LastPlayerResult
 * @property {number} winner - Seat index of winner
 * @property {number} amount - Amount won
 */

/**
 * Evaluates the best hand for a seat given the board
 * @param {OccupiedSeat} seat - Seat object with cards
 * @param {Card[]} boardCards - Community cards
 * @returns {EvaluatedHand|null} - Evaluated hand or null if no cards
 */
export function evaluateHand(seat, boardCards) {
  if (!seat.cards || seat.cards.length === 0) {
    return null;
  }

  const allCards = [...seat.cards, ...boardCards];
  return HandRankings.bestCombination(allCards);
}

/**
 * Gets all hands for active players
 * @param {Game} game
 * @returns {HandResult[]}
 */
export function getActiveHands(game) {
  const hands = [];

  for (let i = 0; i < game.seats.length; i++) {
    const seat = game.seats[i];
    if (Seat.isActive(seat)) {
      const occupiedSeat = /** @type {OccupiedSeat} */ (seat);
      const hand = evaluateHand(occupiedSeat, game.board.cards);
      if (hand) {
        hands.push({ seat: i, hand });
      }
    }
  }

  return hands;
}

/**
 * Determines winners for a specific pot
 * @param {Pot} pot - Pot with eligibleSeats
 * @param {HandResult[]} hands - All evaluated hands
 * @returns {WinnerResult} - { winners: number[], winningHand: EvaluatedHand|null }
 */
export function determineWinnersForPot(pot, hands) {
  // Filter to only eligible players
  const eligible = hands.filter((h) => pot.eligibleSeats.includes(h.seat));

  if (eligible.length === 0) {
    return { winners: [], winningHand: null };
  }

  if (eligible.length === 1) {
    return { winners: [eligible[0].seat], winningHand: eligible[0].hand };
  }

  // Sort by hand strength (best first - compare returns negative if first is better)
  eligible.sort((a, b) => HandRankings.compare(a.hand, b.hand));

  const winners = [eligible[0].seat];
  const winningHand = eligible[0].hand;

  // Find all players with equal hands (ties)
  for (let i = 1; i < eligible.length; i++) {
    if (HandRankings.compare(eligible[0].hand, eligible[i].hand) === 0) {
      winners.push(eligible[i].seat);
    } else {
      break; // Hands are sorted, so we can stop
    }
  }

  return { winners, winningHand };
}

/**
 * Runs the complete showdown and distributes pots
 * @param {Game} game
 * @returns {PotResult[]} - Results for each pot
 */
export function runShowdown(game) {
  // Calculate all pots
  const pots = Pots.calculatePots(game.seats);

  if (pots.length === 0) {
    return [];
  }

  // Get all hands
  const hands = getActiveHands(game);

  const results = [];

  for (const pot of pots) {
    const { winners, winningHand } = determineWinnersForPot(pot, hands);

    // Award the pot
    const awards = Pots.awardPot(pot, winners, game.seats);

    results.push({
      potAmount: pot.amount,
      winners,
      winningHand,
      awards,
    });
  }

  return results;
}

/**
 * Generator for showdown with yields for animation
 * @param {Game} game
 * @returns {Generator<void|PotResult, PotResult[]>}
 */
export function* showdown(game) {
  game.hand.phase = "showdown";

  // First, collect any remaining bets
  for (const seat of game.seats) {
    if (!seat.empty) {
      game.hand.pot += seat.bet;
      seat.totalInvested += seat.bet;
      seat.bet = 0;
    }
  }

  yield; // Pause for pot collection animation

  // Run showdown and get results
  const results = runShowdown(game);

  // Yield after each pot is awarded (for animation)
  for (const result of results) {
    yield result;
  }

  return results;
}

/**
 * Awards pot to last remaining player (everyone else folded)
 * @param {Game} game
 * @returns {LastPlayerResult} - { winner: number, amount: number }
 */
export function awardToLastPlayer(game) {
  // Find the active player
  let winner = -1;
  for (let i = 0; i < game.seats.length; i++) {
    if (Seat.isActive(game.seats[i])) {
      winner = i;
      break;
    }
  }

  if (winner === -1) {
    return { winner: -1, amount: 0 };
  }

  // Collect all bets into pot
  let totalPot = game.hand.pot;
  for (const seat of game.seats) {
    if (!seat.empty) {
      totalPot += seat.bet;
      seat.totalInvested += seat.bet;
      seat.bet = 0;
    }
  }

  // Award to winner
  const winnerSeat = /** @type {OccupiedSeat} */ (game.seats[winner]);
  winnerSeat.stack += totalPot;
  game.hand.pot = 0;

  return { winner, amount: totalPot };
}
