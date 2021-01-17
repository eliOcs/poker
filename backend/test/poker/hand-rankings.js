import assert from "assert";
import tap from "tap";
import handRankings from "../../src/poker/hand-rankings.js";

const { describe, it } = tap.mocha;

describe("Hand Rankings", function () {
  describe("calculate", function () {
    it("Royal Flush", function () {
      assert.deepEqual(
        handRankings.calculate([
          { rank: "queen", suit: "clubs" },
          { rank: "jack", suit: "clubs" },
          { rank: "ace", suit: "clubs" },
          { rank: "10", suit: "clubs" },
          { rank: "king", suit: "clubs" },
        ]),
        { name: "royal flush" }
      );
    });

    it("Straight Flush", function () {
      assert.deepEqual(
        handRankings.calculate([
          { rank: "7", suit: "hearts" },
          { rank: "3", suit: "hearts" },
          { rank: "5", suit: "hearts" },
          { rank: "4", suit: "hearts" },
          { rank: "6", suit: "hearts" },
        ]),
        { name: "straight flush", suit: "hearts", from: "3", to: "7" }
      );
    });

    it("4 of a kind", function () {
      assert.deepEqual(
        handRankings.calculate([
          { rank: "king", suit: "spades" },
          { rank: "3", suit: "hearts" },
          { rank: "king", suit: "hearts" },
          { rank: "king", suit: "clubs" },
          { rank: "king", suit: "diamonds" },
        ]),
        { name: "4 of a kind", of: "king", kicker: "3" }
      );
    });

    it("Full House", function () {
      assert.deepEqual(
        handRankings.calculate([
          { rank: "3", suit: "hearts" },
          { rank: "10", suit: "hearts" },
          { rank: "3", suit: "diamonds" },
          { rank: "10", suit: "clubs" },
          { rank: "10", suit: "spades" },
        ]),
        { name: "full house", of: "10", and: "3" }
      );
    });

    it("Flush", function () {
      assert.deepEqual(
        handRankings.calculate([
          { rank: "queen", suit: "diamonds" },
          { rank: "10", suit: "diamonds" },
          { rank: "7", suit: "diamonds" },
          { rank: "4", suit: "diamonds" },
          { rank: "2", suit: "diamonds" },
        ]),
        { name: "flush", suit: "diamonds", high: "queen" }
      );
    });

    it("Straight", function () {
      assert.deepEqual(
        handRankings.calculate([
          { rank: "2", suit: "diamonds" },
          { rank: "5", suit: "hearts" },
          { rank: "3", suit: "hearts" },
          { rank: "ace", suit: "clubs" },
          { rank: "4", suit: "splades" },
        ]),
        { name: "straight", from: "ace", to: "5" }
      );
    });

    it("3 of a kind", function () {
      assert.deepEqual(
        handRankings.calculate([
          { rank: "ace", suit: "clubs" },
          { rank: "2", suit: "diamonds" },
          { rank: "2", suit: "hearts" },
          { rank: "5", suit: "hearts" },
          { rank: "2", suit: "splades" },
        ]),
        { name: "3 of a kind", of: "2", kickers: ["ace", "5"] }
      );
    });

    it("2 pair", function () {
      assert.deepEqual(
        handRankings.calculate([
          { rank: "jack", suit: "clubs" },
          { rank: "4", suit: "diamonds" },
          { rank: "jack", suit: "hearts" },
          { rank: "4", suit: "hearts" },
          { rank: "9", suit: "splades" },
        ]),
        { name: "2 pair", of: "jack", and: "4", kicker: "9" }
      );
    });

    it("Pair", function () {
      assert.deepEqual(
        handRankings.calculate([
          { rank: "3", suit: "clubs" },
          { rank: "jack", suit: "hearts" },
          { rank: "4", suit: "diamonds" },
          { rank: "4", suit: "hearts" },
          { rank: "9", suit: "splades" },
        ]),
        { name: "pair", of: "4", kickers: ["jack", "9", "3"] }
      );
    });

    it("High card", function () {
      assert.deepEqual(
        handRankings.calculate([
          { rank: "3", suit: "clubs" },
          { rank: "jack", suit: "hearts" },
          { rank: "4", suit: "diamonds" },
          { rank: "king", suit: "hearts" },
          { rank: "9", suit: "splades" },
        ]),
        { name: "high card", ranks: ["king", "jack", "9", "4", "3"] }
      );
    });
  });

  describe("compare", function () {
    it("should correcly rank by hand type", function () {
      assert.deepEqual(
        [
          { name: "pair", of: "4", kickers: ["jack", "9", "3"] },
          { name: "full house", of: "10", and: "3" },
          { name: "royal flush" },
          { name: "high card", ranks: ["king", "jack", "9", "4", "3"] },
          { name: "3 of a kind", of: "2", kickers: ["ace", "5"] },
          { name: "2 pair", of: "jack", and: "4", kicker: "9" },
          { name: "straight flush", suit: "hearts", from: "3", to: "7" },
          { name: "flush", suit: "diamonds", high: "queen" },
          { name: "4 of a kind", of: "king", kicker: "3" },
        ].sort(handRankings.compare),
        [
          { name: "royal flush" },
          { name: "straight flush", suit: "hearts", from: "3", to: "7" },
          { name: "4 of a kind", of: "king", kicker: "3" },
          { name: "full house", of: "10", and: "3" },
          { name: "flush", suit: "diamonds", high: "queen" },
          { name: "3 of a kind", of: "2", kickers: ["ace", "5"] },
          { name: "2 pair", of: "jack", and: "4", kicker: "9" },
          { name: "pair", of: "4", kickers: ["jack", "9", "3"] },
          { name: "high card", ranks: ["king", "jack", "9", "4", "3"] },
        ]
      );
    });
  });
});
