import { describe, it } from "node:test";
import * as assert from "assert";
import * as Game from "../../src/poker/game.js";
import * as Player from "../../src/poker/player.js";
import * as Actions from "../../src/poker/actions.js";
import playerView from "../../src/poker/player-view.js";

describe("Player View", function () {
  describe("Seat", function () {
    it("add sit action to empty seats", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      const p2 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });
      const p2View = playerView(g, p2);
      assert.deepEqual(p2View.seats[0].actions, []);
      assert.deepEqual(p2View.seats[1].actions, [{ action: "sit", seat: 1 }]);
    });
  });

  describe("winnerMessage", function () {
    it("should include winnerMessage when set", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });

      g.winnerMessage = {
        playerName: "player1",
        handRank: "Pair of Aces",
        amount: 100,
      };

      const view = playerView(g, p1);

      assert.deepEqual(view.winnerMessage, {
        playerName: "player1",
        handRank: "Pair of Aces",
        amount: 100,
      });
    });

    it("should be null when no winner message", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });

      const view = playerView(g, p1);

      assert.equal(view.winnerMessage, null);
    });

    it("should include winnerMessage without handRank for fold wins", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });

      g.winnerMessage = {
        playerName: "player1",
        handRank: null,
        amount: 75,
      };

      const view = playerView(g, p1);

      assert.equal(view.winnerMessage.playerName, "player1");
      assert.equal(view.winnerMessage.handRank, null);
      assert.equal(view.winnerMessage.amount, 75);
    });
  });
});
