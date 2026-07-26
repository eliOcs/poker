import { describe, it } from "node:test";
import assert from "node:assert";
import { calculateBlindStructure } from "../../../src/backend/poker/blind-calculator.js";

const BASE_OPTIONS = {
  playerCount: 10,
  startingStack: 5000,
  tournamentDurationMinutes: 180,
  levelDurationMinutes: 20,
  smallestChip: 25,
};

describe("blind-calculator", () => {
  it("builds a gradual structure through and beyond the target duration", () => {
    const structure = calculateBlindStructure(BASE_OPTIONS);

    assert.equal(structure.totalChips, 50_000);
    assert.equal(structure.targetLevel, 10);
    assert.equal(structure.levels.length, 13);
    assert.deepEqual(structure.levels[0], {
      level: 1,
      small: 25,
      big: 50,
      ante: 0,
      startsAtMinutes: 0,
    });
    assert.equal(structure.levels[9].startsAtMinutes, 180);
    assert.equal(structure.levels[12].startsAtMinutes, 240);
    assert.deepEqual(
      structure.levels.map(({ small }) => small),
      [25, 50, 75, 100, 175, 300, 500, 800, 1250, 2000, 3000, 6000, 10_000],
    );

    for (let index = 1; index < structure.levels.length; index += 1) {
      const previous = structure.levels[index - 1];
      const current = structure.levels[index];
      assert.ok(current.small > previous.small);
      assert.equal(current.big, current.small * 2);
      assert.equal(current.small % BASE_OPTIONS.smallestChip, 0);
    }
  });

  it("uses rebuys and add-ons only to increase the expected chip pool", () => {
    const withRebuys = calculateBlindStructure({
      ...BASE_OPTIONS,
      expectedRebuys: 4,
      rebuyStack: 5000,
    });
    const withAddOns = calculateBlindStructure({
      ...BASE_OPTIONS,
      expectedAddOns: 2,
      addOnStack: 10_000,
    });

    assert.equal(withRebuys.totalChips, 70_000);
    assert.deepEqual(withRebuys, withAddOns);
  });

  it("uses more gradual increases for a longer tournament", () => {
    const short = calculateBlindStructure({
      ...BASE_OPTIONS,
      tournamentDurationMinutes: 120,
    });
    const long = calculateBlindStructure({
      ...BASE_OPTIONS,
      tournamentDurationMinutes: 240,
    });

    assert.equal(short.targetLevel, 7);
    assert.equal(long.targetLevel, 13);
    assert.ok(short.levels[2].small > long.levels[2].small);
    assert.equal(
      short.levels[short.targetLevel - 1].small,
      long.levels[long.targetLevel - 1].small,
    );
  });

  it("honors a custom starting blind", () => {
    const structure = calculateBlindStructure({
      ...BASE_OPTIONS,
      startingSmallBlind: 100,
    });

    assert.equal(structure.levels[0].small, 100);
    assert.equal(structure.levels[0].big, 200);
  });

  it("introduces antes after four levels and lowers the finishing blinds", () => {
    const withoutAntes = calculateBlindStructure(BASE_OPTIONS);
    const withAntes = calculateBlindStructure({ ...BASE_OPTIONS, antes: true });

    assert.deepEqual(
      withAntes.levels.slice(0, 4).map(({ ante }) => ante),
      [0, 0, 0, 0],
    );
    assert.ok(withAntes.levels[4].ante > 0);
    assert.ok(
      withAntes.levels[withAntes.targetLevel - 1].small <
        withoutAntes.levels[withoutAntes.targetLevel - 1].small,
    );
  });

  it("rounds every blind and ante to the smallest chip", () => {
    const structure = calculateBlindStructure({
      ...BASE_OPTIONS,
      smallestChip: 5,
      startingSmallBlind: 15,
      antes: true,
    });

    for (const { small, big, ante } of structure.levels) {
      assert.equal(small % 5, 0);
      assert.equal(big % 5, 0);
      assert.equal(ante % 5, 0);
    }
  });

  it("rejects inputs that cannot produce a valid structure", () => {
    assert.throws(
      () => calculateBlindStructure({ ...BASE_OPTIONS, playerCount: 0 }),
      /playerCount must be a positive safe integer/,
    );
    assert.throws(
      () =>
        calculateBlindStructure({
          ...BASE_OPTIONS,
          startingSmallBlind: 30,
        }),
      /startingSmallBlind must be divisible by smallestChip/,
    );
    assert.throws(
      () =>
        calculateBlindStructure({
          ...BASE_OPTIONS,
          expectedRebuys: 1,
          rebuyStack: 0,
        }),
      /rebuyStack must be a positive safe integer/,
    );
  });
});
