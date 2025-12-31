import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../src/poker/game.js";
import * as Seat from "../../src/poker/seat.js";
import * as Showdown from "../../src/poker/showdown.js";

describe("showdown", () => {
  let game;

  beforeEach(() => {
    game = Game.create({ seats: 6, blinds: { ante: 0, small: 25, big: 50 } });
  });

  describe("evaluateHand", () => {
    it("should evaluate hand with board cards", () => {
      const seat = {
        ...Seat.occupied({ id: "p1" }, 1000),
        cards: [
          { rank: "ace", suit: "spades" },
          { rank: "king", suit: "spades" },
        ],
      };
      const board = [
        { rank: "queen", suit: "spades" },
        { rank: "jack", suit: "spades" },
        { rank: "10", suit: "spades" },
        { rank: "2", suit: "hearts" },
        { rank: "3", suit: "diamonds" },
      ];

      const hand = Showdown.evaluateHand(seat, board);

      assert.equal(hand.name, "royal flush");
    });

    it("should return null for empty cards", () => {
      const seat = {
        ...Seat.occupied({ id: "p1" }, 1000),
        cards: [],
      };

      const hand = Showdown.evaluateHand(seat, []);

      assert.equal(hand, null);
    });
  });

  describe("getActiveHands", () => {
    it("should get hands for all active players", () => {
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 1000),
        cards: [
          { rank: "ace", suit: "spades" },
          { rank: "king", suit: "spades" },
        ],
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 1000),
        cards: [
          { rank: "2", suit: "hearts" },
          { rank: "3", suit: "hearts" },
        ],
      };
      game.board.cards = [
        { rank: "ace", suit: "hearts" },
        { rank: "king", suit: "hearts" },
        { rank: "queen", suit: "hearts" },
        { rank: "jack", suit: "clubs" },
        { rank: "10", suit: "clubs" },
      ];

      const hands = Showdown.getActiveHands(game);

      assert.equal(hands.length, 2);
      assert.equal(hands[0].seat, 0);
      assert.equal(hands[1].seat, 2);
    });

    it("should exclude folded players", () => {
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 1000),
        cards: [
          { rank: "ace", suit: "spades" },
          { rank: "king", suit: "spades" },
        ],
        folded: true,
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 1000),
        cards: [
          { rank: "2", suit: "hearts" },
          { rank: "3", suit: "hearts" },
        ],
      };
      game.board.cards = [
        { rank: "ace", suit: "hearts" },
        { rank: "king", suit: "hearts" },
        { rank: "queen", suit: "hearts" },
        { rank: "jack", suit: "clubs" },
        { rank: "10", suit: "clubs" },
      ];

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
            kickers: ["ace", "king", "queen"],
          },
        },
        {
          seat: 2,
          hand: {
            name: "full house",
            of: "10",
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
            of: "ace",
            kickers: ["king", "queen", "jack"],
          },
        },
        {
          seat: 2,
          hand: {
            name: "pair",
            of: "ace",
            kickers: ["king", "queen", "jack"],
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
            of: "10",
            and: "5",
          },
        }, // Best hand but not eligible
        {
          seat: 2,
          hand: {
            name: "pair",
            of: "9",
            kickers: ["ace", "king", "queen"],
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
        cards: [
          { rank: "ace", suit: "spades" },
          { rank: "ace", suit: "hearts" },
        ],
        totalInvested: 100,
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 0),
        cards: [
          { rank: "2", suit: "clubs" },
          { rank: "3", suit: "diamonds" },
        ],
        totalInvested: 100,
      };
      game.board.cards = [
        { rank: "ace", suit: "clubs" },
        { rank: "ace", suit: "diamonds" },
        { rank: "king", suit: "hearts" },
        { rank: "queen", suit: "hearts" },
        { rank: "jack", suit: "hearts" },
      ];

      const results = Showdown.runShowdown(game);

      assert.equal(results.length, 1);
      assert.equal(results[0].potAmount, 200);
      assert.deepEqual(results[0].winners, [0]);
      assert.equal(game.seats[0].stack, 200);
    });

    it("should handle side pots", () => {
      game.seats[0] = {
        ...Seat.occupied({ id: "p1" }, 0),
        cards: [
          { rank: "ace", suit: "spades" },
          { rank: "ace", suit: "hearts" },
        ],
        totalInvested: 50, // Short stack
        allIn: true,
      };
      game.seats[2] = {
        ...Seat.occupied({ id: "p2" }, 0),
        cards: [
          { rank: "king", suit: "clubs" },
          { rank: "king", suit: "diamonds" },
        ],
        totalInvested: 100,
      };
      game.seats[4] = {
        ...Seat.occupied({ id: "p3" }, 0),
        cards: [
          { rank: "2", suit: "clubs" },
          { rank: "3", suit: "diamonds" },
        ],
        totalInvested: 100,
      };
      game.board.cards = [
        { rank: "7", suit: "clubs" },
        { rank: "8", suit: "diamonds" },
        { rank: "9", suit: "hearts" },
        { rank: "4", suit: "hearts" },
        { rank: "5", suit: "hearts" },
      ];

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
  });
});
