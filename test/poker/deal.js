import joi from "joi";
import assert from "assert";
import * as game from "../../src/poker/game.js";
import * as player from "../../src/poker/player.js";
import { dealFlop, dealPreflop, seat } from "../../src/poker/actions.js";
import { cardSchema } from "../../src/poker/deck.js";

function assertCard(card) {
  joi.assert(card, cardSchema, "expected card");
}

describe("deal", function () {
  describe("preflop", function () {
    let g;
    let dp;

    before(function () {
      g = game.create();
      seat(g, { seat: 0, player: player.create() });
      seat(g, { seat: 1, player: player.create() });
      dp = dealPreflop(g);
    });

    it("should deal first card to each player", function () {
      dp.next();
      assert.equal(g.seats[1].cards.length, 1);
      assertCard(g.seats[1].cards[0]);

      dp.next();
      assert.equal(g.seats[0].cards.length, 1);
      assertCard(g.seats[0].cards[0]);
    });

    it("should deal second card to each player", function () {
      dp.next();
      assert.equal(g.seats[1].cards.length, 2);
      assertCard(g.seats[1].cards[1]);

      dp.next();
      assert.equal(g.seats[0].cards.length, 2);
      assertCard(g.seats[0].cards[1]);
    });
  });

  describe("flop", function () {
    it("should deal flop", function () {
      const g = game.create();
      const dp = dealFlop(g);

      dp.next();
      assert.equal(g.board.cards.length, 1);
      assertCard(g.board.cards[0]);

      dp.next();
      assert.equal(g.board.cards.length, 2);
      assertCard(g.board.cards[1]);

      dp.next();
      assert.equal(g.board.cards.length, 3);
      assertCard(g.board.cards[2]);
    });
  });
});
