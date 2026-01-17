import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as Seat from "../../../src/backend/poker/seat.js";
import * as Showdown from "../../../src/backend/poker/showdown.js";

describe("showdown", () => {
  let game;

  beforeEach(() => {
    game = Game.create({ seats: 6, blinds: { ante: 0, small: 25, big: 50 } });
  });

  describe("evaluateHand", () => {
    it("should evaluate hand with board cards", () => {
      const seat = {
        ...Seat.occupied({ id: "p1" }, 1000),
        cards: ["As", "Ks"],
      };
      const board = ["Qs", "Js", "Ts", "2h", "3d"];

      const result = Showdown.evaluateHand(seat, board);

      assert.equal(result.hand.name, "royal flush");
      assert.equal(result.cards.length, 5);
    });

    it("should return null for empty cards", () => {
      const seat = {
        ...Seat.occupied({ id: "p1" }, 1000),
        cards: [],
      };

      const result = Showdown.evaluateHand(seat, []);

      assert.equal(result, null);
    });
  });

  describe("getActiveHands", () => {
    it("should get hands for all active players", () => {
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 1000),
        cards: ["As", "Ks"],
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 1000),
        cards: ["2h", "3h"],
      };
      game.board.cards = ["Ah", "Kh", "Qh", "Jc", "Tc"];

      const hands = Showdown.getActiveHands(game);

      assert.equal(hands.length, 2);
      assert.equal(hands[0].seat, 0);
      assert.equal(hands[1].seat, 2);
    });

    it("should exclude folded players", () => {
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 1000),
        cards: ["As", "Ks"],
        folded: true,
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 1000),
        cards: ["2h", "3h"],
      };
      game.board.cards = ["Ah", "Kh", "Qh", "Jc", "Tc"];

      const hands = Showdown.getActiveHands(game);

      assert.equal(hands.length, 1);
      assert.equal(hands[0].seat, 2);
    });
  });

  describe("determineWinnersForPot", () => {
    it("should find single winner", () => {
      // Full house beats pair
      const hands = [
        {
          seat: 0,
          hand: {
            name: "pair",
            of: "9",
            kickers: ["A", "K", "Q"],
          },
        },
        {
          seat: 2,
          hand: {
            name: "full house",
            of: "T",
            and: "5",
          },
        },
      ];
      const pot = { amount: 100, eligibleSeats: [0, 2] };

      const result = Showdown.determineWinnersForPot(pot, hands);

      assert.deepEqual(result.winners, [2]);
    });

    it("should find multiple winners for tie", () => {
      // Create two equal pair hands (same pair rank and kickers)
      const hands = [
        {
          seat: 0,
          hand: {
            name: "pair",
            of: "A",
            kickers: ["K", "Q", "J"],
          },
        },
        {
          seat: 2,
          hand: {
            name: "pair",
            of: "A",
            kickers: ["K", "Q", "J"],
          },
        },
      ];
      const pot = { amount: 100, eligibleSeats: [0, 2] };

      const result = Showdown.determineWinnersForPot(pot, hands);

      assert.equal(result.winners.length, 2);
    });

    it("should only consider eligible players", () => {
      const hands = [
        {
          seat: 0,
          hand: {
            name: "full house",
            of: "T",
            and: "5",
          },
        }, // Best hand but not eligible
        {
          seat: 2,
          hand: {
            name: "pair",
            of: "9",
            kickers: ["A", "K", "Q"],
          },
        },
      ];
      const pot = { amount: 100, eligibleSeats: [2] }; // Only seat 2 eligible

      const result = Showdown.determineWinnersForPot(pot, hands);

      assert.deepEqual(result.winners, [2]);
    });
  });

  describe("runShowdown", () => {
    it("should distribute pot to winner", () => {
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 0),
        cards: ["As", "Ah"],
        totalInvested: 100,
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 0),
        cards: ["2c", "3d"],
        totalInvested: 100,
      };
      game.board.cards = ["Ac", "Ad", "Kh", "Qh", "Jh"];

      const results = Showdown.runShowdown(game);

      assert.equal(results.length, 1);
      assert.equal(results[0].potAmount, 200);
      assert.deepEqual(results[0].winners, [0]);
      assert.equal(game.seats[0].stack, 200);
    });

    it("should handle side pots", () => {
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 0),
        cards: ["As", "Ah"],
        totalInvested: 50, // Short stack
        allIn: true,
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 0),
        cards: ["Kc", "Kd"],
        totalInvested: 100,
      };
      game.seats[4] = {
        ...Seat.occupied({ id: "p3" }, 0),
        cards: ["2c", "3d"],
        totalInvested: 100,
      };
      game.board.cards = ["7c", "8d", "9h", "4h", "5h"];

      const results = Showdown.runShowdown(game);

      // Should have 2 pots
      assert.equal(results.length, 2);
      // First pot (50 x 3 = 150): Player 0 wins with pair of aces
      assert.equal(results[0].potAmount, 150);
      assert.deepEqual(results[0].winners, [0]);
      // Second pot (50 x 2 = 100): Player 2 wins with pair of kings
      assert.equal(results[1].potAmount, 100);
      assert.deepEqual(results[1].winners, [2]);
    });

    it("should split pot evenly when hands are equal", () => {
      // Both players have low cards, board plays (straight on board)
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 0),
        cards: ["2s", "3s"],
        totalInvested: 100,
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 0),
        cards: ["2c", "3c"],
        totalInvested: 100,
      };
      // Board has a straight - both players play the board
      game.board.cards = ["Ah", "Kd", "Qc", "Jh", "Ts"];

      const results = Showdown.runShowdown(game);

      assert.equal(results.length, 1);
      assert.equal(results[0].potAmount, 200);
      // Both players should be winners
      assert.equal(results[0].winners.length, 2);
      assert.ok(results[0].winners.includes(0));
      assert.ok(results[0].winners.includes(2));
      // Each player gets half (100 each)
      assert.equal(game.seats[0].stack, 100);
      assert.equal(game.seats[2].stack, 100);
    });

    it("should give odd chip to first winner when pot cannot split evenly", () => {
      // Both players invest 50, creating a pot of 100 that splits to 50 each
      // But we create a scenario with 3 players where one folds, leaving odd pot
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 0),
        cards: ["2s", "3s"],
        totalInvested: 51,
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 0),
        cards: ["2c", "3c"],
        totalInvested: 51,
      };
      game.seats[4] = {
        ...Seat.occupied({ id: "p3" }, 0),
        cards: ["4d", "5d"],
        totalInvested: 51,
        folded: true, // Folded, so not eligible but contributed
      };
      // Board has a straight - both active players play the board
      game.board.cards = ["Ah", "Kd", "Qc", "Jh", "Ts"];

      const results = Showdown.runShowdown(game);

      // Pot is 153 (51 * 3), splits to 76 and 77 (first winner gets odd chip)
      assert.equal(results[0].potAmount, 153);
      assert.equal(results[0].winners.length, 2);
      // First winner (seat 0) gets 77, second (seat 2) gets 76
      assert.equal(game.seats[0].stack, 77);
      assert.equal(game.seats[2].stack, 76);
    });
  });

  describe("awardToLastPlayer", () => {
    it("should award entire pot to last player", () => {
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 0),
        bet: 50,
        folded: true,
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 100),
        bet: 50,
      };
      game.hand.pot = 100;

      const result = Showdown.awardToLastPlayer(game);

      assert.equal(result.winner, 2);
      assert.equal(result.amount, 200); // 100 in pot + 50 + 50 from bets
      assert.equal(game.seats[2].stack, 300); // 100 original + 200 won
    });

    it("should set handResult for winner and losers", () => {
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 0),
        bet: 50,
        totalInvested: 0, // Will become 50 after bet collection
        folded: true,
        lastAction: "fold",
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 100),
        bet: 50,
        totalInvested: 0, // Will become 50 after bet collection
        lastAction: "bet",
      };
      game.hand.pot = 0;

      Showdown.awardToLastPlayer(game);

      // Winner wins pot (100) minus their investment (50) = +50 profit
      assert.equal(game.seats[2].handResult, 50);
      // Loser loses their investment (-50)
      assert.equal(game.seats[0].handResult, -50);
    });

    it("should clear lastAction for all players", () => {
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 0),
        bet: 50,
        folded: true,
        lastAction: "fold",
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 100),
        bet: 50,
        lastAction: "bet",
      };
      game.hand.pot = 0;

      Showdown.awardToLastPlayer(game);

      assert.equal(game.seats[0].lastAction, null);
      assert.equal(game.seats[2].lastAction, null);
    });
  });

  describe("showdown generator", () => {
    it("should set handResult for winner and losers", () => {
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 0),
        cards: ["As", "Ah"],
        bet: 0,
        totalInvested: 100,
        lastAction: "call",
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 0),
        cards: ["2c", "3d"],
        bet: 0,
        totalInvested: 100,
        lastAction: "bet",
      };
      game.board.cards = ["Ac", "Ad", "Kh", "Qh", "Jh"];
      game.hand = { phase: "river", pot: 0, currentBet: 0, actingSeat: -1 };

      // Run the showdown generator to completion
      const gen = Showdown.showdown(game);
      let result = gen.next();
      while (!result.done) {
        result = gen.next();
      }

      // Winner (seat 0) gains opponent's bet
      assert.equal(game.seats[0].handResult, 100);
      // Loser (seat 2) loses their investment
      assert.equal(game.seats[2].handResult, -100);
    });

    it("should clear lastAction for all players", () => {
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 0),
        cards: ["As", "Ah"],
        bet: 0,
        totalInvested: 100,
        lastAction: "call",
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 0),
        cards: ["2c", "3d"],
        bet: 0,
        totalInvested: 100,
        lastAction: "bet",
      };
      game.board.cards = ["Ac", "Ad", "Kh", "Qh", "Jh"];
      game.hand = { phase: "river", pot: 0, currentBet: 0, actingSeat: -1 };

      const gen = Showdown.showdown(game);
      let result = gen.next();
      while (!result.done) {
        result = gen.next();
      }

      assert.equal(game.seats[0].lastAction, null);
      assert.equal(game.seats[2].lastAction, null);
    });

    it("should set winningCards for winner", () => {
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 0),
        cards: ["As", "Ah"],
        bet: 0,
        totalInvested: 100,
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 0),
        cards: ["2c", "3d"],
        bet: 0,
        totalInvested: 100,
      };
      game.board.cards = ["Ac", "Ad", "Kh", "Qh", "Jh"];
      game.hand = { phase: "river", pot: 0, currentBet: 0, actingSeat: -1 };

      const gen = Showdown.showdown(game);
      let result = gen.next();
      while (!result.done) {
        result = gen.next();
      }

      // Winner (seat 0) should have winningCards set
      assert.ok(game.seats[0].winningCards);
      assert.equal(game.seats[0].winningCards.length, 5);
      // Verify all 4 aces are in the winning cards
      const aces = game.seats[0].winningCards.filter((c) => c.startsWith("A"));
      assert.equal(aces.length, 4);
    });

    it("should not set winningCards for loser", () => {
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 0),
        cards: ["As", "Ah"],
        bet: 0,
        totalInvested: 100,
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 0),
        cards: ["2c", "3d"],
        bet: 0,
        totalInvested: 100,
      };
      game.board.cards = ["Ac", "Ad", "Kh", "Qh", "Jh"];
      game.hand = { phase: "river", pot: 0, currentBet: 0, actingSeat: -1 };

      const gen = Showdown.showdown(game);
      let result = gen.next();
      while (!result.done) {
        result = gen.next();
      }

      // Loser (seat 2) should NOT have winningCards set
      assert.equal(game.seats[2].winningCards, null);
    });
  });
});
