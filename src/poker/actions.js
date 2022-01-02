import * as deck from "./deck.js";

export function seat(game, { seat, player }) {
  if (game.seats[seat] === "empty") {
    const playerSeat = game.seats.findIndex((seat) => seat.player === player);
    if (playerSeat != -1) {
      game.seats[playerSeat] = "empty";
    }
    game.seats[seat] = { player };
  } else {
    throw new Error("seat is already occupied");
  }
}

export function buyIn(game, { player, amount }) {
  const playerSeat = game.seats.findIndex((seat) => seat.player === player);
  if (playerSeat !== -1) {
    game.seats[seat].stack = game.blinds.big * amount;
  } else {
    throw new Error("player is not seated");
  }
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
