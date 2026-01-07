import { describe, it } from "node:test";
import * as assert from "assert";
import * as Game from "../../src/backend/poker/game.js";
import * as Player from "../../src/backend/poker/player.js";
import * as Actions from "../../src/backend/poker/actions.js";
import playerView from "../../src/backend/poker/player-view.js";

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

  describe("handRank calculation", function () {
    it("calculates handRank for 7 cards (2 hole + 5 board)", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });

      g.hand = { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = [
        { rank: "ace", suit: "spades" },
        { rank: "ace", suit: "hearts" },
      ];
      g.board = {
        cards: [
          { rank: "ace", suit: "clubs" },
          { rank: "king", suit: "diamonds" },
          { rank: "9", suit: "clubs" },
          { rank: "5", suit: "hearts" },
          { rank: "2", suit: "spades" },
        ],
      };

      const view = playerView(g, p1);

      assert.ok(view.seats[0].handRank);
      assert.ok(view.seats[0].handRank.includes("Three"));
      assert.ok(view.seats[0].handRank.includes("A"));
    });

    it("calculates flush correctly with 7 cards", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });

      g.hand = { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = [
        { rank: "ace", suit: "hearts" },
        { rank: "2", suit: "hearts" },
      ];
      g.board = {
        cards: [
          { rank: "king", suit: "hearts" },
          { rank: "queen", suit: "hearts" },
          { rank: "jack", suit: "hearts" },
          { rank: "5", suit: "spades" },
          { rank: "3", suit: "diamonds" },
        ],
      };

      const view = playerView(g, p1);

      assert.ok(view.seats[0].handRank);
      assert.ok(view.seats[0].handRank.includes("Flush"));
    });

    it("calculates straight correctly with 7 cards", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });

      g.hand = { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = [
        { rank: "9", suit: "spades" },
        { rank: "8", suit: "hearts" },
      ];
      g.board = {
        cards: [
          { rank: "7", suit: "clubs" },
          { rank: "6", suit: "diamonds" },
          { rank: "5", suit: "hearts" },
          { rank: "2", suit: "spades" },
          { rank: "ace", suit: "diamonds" },
        ],
      };

      const view = playerView(g, p1);

      assert.ok(view.seats[0].handRank);
      assert.ok(view.seats[0].handRank.includes("Straight"));
    });

    it("calculates full house correctly with 7 cards", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });

      g.hand = { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = [
        { rank: "king", suit: "spades" },
        { rank: "king", suit: "hearts" },
      ];
      g.board = {
        cards: [
          { rank: "king", suit: "clubs" },
          { rank: "queen", suit: "diamonds" },
          { rank: "queen", suit: "hearts" },
          { rank: "5", suit: "spades" },
          { rank: "3", suit: "diamonds" },
        ],
      };

      const view = playerView(g, p1);

      assert.ok(view.seats[0].handRank);
      assert.ok(view.seats[0].handRank.includes("Full House"));
    });

    it("does not calculate handRank for folded players", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });

      g.hand = { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = [
        { rank: "ace", suit: "spades" },
        { rank: "ace", suit: "hearts" },
      ];
      g.seats[0].folded = true;
      g.board = {
        cards: [
          { rank: "king", suit: "diamonds" },
          { rank: "queen", suit: "clubs" },
          { rank: "jack", suit: "hearts" },
          { rank: "10", suit: "spades" },
          { rank: "9", suit: "clubs" },
        ],
      };

      const view = playerView(g, p1);

      assert.equal(view.seats[0].handRank, null);
    });
  });

  describe("winningCards", function () {
    it("includes winningCards in view for winning seats", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      const p2 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });

      g.hand = { phase: "waiting", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = [
        { rank: "ace", suit: "spades" },
        { rank: "ace", suit: "hearts" },
      ];
      g.seats[0].handResult = 100;
      g.seats[0].winningCards = [
        { rank: "ace", suit: "spades" },
        { rank: "ace", suit: "hearts" },
        { rank: "ace", suit: "clubs" },
        { rank: "ace", suit: "diamonds" },
        { rank: "king", suit: "hearts" },
      ];

      const view = playerView(g, p1);

      assert.ok(view.seats[0].winningCards);
      assert.equal(view.seats[0].winningCards.length, 5);
    });

    it("does not include winningCards for losing seats", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      const p2 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });

      g.hand = { phase: "waiting", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = [
        { rank: "ace", suit: "spades" },
        { rank: "ace", suit: "hearts" },
      ];
      g.seats[0].handResult = 100;
      g.seats[0].winningCards = [
        { rank: "ace", suit: "spades" },
        { rank: "ace", suit: "hearts" },
        { rank: "ace", suit: "clubs" },
        { rank: "ace", suit: "diamonds" },
        { rank: "king", suit: "hearts" },
      ];

      g.seats[1].cards = [
        { rank: "2", suit: "clubs" },
        { rank: "3", suit: "diamonds" },
      ];
      g.seats[1].handResult = -100;
      g.seats[1].winningCards = null;

      const view = playerView(g, p1);

      assert.equal(view.seats[1].winningCards, null);
    });
  });

  describe("callClock action", function () {
    it("should appear on waiting player's seat when opponent is acting too long", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      const p2 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });

      // Simulate a hand in progress where seat 1 is acting
      g.hand = {
        phase: "flop",
        pot: 10,
        currentBet: 0,
        actingSeat: 1,
        actingSince: Date.now() - 61000, // 61 seconds ago
        clockCalledAt: null,
      };

      // Player 1 (seat 0) is waiting - should see callClock action on their own seat
      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;
      const callClockAction = p1Actions.find((a) => a.action === "callClock");

      assert.ok(callClockAction, "callClock action should be available");
    });

    it("should NOT appear on acting player's own seat", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      const p2 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });

      // Simulate a hand in progress where seat 1 is acting
      g.hand = {
        phase: "flop",
        pot: 10,
        currentBet: 0,
        actingSeat: 1,
        actingSince: Date.now() - 61000, // 61 seconds ago
        clockCalledAt: null,
      };

      // Player 2 (seat 1) is acting - should NOT see callClock on their own seat
      const view = playerView(g, p2);
      const p2Actions = view.seats[1].actions;
      const callClockAction = p2Actions.find((a) => a.action === "callClock");

      assert.ok(
        !callClockAction,
        "callClock should NOT appear for acting player",
      );
    });

    it("should NOT appear before 60 seconds have passed", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      const p2 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });

      // Simulate a hand where seat 1 started acting recently
      g.hand = {
        phase: "flop",
        pot: 10,
        currentBet: 0,
        actingSeat: 1,
        actingSince: Date.now() - 30000, // Only 30 seconds ago
        clockCalledAt: null,
      };

      // Player 1 (seat 0) is waiting - should NOT see callClock yet
      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;
      const callClockAction = p1Actions.find((a) => a.action === "callClock");

      assert.ok(
        !callClockAction,
        "callClock should NOT appear before 60 seconds",
      );
    });

    it("should NOT appear if clock is already called", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      const p2 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });

      // Simulate a hand where clock is already called
      g.hand = {
        phase: "flop",
        pot: 10,
        currentBet: 0,
        actingSeat: 1,
        actingSince: Date.now() - 61000,
        clockCalledAt: Date.now() - 5000, // Clock was called 5 seconds ago
      };

      // Player 1 (seat 0) should NOT see callClock again
      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;
      const callClockAction = p1Actions.find((a) => a.action === "callClock");

      assert.ok(
        !callClockAction,
        "callClock should NOT appear if already called",
      );
    });

    it("should NOT appear when no one is acting", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      const p2 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });

      // Waiting phase - no one is acting
      g.hand = {
        phase: "waiting",
        pot: 0,
        currentBet: 0,
        actingSeat: -1,
        actingSince: null,
        clockCalledAt: null,
      };

      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;
      const callClockAction = p1Actions.find((a) => a.action === "callClock");

      assert.ok(
        !callClockAction,
        "callClock should NOT appear when no one is acting",
      );
    });
  });
});
