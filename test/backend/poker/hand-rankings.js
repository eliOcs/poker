import { describe, it } from "node:test";
import assert from "assert";
import handRankings from "../../../src/backend/poker/hand-rankings.js";

describe("Hand Rankings", function () {
  describe("calculate", function () {
    it("Royal Flush", function () {
      assert.deepEqual(handRankings.calculate(["Qc", "Jc", "Ac", "Tc", "Kc"]), {
        name: "royal flush",
      });
    });

    it("Straight Flush", function () {
      assert.deepEqual(handRankings.calculate(["7h", "3h", "5h", "4h", "6h"]), {
        name: "straight flush",
        suit: "h",
        from: "3",
        to: "7",
      });
    });

    it("4 of a kind", function () {
      assert.deepEqual(handRankings.calculate(["Ks", "3h", "Kh", "Kc", "Kd"]), {
        name: "4 of a kind",
        of: "K",
        kicker: "3",
      });
    });

    it("Full House", function () {
      assert.deepEqual(handRankings.calculate(["3h", "Th", "3d", "Tc", "Ts"]), {
        name: "full house",
        of: "T",
        and: "3",
      });
    });

    it("Flush", function () {
      assert.deepEqual(handRankings.calculate(["Qd", "Td", "7d", "4d", "2d"]), {
        name: "flush",
        suit: "d",
        high: "Q",
      });
    });

    it("Straight", function () {
      assert.deepEqual(handRankings.calculate(["2d", "5h", "3h", "Ac", "4s"]), {
        name: "straight",
        from: "A",
        to: "5",
      });
    });

    it("3 of a kind", function () {
      assert.deepEqual(handRankings.calculate(["Ac", "2d", "2h", "5h", "2s"]), {
        name: "3 of a kind",
        of: "2",
        kickers: ["A", "5"],
      });
    });

    it("2 pair", function () {
      assert.deepEqual(handRankings.calculate(["Jc", "4d", "Jh", "4h", "9s"]), {
        name: "2 pair",
        of: "J",
        and: "4",
        kicker: "9",
      });
    });

    it("Pair", function () {
      assert.deepEqual(handRankings.calculate(["3c", "Jh", "4d", "4h", "9s"]), {
        name: "pair",
        of: "4",
        kickers: ["J", "9", "3"],
      });
    });

    it("High card", function () {
      assert.deepEqual(handRankings.calculate(["3c", "Jh", "4d", "Kh", "9s"]), {
        name: "high card",
        ranks: ["K", "J", "9", "4", "3"],
      });
    });
  });

  describe("compare", function () {
    it("should correcly rank by hand type", function () {
      assert.deepEqual(
        [
          { name: "pair", of: "4", kickers: ["J", "9", "3"] },
          { name: "full house", of: "T", and: "3" },
          { name: "royal flush" },
          { name: "high card", ranks: ["K", "J", "9", "4", "3"] },
          { name: "3 of a kind", of: "2", kickers: ["A", "5"] },
          { name: "2 pair", of: "J", and: "4", kicker: "9" },
          { name: "straight flush", suit: "h", from: "3", to: "7" },
          { name: "flush", suit: "d", high: "Q" },
          { name: "4 of a kind", of: "K", kicker: "3" },
        ].sort(handRankings.compare),
        [
          { name: "royal flush" },
          { name: "straight flush", suit: "h", from: "3", to: "7" },
          { name: "4 of a kind", of: "K", kicker: "3" },
          { name: "full house", of: "T", and: "3" },
          { name: "flush", suit: "d", high: "Q" },
          { name: "3 of a kind", of: "2", kickers: ["A", "5"] },
          { name: "2 pair", of: "J", and: "4", kicker: "9" },
          { name: "pair", of: "4", kickers: ["J", "9", "3"] },
          { name: "high card", ranks: ["K", "J", "9", "4", "3"] },
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
            { name: "straight flush", suit: "h", from: "3", to: "7" },
            { name: "straight flush", suit: "h", from: "4", to: "8" },
          ) > 0,
        );
      });
    });

    describe("4 of a kind", function () {
      it("highest ranked wins", function () {
        assert(
          handRankings.compare(
            { name: "4 of a kind", of: "T", kicker: "3" },
            { name: "4 of a kind", of: "J", kicker: "3" },
          ) > 0,
        );
      });

      it("highest kicker wins", function () {
        assert(
          handRankings.compare(
            { name: "4 of a kind", of: "T", kicker: "T" },
            { name: "4 of a kind", of: "T", kicker: "Q" },
          ) > 0,
        );
      });
    });

    describe("Full House", function () {
      it("highest triplet wins", function () {
        assert(
          handRankings.compare(
            { name: "full house", of: "9", and: "3" },
            { name: "full house", of: "T", and: "3" },
          ) > 0,
        );
      });

      it("highest pair wins", function () {
        assert(
          handRankings.compare(
            { name: "full house", of: "T", and: "3" },
            { name: "full house", of: "T", and: "4" },
          ) > 0,
        );
      });
    });

    describe("Flush", function () {
      it("highest wins", function () {
        assert(
          handRankings.compare(
            { name: "flush", suit: "d", high: "J" },
            { name: "flush", suit: "d", high: "Q" },
          ) > 0,
        );
      });
    });

    describe("3 of a kind", function () {
      it("highest triplet wins", function () {
        assert(
          handRankings.compare(
            { name: "3 of a kind", of: "2", kickers: ["A", "5"] },
            { name: "3 of a kind", of: "3", kickers: ["A", "5"] },
          ) > 0,
        );
      });

      it("highest kicker wins", function () {
        assert(
          handRankings.compare(
            { name: "3 of a kind", of: "3", kickers: ["A", "5"] },
            { name: "3 of a kind", of: "3", kickers: ["A", "K"] },
          ) > 0,
        );
      });

      it("identical hands are a tie", function () {
        // This reproduces the production bug in hand ml1c1ixx2027/13
        // Both players had QQQ with A, T kickers - should be a split pot
        assert.strictEqual(
          handRankings.compare(
            { name: "3 of a kind", of: "Q", kickers: ["A", "T"] },
            { name: "3 of a kind", of: "Q", kickers: ["A", "T"] },
          ),
          0,
        );
      });
    });

    describe("2 pair", function () {
      it("highest pair wins", function () {
        assert(
          handRankings.compare(
            { name: "2 pair", of: "J", and: "7", kicker: "9" },
            { name: "2 pair", of: "Q", and: "4", kicker: "9" },
          ) > 0,
        );
      });

      it("highest second pair wins", function () {
        assert(
          handRankings.compare(
            { name: "2 pair", of: "J", and: "4", kicker: "9" },
            { name: "2 pair", of: "J", and: "7", kicker: "9" },
          ) > 0,
        );
      });

      it("highest kicker  wins", function () {
        assert(
          handRankings.compare(
            { name: "2 pair", of: "J", and: "4", kicker: "9" },
            { name: "2 pair", of: "J", and: "7", kicker: "9" },
          ) > 0,
        );
      });
    });

    describe("pair", function () {
      it("highest pair wins", function () {
        assert(
          handRankings.compare(
            { name: "pair", of: "4", kickers: ["J", "9", "3"] },
            { name: "pair", of: "9", kickers: ["J", "4", "3"] },
          ) > 0,
        );
      });

      it("highest kicker wins", function () {
        assert(
          handRankings.compare(
            { name: "pair", of: "9", kickers: ["J", "4", "2"] },
            { name: "pair", of: "9", kickers: ["J", "4", "3"] },
          ) > 0,
        );
      });
    });

    describe("high card", function () {
      assert(
        handRankings.compare(
          {
            name: "high card",
            ranks: ["K", "J", "9", "4", "3"],
          },
          {
            name: "high card",
            ranks: ["K", "J", "9", "5", "3"],
          },
        ) > 0,
      );
    });
  });

  describe("bestCombination", function () {
    it("should return the best hand of all the possible combinations", function () {
      const result = handRankings.bestCombination([
        "Qc",
        "Ad",
        "9d",
        "2s",
        "7d",
        "5s",
        "7c",
      ]);
      assert.deepEqual(result.hand, {
        kickers: ["A", "Q", "9"],
        name: "pair",
        of: "7",
      });
      assert.equal(result.cards.length, 5);
    });

    it("should return the cards that form the best hand", function () {
      const result = handRankings.bestCombination([
        "As",
        "Ah",
        "Kd",
        "Qc",
        "9h",
        "5s",
        "2c",
      ]);
      assert.equal(result.hand.name, "pair");
      assert.equal(result.hand.of, "A");
      assert.equal(result.cards.length, 5);
      // Verify the two aces are in the winning cards
      const aces = result.cards.filter((c) => c.startsWith("A"));
      assert.equal(aces.length, 2);
    });
  });
});
