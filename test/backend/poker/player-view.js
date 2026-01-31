import { describe, it } from "node:test";
import * as assert from "assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as User from "../../../src/backend/user.js";
import * as Player from "../../../src/backend/poker/player.js";
import * as Actions from "../../../src/backend/poker/actions.js";
import playerView from "../../../src/backend/poker/player-view.js";

/** Helper to create a test player */
function createPlayer() {
  return Player.fromUser(User.create());
}

describe("Player View", function () {
  describe("Seat", function () {
    it("add sit action to empty seats", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      const p2View = playerView(g, p2);
      assert.deepEqual(p2View.seats[0].actions, []);
      assert.deepEqual(p2View.seats[1].actions, [{ action: "sit", seat: 1 }]);
    });
  });

  describe("winnerMessage", function () {
    it("should include winnerMessage when set", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
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
      const p1 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });

      const view = playerView(g, p1);

      assert.equal(view.winnerMessage, null);
    });

    it("should include winnerMessage without handRank for fold wins", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
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
    it("shows opponent cards when they were revealed at showdown", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });

      // Simulate post-showdown state
      g.hand = { phase: "waiting", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = ["As", "Kh"];
      g.seats[1].cards = ["Qd", "Jc"];
      // Both players revealed cards at showdown
      g.seats[0].cardsRevealed = true;
      g.seats[1].cardsRevealed = true;

      const view = playerView(g, p1);

      // Own cards should be visible
      assert.equal(view.seats[0].cards[0], "As");
      // Opponent cards should also be visible (they were revealed at showdown)
      assert.equal(view.seats[1].cards[0], "Qd");
      assert.equal(view.seats[1].cards[1], "Jc");
    });

    it("hides opponent cards when they folded (not revealed)", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });

      // Simulate post-hand state where opponent folded
      g.hand = { phase: "waiting", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = ["As", "Kh"];
      g.seats[1].cards = ["Qd", "Jc"];
      // Opponent folded, cards not revealed
      g.seats[0].cardsRevealed = false;
      g.seats[1].cardsRevealed = false;

      const view = playerView(g, p1);

      // Own cards should be visible
      assert.equal(view.seats[0].cards[0], "As");
      // Opponent cards should be hidden (not revealed)
      assert.equal(view.seats[1].cards[0], "??");
      assert.equal(view.seats[1].cards[1], "??");
    });

    it("hides winner cards when they won by fold", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });

      // Simulate post-hand state where p1 won by fold
      g.hand = { phase: "waiting", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = ["As", "Kh"];
      g.seats[1].cards = ["Qd", "Jc"];
      g.seats[1].folded = true;
      // Winner has handResult but cards not revealed (won by fold)
      g.seats[0].handResult = 100;
      g.seats[0].cardsRevealed = false;

      const view = playerView(g, p2);

      // Winner's cards should be hidden from opponent (won by fold)
      assert.equal(view.seats[0].cards[0], "??");
      assert.equal(view.seats[0].cards[1], "??");
    });

    it("shows all cards during showdown phase", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });

      g.hand = { phase: "showdown", pot: 200, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = ["As", "Kh"];
      g.seats[1].cards = ["Qd", "Jc"];

      const view = playerView(g, p1);

      // All cards should be visible during showdown phase
      assert.equal(view.seats[0].cards[0], "As");
      assert.equal(view.seats[1].cards[0], "Qd");
    });
  });

  describe("handRank calculation", function () {
    it("calculates handRank for 7 cards (2 hole + 5 board)", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });

      g.hand = { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = ["As", "Ah"];
      g.board = {
        cards: ["Ac", "Kd", "9c", "5h", "2s"],
      };

      const view = playerView(g, p1);

      assert.ok(view.seats[0].handRank);
      assert.ok(view.seats[0].handRank.includes("Three"));
      assert.ok(view.seats[0].handRank.includes("A"));
    });

    it("calculates flush correctly with 7 cards", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });

      g.hand = { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = ["Ah", "2h"];
      g.board = {
        cards: ["Kh", "Qh", "Jh", "5s", "3d"],
      };

      const view = playerView(g, p1);

      assert.ok(view.seats[0].handRank);
      assert.ok(view.seats[0].handRank.includes("Flush"));
    });

    it("calculates straight correctly with 7 cards", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });

      g.hand = { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = ["9s", "8h"];
      g.board = {
        cards: ["7c", "6d", "5h", "2s", "Ad"],
      };

      const view = playerView(g, p1);

      assert.ok(view.seats[0].handRank);
      assert.ok(view.seats[0].handRank.includes("Straight"));
    });

    it("calculates full house correctly with 7 cards", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });

      g.hand = { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = ["Ks", "Kh"];
      g.board = {
        cards: ["Kc", "Qd", "Qh", "5s", "3d"],
      };

      const view = playerView(g, p1);

      assert.ok(view.seats[0].handRank);
      assert.ok(view.seats[0].handRank.includes("Full House"));
    });

    it("does not calculate handRank for folded players", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });

      g.hand = { phase: "showdown", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = ["As", "Ah"];
      g.seats[0].folded = true;
      g.board = {
        cards: ["Kd", "Qc", "Jh", "Ts", "9c"],
      };

      const view = playerView(g, p1);

      assert.equal(view.seats[0].handRank, null);
    });
  });

  describe("winningCards", function () {
    it("includes winningCards in view for winning seats", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });

      g.hand = { phase: "waiting", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = ["As", "Ah"];
      g.seats[0].handResult = 100;
      g.seats[0].winningCards = ["As", "Ah", "Ac", "Ad", "Kh"];

      const view = playerView(g, p1);

      assert.ok(view.seats[0].winningCards);
      assert.equal(view.seats[0].winningCards.length, 5);
    });

    it("does not include winningCards for losing seats", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });

      g.hand = { phase: "waiting", pot: 0, currentBet: 0, actingSeat: -1 };
      g.seats[0].cards = ["As", "Ah"];
      g.seats[0].handResult = 100;
      g.seats[0].winningCards = ["As", "Ah", "Ac", "Ad", "Kh"];

      g.seats[1].cards = ["2c", "3d"];
      g.seats[1].handResult = -100;
      g.seats[1].winningCards = null;

      const view = playerView(g, p1);

      assert.equal(view.seats[1].winningCards, null);
    });
  });

  describe("preflop betting actions", function () {
    it("should NOT show check for player who hasn't matched the big blind", function () {
      const g = Game.create({ seats: 3 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      const p3 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.sit(g, { seat: 2, player: p3 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });
      Actions.buyIn(g, { seat: 2, amount: 50 });

      // Simulate preflop with blinds posted
      // Button at seat 0, SB at seat 1 ($0.25), BB at seat 2 ($0.50)
      g.button = 0;
      g.blinds = { small: 25, big: 50, ante: 0 };
      g.seats[1].bet = 25; // SB posted
      g.seats[2].bet = 50; // BB posted
      g.hand = {
        phase: "preflop",
        pot: 0,
        currentBet: 50, // Big blind amount
        actingSeat: 0, // UTG (button in 3-handed) to act
        lastRaiser: 0,
        lastRaiseSize: 50,
      };

      // Player at seat 0 (UTG) hasn't posted anything (bet = 0)
      // They should NOT be able to check, only call/raise/fold
      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;

      const checkAction = p1Actions.find((a) => a.action === "check");
      const callAction = p1Actions.find((a) => a.action === "call");
      const foldAction = p1Actions.find((a) => a.action === "fold");

      assert.ok(
        !checkAction,
        "check should NOT be available preflop for player who hasn't posted",
      );
      assert.ok(callAction, "call should be available");
      assert.ok(foldAction, "fold should be available");
    });

    it("should show check for big blind when all players have called", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });

      // Heads-up: button posts SB, other posts BB
      // Button has called, now BB has option
      g.button = 0;
      g.blinds = { small: 25, big: 50, ante: 0 };
      g.seats[0].bet = 50; // SB called to 50
      g.seats[1].bet = 50; // BB posted 50
      g.hand = {
        phase: "preflop",
        pot: 0,
        currentBet: 50,
        actingSeat: 1, // BB to act (their option)
        lastRaiser: 0,
        lastRaiseSize: 50,
      };

      // BB can check (their bet matches currentBet)
      const view = playerView(g, p2);
      const p2Actions = view.seats[1].actions;

      const checkAction = p2Actions.find((a) => a.action === "check");
      assert.ok(
        checkAction,
        "check should be available for BB when all bets matched",
      );
    });
  });

  describe("callClock action", function () {
    it("should appear on waiting player's seat when opponent is acting too long", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
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
        lastRaiser: -1,
        lastRaiseSize: 0,
      };
      g.actingTicks = 60; // 60 ticks (enough for clock)
      g.clockTicks = 0; // Clock not called

      // Player 1 (seat 0) is waiting - should see callClock action on their own seat
      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;
      const callClockAction = p1Actions.find((a) => a.action === "callClock");

      assert.ok(callClockAction, "callClock action should be available");
    });

    it("should NOT appear on acting player's own seat", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
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
        lastRaiser: -1,
        lastRaiseSize: 0,
      };
      g.actingTicks = 60; // 60 ticks (enough for clock)
      g.clockTicks = 0; // Clock not called

      // Player 2 (seat 1) is acting - should NOT see callClock on their own seat
      const view = playerView(g, p2);
      const p2Actions = view.seats[1].actions;
      const callClockAction = p2Actions.find((a) => a.action === "callClock");

      assert.ok(
        !callClockAction,
        "callClock should NOT appear for acting player",
      );
    });

    it("should NOT appear before 60 ticks have passed", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
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
        lastRaiser: -1,
        lastRaiseSize: 0,
      };
      g.actingTicks = 30; // Only 30 ticks
      g.clockTicks = 0;

      // Player 1 (seat 0) is waiting - should NOT see callClock yet
      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;
      const callClockAction = p1Actions.find((a) => a.action === "callClock");

      assert.ok(
        !callClockAction,
        "callClock should NOT appear before 60 ticks",
      );
    });

    it("should NOT appear if clock is already called", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
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
        lastRaiser: -1,
        lastRaiseSize: 0,
      };
      g.actingTicks = 60;
      g.clockTicks = 5; // Clock was called 5 ticks ago

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
      const p1 = createPlayer();
      const p2 = createPlayer();
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
        lastRaiser: -1,
        lastRaiseSize: 0,
      };
      g.actingTicks = 0;
      g.clockTicks = 0;

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
