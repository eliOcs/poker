import { test } from "node:test";
import assert from "node:assert/strict";
import { conditionLearnRange } from "../../src/backend/learn-opponent-range.js";
import { evaluateLearnStrategy } from "../../src/backend/learn.js";

test("conditional probabilities weight combinations and the observed action", () => {
  const range = {
    actions: ["call", "raise"],
    hands: { AA: [0, 100], A5s: [50, 50], "72o": [100, 0] },
  };
  const result = conditionLearnRange(range, "raise", "KK");
  assert.equal(result.totalWeight, 8);
  assert.deepEqual(result.hands.AA, {
    combinations: 6,
    blockedCombinations: 0,
    frequency: 100,
    probability: 75,
  });
  assert.deepEqual(result.hands.A5s, {
    combinations: 4,
    blockedCombinations: 0,
    frequency: 50,
    probability: 25,
  });
  assert.equal(result.hands["72o"].probability, 0);
  const blocked = conditionLearnRange(range, "raise", "AA");
  assert.equal(blocked.totalWeight, 2);
  assert.equal(blocked.hands.AA.combinations, 1);
  assert.equal(blocked.hands.A5s.combinations, 2);
  assert.equal(blocked.hands.AA.blockedCombinations, 5);
  assert.equal(blocked.hands.A5s.blockedCombinations, 2);
  assert.equal(blocked.hands.AA.probability, 50);
  assert.equal(blocked.hands.A5s.probability, 50);
  assert.equal(
    conditionLearnRange(range, "call", "KK").hands.AA.probability,
    0,
  );
});

for (const [hero, expected] of [
  ["AA", { AA: 1, AKs: 2, AKo: 6, KK: 6 }],
  ["AJs", { AA: 3, JJ: 3, AJs: 3, AJo: 6, AKs: 3, AKo: 9, KQs: 4 }],
  ["AJo", { AA: 3, JJ: 3, AJs: 2, AJo: 7, AKs: 3, AKo: 9, KQs: 4 }],
]) {
  test(`remaining combinations account for ${hero} blockers`, () => {
    const range = {
      actions: ["raise"],
      hands: Object.fromEntries(
        Object.keys(expected).map((hand) => [hand, [100]]),
      ),
    };
    const { hands } = conditionLearnRange(range, "raise", hero);
    for (const [hand, combinations] of Object.entries(expected))
      assert.equal(hands[hand].combinations, combinations);
  });
}

test("opponent probabilities normalize after blockers for paired, suited and offsuit lessons", () => {
  for (const hand of ["AA", "AJs", "AJo"]) {
    const result = evaluateLearnStrategy({
      id: `HJ_RAISE_CO-${hand}`,
      frequencies: [100, 0, 0],
    });
    const values = Object.values(result.opponentRange.hands);
    assert.equal(
      values.reduce((sum, h) => sum + h.combinations, 0),
      1225,
    );
    assert.ok(
      Math.abs(values.reduce((sum, h) => sum + h.probability, 0) - 100) < 1e-10,
    );
    assert.ok(values.every((h) => h.probability >= 0 && h.probability <= 100));
    assert.equal(result.opponentRange.hands["72o"].probability, 0);
  }
});

test("an impossible action cannot produce opponent probabilities", () => {
  assert.throws(
    () =>
      conditionLearnRange(
        { actions: ["raise"], hands: { AA: [0] } },
        "raise",
        "KK",
      ),
    /Opponent action has no valid range weight/,
  );
});

test("a later raise is weighted by how often each hand opened", () => {
  const opening = {
    actions: ["fold", "raise"],
    hands: { AA: [0, 100], A5s: [50, 50], "72o": [100, 0] },
  };
  const fourBet = {
    actions: ["call", "raise"],
    hands: { AA: [0, 100], A5s: [50, 50] },
  };
  const { hands, totalWeight } = conditionLearnRange(
    fourBet,
    "raise",
    "KK",
    opening,
  );
  assert.equal(totalWeight, 7);
  assert.equal(hands.AA.probability, 600 / 7);
  assert.equal(hands.A5s.probability, 100 / 7);
  assert.equal(hands.A5s.frequency, 50);
  assert.equal(hands.A5s.openingFrequency, 50);
  assert.equal(hands["72o"].probability, 0);
  const blocked = conditionLearnRange(fourBet, "raise", "AA", opening);
  assert.equal(blocked.totalWeight, 1.5);
  assert.equal(blocked.hands.AA.probability, 100 / 1.5);
  assert.equal(blocked.hands.A5s.probability, 50 / 1.5);
});
