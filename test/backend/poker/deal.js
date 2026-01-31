import { describe, it, before } from "node:test";
import assert from "assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as User from "../../../src/backend/user.js";
import * as Player from "../../../src/backend/poker/player.js";
import {
  dealFlop,
  dealPreflop,
  sit,
} from "../../../src/backend/poker/actions.js";
import { isValidCard } from "../../../src/backend/poker/deck.js";

/** Helper to create a test player */
function createPlayer() {
  return Player.fromUser(User.create());
}

function assertCard(card) {
  assert.ok(isValidCard(card), `Expected valid card, got: ${card}`);
}

describe("deal", function () {
  describe("preflop", function () {
    let g;
    let dp;

    before(function () {
      g = Game.create();
      sit(g, { seat: 0, player: createPlayer() });
      sit(g, { seat: 1, player: createPlayer() });
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
      const g = Game.create();
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
