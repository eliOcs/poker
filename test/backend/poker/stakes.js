import { describe, it } from "node:test";
import assert from "node:assert";
import {
  PRESETS,
  DEFAULT,
  isValidPreset,
} from "../../../src/backend/poker/stakes.js";

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
    it("is $1/$2 (100/200 cents)", () => {
      assert.deepStrictEqual(DEFAULT, {
        label: "$1/$2",
        small: 100,
        big: 200,
      });
    });

    it("is the 7th preset (index 6)", () => {
      assert.strictEqual(PRESETS.indexOf(DEFAULT), 6);
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
});
