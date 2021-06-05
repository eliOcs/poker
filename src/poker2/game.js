import * as deck from "./deck.js";

export function create({
  seats: numberOfSeats = 6,
  blinds = { ante: 5, small: 25, big: 50 },
} = {}) {
  const seats = [];
  for (let i = 0; i < numberOfSeats; i += 1) {
    seats.push("empty");
  }
  return {
    button: 0,
    blinds,
    seats,
    deck: deck.create(),
  };
}

/**
 *  hand
 *    preflop
 *      blinds
 *      deal
 *      betting round
 *    flop
 *      deal
 *      betting round
 *    river
 *      deal
 *      betting round
 *    end
 *      winner
 *      move button
 */
