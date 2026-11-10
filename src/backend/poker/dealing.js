import * as Deck from "./deck.js";
import * as Betting from "./betting.js";

/**
 * @typedef {import('./game.js').Game} Game
 * @typedef {import('./seat.js').Seat} SeatType
 * @typedef {import('./seat.js').OccupiedSeat} OccupiedSeat
 */

/**
 * Creates an iterator over seats matching a predicate
 * @param {Game} game
 * @param {(seat: SeatType) => boolean} predicate
 * @returns {Generator<OccupiedSeat>}
 */
export function* createSeatIterator(game, predicate) {
  /**
   * @param {number} index
   * @returns {number}
   */
  function nextSeat(index) {
    return (index + 1) % game.seats.length;
  }

  const start = nextSeat(game.button);
  let current = start;
  do {
    const currentSeat = /** @type {SeatType} */ (game.seats[current]);
    if (predicate(currentSeat)) {
      yield /** @type {OccupiedSeat} */ (currentSeat);
    }
  } while ((current = nextSeat(current)) !== start);
}

/**
 * Posts blinds
 * @param {Game} game
 * @returns {Generator<void>}
 */
export function* blinds(game) {
  // Calculate both blind seats upfront (before any state changes)
  const sbSeat = Betting.getSmallBlindSeat(game);
  const bbSeat = Betting.getBigBlindSeat(game);

  postBlind(
    /** @type {OccupiedSeat} */ (game.seats[sbSeat]),
    game.blinds.small,
  );
  yield;

  postBlind(/** @type {OccupiedSeat} */ (game.seats[bbSeat]), game.blinds.big);
  yield;
}

/**
 * Posts a blind, or the whole stack if it is short, which puts the player
 * all-in before any action.
 * @param {OccupiedSeat} seat
 * @param {import('./types.js').Cents} blind
 */
function postBlind(seat, blind) {
  const amount = Math.min(blind, seat.stack);
  seat.bet = amount;
  seat.stack -= amount;
  if (seat.stack === 0) seat.allIn = true;
}

/**
 * Deals preflop cards to all players
 * @param {Game} game
 * @returns {Generator<void>}
 */
export function* dealPreflop(game) {
  for (const seat of createSeatIterator(
    game,
    (seat) => !seat.empty && (!seat.sittingOut || seat.bet > 0),
  )) {
    seat.cards = [Deck.deal(game.deck)];
    yield;
  }
  for (const seat of createSeatIterator(
    game,
    (seat) => !seat.empty && (!seat.sittingOut || seat.bet > 0),
  )) {
    seat.cards.push(Deck.deal(game.deck));
    yield;
  }
}

/**
 * Deals the flop (3 community cards)
 * @param {Game} game
 * @returns {Generator<void>}
 */
export function* dealFlop(game) {
  game.board.cards = [];
  for (let i = 0; i < 3; i += 1) {
    game.board.cards.push(Deck.deal(game.deck));
    yield;
  }
}

/**
 * Deals the turn (4th community card)
 * @param {Game} game
 * @returns {Generator<void>}
 */
export function* dealTurn(game) {
  game.board.cards.push(Deck.deal(game.deck));
  yield;
}

/**
 * Deals the river (5th community card)
 * @param {Game} game
 * @returns {Generator<void>}
 */
export function* dealRiver(game) {
  game.board.cards.push(Deck.deal(game.deck));
  yield;
}
