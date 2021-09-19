import * as deck from "./deck.js";

export function seat(game, { seat, player }) {
  game.seats[seat] = { player };
}

export function buyIn(game, { seat, amount }) {
  game.seats[seat].stack = amount;
}

function* createSeatIterator(game, predicate) {
  function nextSeat(index) {
    return (index + 1) % game.seats.length;
  }

  const start = nextSeat(game.button);
  let current = start;
  do {
    if (predicate(game.seats[current])) {
      yield game.seats[current];
    }
  } while ((current = nextSeat(current)) !== start);
}

export function* blinds(game) {
  const seatIterator = createSeatIterator(game, (seat) => seat.player);
  seatIterator.next().value.bet = game.blinds.small;
  yield;
  seatIterator.next().value.bet = game.blinds.big;
  yield;
}

export function* dealPreflop(game) {
  for (const seat of createSeatIterator(game, (seat) => seat.player)) {
    seat.cards = [deck.deal(game.deck)];
    yield;
  }
  for (const seat of createSeatIterator(game, (seat) => seat.player)) {
    seat.cards.push(deck.deal(game.deck));
    yield;
  }
}

export function* dealFlop(game) {
  game.board.cards = [];
  for (let i = 0; i <= 3; i += 1) {
    game.board.cards.push(deck.deal(game.deck));
    yield;
  }
}
