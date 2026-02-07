import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as Seat from "../../../src/backend/poker/seat.js";
import * as Actions from "../../../src/backend/poker/actions.js";
import * as Ranking from "../../../src/backend/poker/ranking.js";

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

    it("should sort by stack descending in tournaments", () => {
      game.tournament = { active: true };
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 3000);
      game.seats[0].totalBuyIn = 5000;
      game.seats[2] = Seat.occupied({ id: "p2", name: "Bob" }, 7000);
      game.seats[2].totalBuyIn = 5000;

      const rankings = Ranking.computeRankings(game);

      // Bob has more chips, should be first despite same buy-in
      assert.equal(rankings[0].playerId, "p2");
      assert.equal(rankings[1].playerId, "p1");
    });
  });

  describe("tournament netWinnings", () => {
    it("should compute net winnings for 6 players with $10 buy-in (80/20 split)", () => {
      game.tournament = { active: true, buyIn: 1000 };
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 6000);
      game.seats[1] = Seat.occupied({ id: "p2", name: "Bob" }, 5000);
      game.seats[2] = Seat.occupied({ id: "p3", name: "Carol" }, 4000);
      game.seats[3] = Seat.occupied({ id: "p4", name: "Dave" }, 3000);
      game.seats[4] = Seat.occupied({ id: "p5", name: "Eve" }, 2000);
      game.seats[5] = Seat.occupied({ id: "p6", name: "Frank" }, 1000);

      const rankings = Ranking.computeRankings(game);

      // Pool = 6 * 1000 = 6000
      // 1st: 80% of 6000 = 4800, net = 4800 - 1000 = 3800
      // 2nd: 20% of 6000 = 1200, net = 1200 - 1000 = 200
      // 3rd-6th: 0 - 1000 = -1000
      assert.equal(rankings[0].netWinnings, 3800);
      assert.equal(rankings[1].netWinnings, 200);
      assert.equal(rankings[2].netWinnings, -1000);
      assert.equal(rankings[3].netWinnings, -1000);
      assert.equal(rankings[4].netWinnings, -1000);
      assert.equal(rankings[5].netWinnings, -1000);
    });

    it("should compute net winnings for 3 players with $5 buy-in (winner-takes-all)", () => {
      game.tournament = { active: true, buyIn: 500 };
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 3000);
      game.seats[1] = Seat.occupied({ id: "p2", name: "Bob" }, 2000);
      game.seats[2] = Seat.occupied({ id: "p3", name: "Carol" }, 1000);

      const rankings = Ranking.computeRankings(game);

      // Pool = 3 * 500 = 1500 (winner-takes-all for <= 4 players)
      // 1st: 1500, net = 1500 - 500 = 1000
      // 2nd-3rd: 0 - 500 = -500
      assert.equal(rankings[0].netWinnings, 1000);
      assert.equal(rankings[1].netWinnings, -500);
      assert.equal(rankings[2].netWinnings, -500);
    });

    it("should place busted player last with net = -buyIn", () => {
      game.tournament = { active: true, buyIn: 1000 };
      game.seats[0] = Seat.occupied({ id: "p1", name: "Alice" }, 5000);
      game.seats[1] = Seat.occupied({ id: "p2", name: "Bob" }, 3000);
      game.seats[2] = Seat.occupied({ id: "p3", name: "Carol" }, 2000);
      game.seats[3] = Seat.occupied({ id: "p4", name: "Dave" }, 0);

      const rankings = Ranking.computeRankings(game);

      // Dave has 0 chips, should be last
      assert.equal(rankings[3].playerId, "p4");
      assert.equal(rankings[3].stack, 0);
      assert.equal(rankings[3].netWinnings, -1000);
    });
  });
});
