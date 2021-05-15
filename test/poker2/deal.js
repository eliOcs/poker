import joi from "joi";
import assert from "assert";
import * as game from "../../src/poker2/game.js";
import * as player from "../../src/poker2/player.js";
import { deal, seat } from "../../src/poker2/actions.js";
import * as deck from "../../src/poker2/deck.js";

function assertCard(card) {
  joi.assert(card, deck.cardSchema, "expected card");
}

describe("deal", function () {
  describe("preflop", function () {
    it("should deal 2 cards to each player", function () {
      let g = game.create();
      const p1 = player.create();
      const p2 = player.create();
      g = seat(g, { seat: 0, player: p1 });
      g = seat(g, { seat: 1, player: p2 });
      g = deal.preflop.start(g);
      g = deal.preflop.next(g);
      assert.equal(g.seats[1].cards.length, 1);
      assertCard(g.seats[1].cards[0]);

      g = deal.preflop.next(g);
      assert.equal(g.seats[0].cards.length, 1);
      assertCard(g.seats[0].cards[0]);

      g = deal.preflop.next(g);
      assert.equal(g.seats[1].cards.length, 2);
      assertCard(g.seats[1].cards[1]);

      g = deal.preflop.next(g);
      assert.equal(g.seats[0].cards.length, 2);
      assertCard(g.seats[0].cards[1]);
    });
  });
});
