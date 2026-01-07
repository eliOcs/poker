import * as Deck from "./deck.js";
import * as Seat from "./seat.js";

/**
 * @typedef {import('./deck.js').Card} Card
 * @typedef {import('./seat.js').Seat} Seat
 */

/**
 * @typedef {'waiting'|'preflop'|'flop'|'turn'|'river'|'showdown'} Phase
 */

/**
 * @typedef {object} Blinds
 * @property {number} ante - Ante amount
 * @property {number} small - Small blind amount
 * @property {number} big - Big blind amount
 */

/**
 * @typedef {object} Board
 * @property {Card[]} cards - Community cards
 */

/**
 * @typedef {object} Hand
 * @property {Phase} phase - Current phase of the hand
 * @property {number} pot - Total chips in pot
 * @property {number} currentBet - Highest bet in current round
 * @property {number} lastRaiser - Seat index of last raiser (-1 if none)
 * @property {number} actingSeat - Seat index of player to act (-1 if none)
 * @property {number} lastRaiseSize - Size of the last raise (for min-raise calculation)
 * @property {number|null} actingSince - Timestamp when current player started acting
 * @property {number|null} clockCalledAt - Timestamp when clock was called (null if not called)
 */

/**
 * @typedef {object} WinnerMessage
 * @property {string} playerName - Winner's player name/ID
 * @property {string|null} handRank - Winning hand description (null if won by fold)
 * @property {number} amount - Amount won
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
 * @property {number|null} countdown - Countdown seconds until hand starts (null if not counting)
 * @property {NodeJS.Timeout|null} countdownTimer - Timer ID for countdown interval
 * @property {WinnerMessage|null} winnerMessage - Winner info to display after hand ends
 * @property {NodeJS.Timeout|null} disconnectTimer - Timer for auto-action on disconnected player
 * @property {number} disconnectTimerSeat - Seat index for disconnect timer (-1 if none)
 * @property {NodeJS.Timeout|null} clockTimer - Timer for call the clock countdown
 */

/**
 * @typedef {object} GameOptions
 * @property {number} [seats] - Number of seats
 * @property {Blinds} [blinds] - Blind structure
 */

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
    actingSince: null,
    clockCalledAt: null,
  };
}

/**
 * Creates a new game
 * @param {GameOptions} [options] - Game options
 * @returns {Game}
 */
export function create({
  seats: numberOfSeats = 6,
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
    countdownTimer: null,
    winnerMessage: null,
    disconnectTimer: null,
    disconnectTimerSeat: -1,
    clockTimer: null,
  };
}
