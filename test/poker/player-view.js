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

  describe("card visibility", function () {
    it("shows opponent cards when they have a handResult (post-showdown)", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      const p2 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });

      // Simulate post-showdown state
      g.hand = { phase: "waiting", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = [
        { rank: "ace", suit: "spades" },
        { rank: "king", suit: "hearts" },
      ];
      g.seats[1].cards = [
        { rank: "queen", suit: "diamonds" },
        { rank: "jack", suit: "clubs" },
      ];
      // Both players have hand results (participated in showdown)
      g.seats[0].handResult = 100;
      g.seats[1].handResult = -100;

      const view = playerView(g, p1);

      // Own cards should be visible
      assert.equal(view.seats[0].cards[0].rank, "ace");
      // Opponent cards should also be visible (they have handResult)
      assert.equal(view.seats[1].cards[0].rank, "queen");
      assert.equal(view.seats[1].cards[1].rank, "jack");
    });

    it("hides opponent cards when they have no handResult (folded)", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      const p2 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });

      // Simulate post-hand state where opponent folded
      g.hand = { phase: "waiting", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = [
        { rank: "ace", suit: "spades" },
        { rank: "king", suit: "hearts" },
      ];
      g.seats[1].cards = [
        { rank: "queen", suit: "diamonds" },
        { rank: "jack", suit: "clubs" },
      ];
      // Only winner has hand result (opponent folded)
      g.seats[0].handResult = 100;
      g.seats[1].handResult = null;

      const view = playerView(g, p1);

      // Own cards should be visible
      assert.equal(view.seats[0].cards[0].rank, "ace");
      // Opponent cards should be hidden (no handResult)
      assert.equal(view.seats[1].cards[0].hidden, true);
      assert.equal(view.seats[1].cards[1].hidden, true);
    });

    it("shows all cards during showdown phase", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      const p2 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });

      g.hand = { phase: "showdown", pot: 200, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = [
        { rank: "ace", suit: "spades" },
        { rank: "king", suit: "hearts" },
      ];
      g.seats[1].cards = [
        { rank: "queen", suit: "diamonds" },
        { rank: "jack", suit: "clubs" },
      ];

      const view = playerView(g, p1);

      // All cards should be visible during showdown phase
      assert.equal(view.seats[0].cards[0].rank, "ace");
      assert.equal(view.seats[1].cards[0].rank, "queen");
    });
  });
});
