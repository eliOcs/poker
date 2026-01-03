import { describe, it } from "node:test";
import assert from "assert";
import handRankings from "../../src/poker/hand-rankings.js";

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
        { name: "royal flush" },
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
        { name: "straight flush", suit: "hearts", from: "3", to: "7" },
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
        { name: "4 of a kind", of: "king", kicker: "3" },
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
        { name: "full house", of: "10", and: "3" },
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
        { name: "flush", suit: "diamonds", high: "queen" },
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
        { name: "straight", from: "ace", to: "5" },
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
        { name: "3 of a kind", of: "2", kickers: ["ace", "5"] },
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
        { name: "2 pair", of: "jack", and: "4", kicker: "9" },
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
        { name: "pair", of: "4", kickers: ["jack", "9", "3"] },
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
        { name: "high card", ranks: ["king", "jack", "9", "4", "3"] },
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
        ],
      );
    });

    describe("Royal Flush", function () {
      it("all Royal Flushes are equal", function () {
        assert.equal(
          handRankings.compare(
            { name: "royal flush" },
            { name: "royal flush" },
          ),
          0,
        );
      });
    });

    describe("Straight Flush", function () {
      it("highest wins", function () {
        assert(
          handRankings.compare(
            { name: "straight flush", suit: "hearts", from: "3", to: "7" },
            { name: "straight flush", suit: "hearts", from: "4", to: "8" },
          ) > 0,
        );
      });
    });

    describe("4 of a kind", function () {
      it("highest ranked wins", function () {
        assert(
          handRankings.compare(
            { name: "4 of a kind", of: "10", kicker: "3" },
            { name: "4 of a kind", of: "jack", kicker: "3" },
          ) > 0,
        );
      });

      it("highest kicker wins", function () {
        assert(
          handRankings.compare(
            { name: "4 of a kind", of: "10", kicker: "10" },
            { name: "4 of a kind", of: "10", kicker: "queen" },
          ) > 0,
        );
      });
    });

    describe("Full House", function () {
      it("highest triplet wins", function () {
        assert(
          handRankings.compare(
            { name: "full house", of: "9", and: "3" },
            { name: "full house", of: "10", and: "3" },
          ) > 0,
        );
      });

      it("highest pair wins", function () {
        assert(
          handRankings.compare(
            { name: "full house", of: "10", and: "3" },
            { name: "full house", of: "10", and: "4" },
          ) > 0,
        );
      });
    });

    describe("Flush", function () {
      it("highest wins", function () {
        assert(
          handRankings.compare(
            { name: "flush", suit: "diamonds", high: "jack" },
            { name: "flush", suit: "diamonds", high: "queen" },
          ) > 0,
        );
      });
    });

    describe("3 of a kind", function () {
      it("highest triplet wins", function () {
        assert(
          handRankings.compare(
            { name: "3 of a kind", of: "2", kickers: ["ace", "5"] },
            { name: "3 of a kind", of: "3", kickers: ["ace", "5"] },
          ) > 0,
        );
      });

      it("highest kicker wins", function () {
        assert(
          handRankings.compare(
            { name: "3 of a kind", of: "3", kickers: ["ace", "5"] },
            { name: "3 of a kind", of: "3", kickers: ["ace", "king"] },
          ) > 0,
        );
      });
    });

    describe("2 pair", function () {
      it("highest pair wins", function () {
        assert(
          handRankings.compare(
            { name: "2 pair", of: "jack", and: "7", kicker: "9" },
            { name: "2 pair", of: "queen", and: "4", kicker: "9" },
          ) > 0,
        );
      });

      it("highest second pair wins", function () {
        assert(
          handRankings.compare(
            { name: "2 pair", of: "jack", and: "4", kicker: "9" },
            { name: "2 pair", of: "jack", and: "7", kicker: "9" },
          ) > 0,
        );
      });

      it("highest kicker  wins", function () {
        assert(
          handRankings.compare(
            { name: "2 pair", of: "jack", and: "4", kicker: "9" },
            { name: "2 pair", of: "jack", and: "7", kicker: "9" },
          ) > 0,
        );
      });
    });

    describe("pair", function () {
      it("highest pair wins", function () {
        assert(
          handRankings.compare(
            { name: "pair", of: "4", kickers: ["jack", "9", "3"] },
            { name: "pair", of: "9", kickers: ["jack", "4", "3"] },
          ) > 0,
        );
      });

      it("highest kicker wins", function () {
        assert(
          handRankings.compare(
            { name: "pair", of: "9", kickers: ["jack", "4", "2"] },
            { name: "pair", of: "9", kickers: ["jack", "4", "3"] },
          ) > 0,
        );
      });
    });

    describe("high card", function () {
      assert(
        handRankings.compare(
          {
            name: "high card",
            ranks: ["king", "jack", "9", "4", "3"],
          },
          {
            name: "high card",
            ranks: ["king", "jack", "9", "5", "3"],
          },
        ) > 0,
      );
    });
  });

  describe("bestCombination", function () {
    it("should return the best hand of all the possible combinations", function () {
      const result = handRankings.bestCombination([
        { suit: "clubs", rank: "queen" },
        { suit: "diamonds", rank: "ace" },
        { suit: "diamonds", rank: "9" },
        { suit: "spades", rank: "2" },
        { suit: "diamonds", rank: "7" },
        { suit: "spades", rank: "5" },
        { suit: "clubs", rank: "7" },
      ]);
      assert.deepEqual(result.hand, {
        kickers: ["ace", "queen", "9"],
        name: "pair",
        of: "7",
      });
      assert.equal(result.cards.length, 5);
    });

    it("should return the cards that form the best hand", function () {
      const result = handRankings.bestCombination([
        { suit: "spades", rank: "ace" },
        { suit: "hearts", rank: "ace" },
        { suit: "diamonds", rank: "king" },
        { suit: "clubs", rank: "queen" },
        { suit: "hearts", rank: "9" },
        { suit: "spades", rank: "5" },
        { suit: "clubs", rank: "2" },
      ]);
      assert.equal(result.hand.name, "pair");
      assert.equal(result.hand.of, "ace");
      assert.equal(result.cards.length, 5);
      // Verify the two aces are in the winning cards
      const aces = result.cards.filter((c) => c.rank === "ace");
      assert.equal(aces.length, 2);
    });
  });
});
