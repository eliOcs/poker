import joi from "joi";
import assert from "assert";
import * as game from "../../src/poker2/game.js";
import * as player from "../../src/poker2/player.js";
import { dealPreflop, seat } from "../../src/poker2/actions.js";
import * as deck from "../../src/poker2/deck.js";

function assertCard(card) {
  joi.assert(card, deck.cardSchema, "expected card");
}

describe("dealPreflop", function () {
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
