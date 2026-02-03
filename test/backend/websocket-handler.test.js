import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  classifyAllInAction,
  getSeatStateBefore,
} from "../../src/backend/websocket-handler.js";
import * as PokerActions from "../../src/backend/poker/actions.js";
import * as Seat from "../../src/backend/poker/seat.js";
import { createTestGame } from "./poker/test-helpers.js";

describe("websocket-handler", () => {
  describe("classifyAllInAction", () => {
    it("should return bet when currentBet is 0", () => {
      // Going all-in when no one has bet
      assert.strictEqual(classifyAllInAction(0, 0, 1000), "bet");
      // Even with a previous bet on this street
      assert.strictEqual(classifyAllInAction(50, 0, 1000), "bet");
    });

    it("should return call when finalBet equals currentBet", () => {
      // Exact call
      assert.strictEqual(classifyAllInAction(0, 100, 100), "call");
      // Already had partial bet
      assert.strictEqual(classifyAllInAction(50, 100, 100), "call");
    });

    it("should return call when finalBet is less than currentBet (all-in for less)", () => {
      // All-in for less than current bet
      assert.strictEqual(classifyAllInAction(0, 100, 50), "call");
      assert.strictEqual(classifyAllInAction(25, 100, 75), "call");
    });

    it("should return raise when finalBet exceeds currentBet", () => {
      // Going over the current bet
      assert.strictEqual(classifyAllInAction(0, 100, 200), "raise");
      // Already had some bet, raising more
      assert.strictEqual(classifyAllInAction(50, 100, 300), "raise");
      assert.strictEqual(classifyAllInAction(100, 100, 500), "raise");
    });
  });

  describe("all-in classification in game flow", () => {
    let game;
    let player1, player2, player3;

    beforeEach(() => {
      game = createTestGame();
      player1 = { id: "p1" };
      player2 = { id: "p2" };
      player3 = { id: "p3" };

      // Set up players on river
      game.seats[0] = {
        ...Seat.occupied(player1, 4000),
        cards: ["As", "Ks"],
      };
      game.seats[2] = {
        ...Seat.occupied(player2, 3000), // Will go all-in
        cards: ["Qh", "Jh"],
      };
      game.seats[4] = {
        ...Seat.occupied(player3, 5000),
        cards: ["2c", "3c"],
      };

      game.hand = {
        phase: "river",
        pot: 800,
        currentBet: 0,
        lastRaiser: -1,
        actingSeat: 0,
        lastRaiseSize: 0,
      };
      game.board.cards = ["Js", "7c", "2h", "5h", "8c"];
    });

    it("should classify all-in as raise when exceeding current bet after bet+raise", () => {
      // Reproduces production bug ml1c1ixx2027 hand #10
      // Scenario:
      // - Player 1 bets 1000
      // - Player 3 raises to 2000
      // - Player 2 folds
      // - Player 1 goes all-in for 4000 total
      // This should be classified as a RAISE, not a call

      // Player 1 bets
      game.hand.actingSeat = 0;
      PokerActions.bet(game, { seat: 0, amount: 1000 });
      // currentBet is now 1000

      // Player 3 raises to 2000
      game.hand.actingSeat = 4;
      PokerActions.raise(game, { seat: 4, amount: 2000 });
      // currentBet is now 2000

      // Player 2 folds
      game.hand.actingSeat = 2;
      game.seats[2].folded = true;

      // Now player 1 goes all-in
      game.hand.actingSeat = 0;

      // Capture state BEFORE all-in using the fixed function
      const { betBefore, currentBetBefore } = getSeatStateBefore(game, player1);

      assert.strictEqual(betBefore, 1000, "betBefore should be 1000");
      assert.strictEqual(
        currentBetBefore,
        2000,
        "currentBetBefore should be 2000",
      );

      // Player 1 goes all-in with remaining stack
      // They already bet 1000, have 3000 left, so total bet will be 4000
      PokerActions.allIn(game, { seat: 0 });
      const seatAfter = game.seats[0];

      assert.strictEqual(seatAfter.bet, 4000, "total bet should be 4000");

      // With the fix, using currentBetBefore gives correct classification
      const classification = classifyAllInAction(
        betBefore,
        currentBetBefore, // 2000 - captured BEFORE all-in
        seatAfter.bet, // 4000
      );
      assert.strictEqual(
        classification,
        "raise",
        "All-in for more than current bet should be a raise",
      );
    });

    it("getSeatStateBefore captures currentBet before action modifies it", () => {
      // This test verifies the fix: currentBetBefore is captured correctly
      game.hand.actingSeat = 0;
      PokerActions.bet(game, { seat: 0, amount: 1000 });

      game.hand.actingSeat = 4;
      PokerActions.raise(game, { seat: 4, amount: 2000 });

      // Before all-in, currentBet should be 2000
      game.hand.actingSeat = 0;
      const stateBefore = getSeatStateBefore(game, player1);

      assert.strictEqual(
        stateBefore.currentBetBefore,
        2000,
        "currentBetBefore should capture the bet before action",
      );

      // After all-in, game.hand.currentBet will be 4000
      PokerActions.allIn(game, { seat: 0 });

      assert.strictEqual(
        game.hand.currentBet,
        4000,
        "currentBet after action should be 4000",
      );

      // But stateBefore.currentBetBefore should still be 2000
      assert.strictEqual(
        stateBefore.currentBetBefore,
        2000,
        "captured currentBetBefore should not change",
      );
    });
  });
});
