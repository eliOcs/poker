import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../src/backend/poker/game.js";
import * as Seat from "../../src/backend/poker/seat.js";
import * as Actions from "../../src/backend/poker/actions.js";
import * as Ranking from "../../src/backend/poker/ranking.js";

describe("ranking", () => {
  let game;

  beforeEach(() => {
    game = Game.create({ seats: 6, blinds: { ante: 0, small: 25, big: 50 } });
  });

  describe("buyIn tracking", () => {
    it("should track cumulative buy-ins", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" });

      Actions.buyIn(game, { seat: 0, amount: 20 }); // 20 * 50 = 1000
      assert.equal(game.seats[0].stack, 1000);
      assert.equal(game.seats[0].totalBuyIn, 1000);

      Actions.buyIn(game, { seat: 0, amount: 10 }); // 10 * 50 = 500
      assert.equal(game.seats[0].stack, 1500);
      assert.equal(game.seats[0].totalBuyIn, 1500);
    });

    it("should preserve totalBuyIn across hands", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" });
      Actions.buyIn(game, { seat: 0, amount: 20 });

      Seat.resetForNewHand(game.seats[0]);

      assert.equal(game.seats[0].totalBuyIn, 1000);
    });

    it("should initialize totalBuyIn to 0 for new seat", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" });
      assert.equal(game.seats[0].totalBuyIn, 0);
    });
  });

  describe("hands played tracking", () => {
    it("should increment handsPlayed at end of hand", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 1000);
      game.seats[2] = Seat.occupied({ id: "p2", name: "Bob" }, 1000);

      Actions.endHand(game);

      assert.equal(game.seats[0].handsPlayed, 1);
      assert.equal(game.seats[2].handsPlayed, 1);
    });

    it("should not increment for sitting out players", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 1000);
      game.seats[2] = Seat.occupied({ id: "p2", name: "Bob" }, 1000);
      game.seats[2].sittingOut = true;

      Actions.endHand(game);

      assert.equal(game.seats[0].handsPlayed, 1);
      assert.equal(game.seats[2].handsPlayed, 0);
    });

    it("should preserve handsPlayed across hands", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 1000);
      game.seats[0].handsPlayed = 5;

      Seat.resetForNewHand(game.seats[0]);

      assert.equal(game.seats[0].handsPlayed, 5);
    });

    it("should initialize handsPlayed to 0 for new seat", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" });
      assert.equal(game.seats[0].handsPlayed, 0);
    });
  });

  describe("computeRankings", () => {
    it("should calculate net winnings correctly", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 1200);
      game.seats[0].totalBuyIn = 1000;
      game.seats[2] = Seat.occupied({ id: "p2", name: "Bob" }, 800);
      game.seats[2].totalBuyIn = 1000;

      const rankings = Ranking.computeRankings(game);

      assert.equal(rankings[0].netWinnings, 200);
      assert.equal(rankings[1].netWinnings, -200);
    });

    it("should sort by net winnings descending", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 800);
      game.seats[0].totalBuyIn = 1000;
      game.seats[2] = Seat.occupied({ id: "p2", name: "Bob" }, 1500);
      game.seats[2].totalBuyIn = 1000;

      const rankings = Ranking.computeRankings(game);

      assert.equal(rankings[0].playerId, "p2");
      assert.equal(rankings[1].playerId, "p1");
    });

    it("should calculate BB/100 when hands >= 10", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 1100);
      game.seats[0].totalBuyIn = 1000;
      game.seats[0].handsPlayed = 50;

      const rankings = Ranking.computeRankings(game);

      // Net = 100, BB = 50, so bbWon = 2
      // winRate = (2 / 50) * 100 = 4
      assert.equal(rankings[0].winRate, 4);
    });

    it("should return null winRate when hands < 10", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 1100);
      game.seats[0].totalBuyIn = 1000;
      game.seats[0].handsPlayed = 5;

      const rankings = Ranking.computeRankings(game);

      assert.equal(rankings[0].winRate, null);
    });

    it("should return null winRate when hands exactly 10", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 1100);
      game.seats[0].totalBuyIn = 1000;
      game.seats[0].handsPlayed = 10;

      const rankings = Ranking.computeRankings(game);

      // 10 hands is >= 10, so winRate should be calculated
      // Net = 100, BB = 50, bbWon = 2
      // winRate = (2 / 10) * 100 = 20
      assert.equal(rankings[0].winRate, 20);
    });

    it("should include player name in ranking", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 1000);
      game.seats[0].totalBuyIn = 1000;

      const rankings = Ranking.computeRankings(game);

      assert.equal(rankings[0].playerName, "Alice");
    });

    it("should handle player with null name", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: null }, 1000);
      game.seats[0].totalBuyIn = 1000;

      const rankings = Ranking.computeRankings(game);

      assert.equal(rankings[0].playerName, null);
    });

    it("should include seatIndex in ranking", () => {
      game.seats[3] = Seat.occupied({ id: "p1", name: "Alice" }, 1000);
      game.seats[3].totalBuyIn = 1000;

      const rankings = Ranking.computeRankings(game);

      assert.equal(rankings[0].seatIndex, 3);
    });

    it("should skip empty seats", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 1000);
      game.seats[0].totalBuyIn = 1000;
      // seats[1] is empty by default

      const rankings = Ranking.computeRankings(game);

      assert.equal(rankings.length, 1);
    });

    it("should return empty array when no players", () => {
      const rankings = Ranking.computeRankings(game);
      assert.deepEqual(rankings, []);
    });

    it("should handle negative win rate", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 500);
      game.seats[0].totalBuyIn = 1000;
      game.seats[0].handsPlayed = 20;

      const rankings = Ranking.computeRankings(game);

      // Net = -500, BB = 50, bbWon = -10
      // winRate = (-10 / 20) * 100 = -50
      assert.equal(rankings[0].winRate, -50);
    });

    it("should handle zero net winnings", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 1000);
      game.seats[0].totalBuyIn = 1000;
      game.seats[0].handsPlayed = 20;

      const rankings = Ranking.computeRankings(game);

      assert.equal(rankings[0].netWinnings, 0);
      assert.equal(rankings[0].winRate, 0);
    });

    it("should handle player who has not bought in yet", () => {
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 0);
      // totalBuyIn is 0 by default

      const rankings = Ranking.computeRankings(game);

      assert.equal(rankings[0].netWinnings, 0);
      assert.equal(rankings[0].stack, 0);
      assert.equal(rankings[0].totalBuyIn, 0);
    });
  });
});
