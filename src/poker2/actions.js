import { findIndex, nextIndex } from "./circular-array.js";
import * as deck from "./deck.js";

export function seat(game, { seat, player }) {
  game.seats[seat] = { player };
  return game;
}

function nextPlayer(game, from) {
  return findIndex(
    game.seats,
    (seat) => seat.player,
    nextIndex(game.seats, from)
  );
}

export const deal = {
  preflop: {
    start: function (game) {
      game.actions["deal.preflop"] = { next: nextPlayer(game, game.button) };
      return game;
    },
    next: function (game) {
      const seat = game.seats[game.actions["deal.preflop"].next];

      if (seat.cards && seat.cards.length === 2) {
        delete game.actions["deal.preflop"];
      }

      const { remaining, dealt } = deck.deal(game.deck);
      game.deck = remaining;
      if (seat.cards) {
        seat.cards.push(dealt[0]);
      } else {
        seat.cards = dealt;
      }

      game.actions["deal.preflop"].next = nextPlayer(
        game,
        game.actions["deal.preflop"].next
      );

      return game;
    },
  },
};
