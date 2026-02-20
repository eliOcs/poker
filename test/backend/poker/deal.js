import { describe, it, before } from "node:test";
import assert from "assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as User from "../../../src/backend/user.js";
import * as Player from "../../../src/backend/poker/player.js";
import {
  buyIn,
  dealFlop,
  dealPreflop,
  sit,
  sitOut,
  sitIn,
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
      buyIn(g, { seat: 0, amount: 100 });
      sit(g, { seat: 1, player: createPlayer() });
      buyIn(g, { seat: 1, amount: 100 });
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

  describe("player joins with $0 stack in cash game", function () {
    it("should not be dealt cards if they have not bought in", function () {
      const game = Game.create();
      sit(game, { seat: 0, player: createPlayer() });
      buyIn(game, { seat: 0, amount: 100 });
      sit(game, { seat: 1, player: createPlayer() });
      buyIn(game, { seat: 1, amount: 100 });
      // Third player joins but does not buy in
      sit(game, { seat: 2, player: createPlayer() });

      const gen = dealPreflop(game);
      while (!gen.next().done);

      assert.equal(
        game.seats[2].cards?.length ?? 0,
        0,
        "player with $0 stack should not be dealt cards",
      );
    });

    it("should be dealt cards after buying in", function () {
      const game = Game.create();
      sit(game, { seat: 0, player: createPlayer() });
      buyIn(game, { seat: 0, amount: 100 });
      sit(game, { seat: 1, player: createPlayer() });
      buyIn(game, { seat: 1, amount: 100 });
      sit(game, { seat: 2, player: createPlayer() });
      buyIn(game, { seat: 2, amount: 100 });

      const gen = dealPreflop(game);
      while (!gen.next().done);

      assert.equal(
        game.seats[2].cards?.length,
        2,
        "player who bought in should be dealt cards",
      );
    });
  });

  describe("player sits out and back in with chips", function () {
    it("should not be dealt cards while sitting out", function () {
      const game = Game.create();
      sit(game, { seat: 0, player: createPlayer() });
      buyIn(game, { seat: 0, amount: 100 });
      sit(game, { seat: 1, player: createPlayer() });
      buyIn(game, { seat: 1, amount: 100 });
      sitOut(game, { seat: 0 });

      const gen = dealPreflop(game);
      while (!gen.next().done);

      assert.equal(
        game.seats[0].cards?.length ?? 0,
        0,
        "sitting out player should not be dealt cards",
      );
    });

    it("should be dealt cards after sitting back in", function () {
      const game = Game.create();
      sit(game, { seat: 0, player: createPlayer() });
      buyIn(game, { seat: 0, amount: 100 });
      sit(game, { seat: 1, player: createPlayer() });
      buyIn(game, { seat: 1, amount: 100 });
      sitOut(game, { seat: 0 });
      sitIn(game, { seat: 0 });

      const gen = dealPreflop(game);
      while (!gen.next().done);

      assert.equal(
        game.seats[0].cards?.length,
        2,
        "player who sat back in should be dealt cards",
      );
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
