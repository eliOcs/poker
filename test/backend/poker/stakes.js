import { describe, it } from "node:test";
import assert from "node:assert";
import {
  PRESETS,
  DEFAULT,
  isValidPreset,
} from "../../../src/backend/poker/stakes.js";
import {
  getChipDenomination,
  decomposeChips,
} from "../../../src/shared/stakes.js";

describe("stakes", () => {
  describe("PRESETS", () => {
    it("has 11 preset options", () => {
      assert.strictEqual(PRESETS.length, 11);
    });

    it("starts with smallest stakes $0.01/$0.02 (1/2 cents)", () => {
      assert.deepStrictEqual(PRESETS[0], {
        label: "$0.01/$0.02",
        small: 1,
        big: 2,
      });
    });

    it("ends with largest stakes $10/$20 (1000/2000 cents)", () => {
      assert.deepStrictEqual(PRESETS[10], {
        label: "$10/$20",
        small: 1000,
        big: 2000,
      });
    });

    it("has big blind greater than small blind", () => {
      for (const preset of PRESETS) {
        assert.ok(preset.big > preset.small);
      }
    });
  });

  describe("DEFAULT", () => {
    it("is $0.02/$0.05 (2/5 cents)", () => {
      assert.deepStrictEqual(DEFAULT, {
        label: "$0.02/$0.05",
        small: 2,
        big: 5,
      });
    });

    it("is the 2nd preset (index 1)", () => {
      assert.strictEqual(PRESETS.indexOf(DEFAULT), 1);
    });
  });

  describe("isValidPreset", () => {
    it("returns true for valid preset (values in cents)", () => {
      assert.strictEqual(isValidPreset({ small: 100, big: 200 }), true); // $1/$2
      assert.strictEqual(isValidPreset({ small: 1, big: 2 }), true); // $0.01/$0.02
      assert.strictEqual(isValidPreset({ small: 1000, big: 2000 }), true); // $10/$20
    });

    it("returns false for invalid preset", () => {
      assert.strictEqual(isValidPreset({ small: 100, big: 300 }), false);
      assert.strictEqual(isValidPreset({ small: 50, big: 200 }), false);
      assert.strictEqual(isValidPreset({ small: 10000, big: 20000 }), false);
    });

    it("returns false for missing properties", () => {
      assert.strictEqual(isValidPreset({ small: 1 }), false);
      assert.strictEqual(isValidPreset({ big: 2 }), false);
      assert.strictEqual(isValidPreset({}), false);
    });
  });

  describe("getChipDenomination", () => {
    it("returns 1 cent for micro stakes ($0.01/$0.02)", () => {
      assert.strictEqual(getChipDenomination(1, 2), 1);
    });

    it("returns 5 cents for $0.05/$0.10", () => {
      assert.strictEqual(getChipDenomination(5, 10), 5);
    });

    it("returns 25 cents for $0.25/$0.50", () => {
      assert.strictEqual(getChipDenomination(25, 50), 25);
    });

    it("returns $1 for $1/$2 stakes", () => {
      assert.strictEqual(getChipDenomination(100, 200), 100);
    });

    it("returns $1 for $5/$10 stakes", () => {
      assert.strictEqual(getChipDenomination(500, 1000), 500);
    });

    it("returns $10 for $10/$20 stakes", () => {
      assert.strictEqual(getChipDenomination(1000, 2000), 1000);
    });

    it("returns $25 for $25/$50 stakes (sit-n-go)", () => {
      assert.strictEqual(getChipDenomination(2500, 5000), 2500);
    });

    it("returns largest chip that divides both blinds", () => {
      // $0.10/$0.25 - GCD is 5, so 5 cents
      assert.strictEqual(getChipDenomination(10, 25), 5);
      // $3/$6 - GCD is 300, chips: 100 divides both
      assert.strictEqual(getChipDenomination(300, 600), 100);
    });
  });

  describe("decomposeChips", () => {
    it("returns empty array for zero", () => {
      assert.deepStrictEqual(decomposeChips(0), []);
    });

    it("decomposes a single denomination exactly", () => {
      assert.deepStrictEqual(decomposeChips(100), [{ denom: 100, count: 1 }]);
    });

    it("decomposes into multiple chips of same denomination", () => {
      assert.deepStrictEqual(decomposeChips(300), [{ denom: 100, count: 3 }]);
    });

    it("decomposes into mixed denominations", () => {
      // $210 = 21000 cents = 2×$100 + 1×$10
      assert.deepStrictEqual(decomposeChips(21000), [
        { denom: 10000, count: 2 },
        { denom: 1000, count: 1 },
      ]);
    });

    it("handles small amounts with 1-cent chips", () => {
      assert.deepStrictEqual(decomposeChips(3), [{ denom: 1, count: 3 }]);
    });

    it("uses greedy decomposition from largest to smallest", () => {
      // $0.50 = 50 cents = 1×50
      assert.deepStrictEqual(decomposeChips(50), [{ denom: 50, count: 1 }]);
      // $0.76 = 76 cents = 1×50 + 1×25 + 1×1
      assert.deepStrictEqual(decomposeChips(76), [
        { denom: 50, count: 1 },
        { denom: 25, count: 1 },
        { denom: 1, count: 1 },
      ]);
    });

    it("decomposes a typical big blind ($0.50)", () => {
      assert.deepStrictEqual(decomposeChips(50), [{ denom: 50, count: 1 }]);
    });

    it("decomposes a large all-in amount", () => {
      // $537.25 = 53725 cents = 5×$100 + 1×$25 + 1×$10 + 1×$5 + 2×$1 + 1×$0.25
      assert.deepStrictEqual(decomposeChips(53725), [
        { denom: 10000, count: 5 },
        { denom: 2500, count: 1 },
        { denom: 1000, count: 1 },
        { denom: 100, count: 2 },
        { denom: 25, count: 1 },
      ]);
    });
  });
});
