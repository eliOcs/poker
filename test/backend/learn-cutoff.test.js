import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateLearnStrategy } from "../../src/backend/learn.js";
import { readFileSync } from "node:fs";
const ranges = JSON.parse(
  readFileSync(
    new URL("../../src/backend/learn-ranges.json", import.meta.url),
    "utf8",
  ),
);

for (const [key, page, chart, count, totals, previous, published] of [
  ["CO_VS_LJ_OPEN", 219, 58, 169, [91, 0, 9], undefined, [91.4, 0, 8.6]],
  ["CO_VS_HJ_OPEN", 221, 60, 169, [90, 0, 10], undefined, [90.1, 0, 9.9]],
  [
    "CO_VS_LJ_4BET",
    220,
    59,
    31,
    [37, 45, 18],
    "CO_VS_LJ_OPEN",
    [37.4, 45.1, 17.5],
  ],
  [
    "CO_VS_HJ_4BET",
    222,
    61,
    34,
    [37, 47, 16],
    "CO_VS_HJ_OPEN",
    [35.8, 48.2, 16.1],
  ],
]) {
  test(`${key} grades its chart, preserves the source totals and explains the range`, () => {
    let weight = 0;
    const measured = [0, 0, 0];
    for (const [hand, expected] of Object.entries(ranges[key].hands)) {
      const result = evaluateLearnStrategy({
        id: `${key}-${hand}`,
        frequencies: expected,
        raiseTo: previous ? 100 : 8.5,
      });
      assert.equal(result.grade, "correct");
      assert.equal(result.page, page);
      assert.equal(result.chart, chart);
      assert.equal(Object.keys(result.hands).length, count);
      assert.deepEqual(result.rangeTotals, totals);
      assert.equal(result.lessonNotes.length, 2);
      assert.deepEqual(
        result.lessonNotes,
        evaluateLearnStrategy({
          id: `${key}-${hand}`,
          frequencies: [100, 0, 0],
        }).lessonNotes,
      );
      const combinations = hand.length === 2 ? 6 : hand.endsWith("s") ? 4 : 12;
      const w =
        combinations * (previous ? ranges[previous].hands[hand][2] / 100 : 1);
      weight += w;
      expected.forEach((value, i) => (measured[i] += value * w));
    }
    measured.forEach((value, i) =>
      assert.ok(
        Math.abs(value / weight - published[i]) < 1,
        `${key} action ${i}`,
      ),
    );
  });
}

test("CO widens against HJ with selected suited hands while retaining 3-bet or fold", () => {
  for (const [hand, mix] of [
    ["A9s", [35, 0, 65]],
    ["QTs", [70, 0, 30]],
    ["JTs", [85, 0, 15]],
  ]) {
    const lj = evaluateLearnStrategy({
      id: `CO_VS_LJ_OPEN-${hand}`,
      frequencies: [100, 0, 0],
    });
    const hj = evaluateLearnStrategy({
      id: `CO_VS_HJ_OPEN-${hand}`,
      frequencies: mix,
      raiseTo: 8.5,
    });
    assert.deepEqual(lj.expected, [100, 0, 0]);
    assert.deepEqual(hj.expected, mix);
    assert.match(hj.explanation, /BTN and both blinds are still to act/);
    assert.match(hj.explanation, /HJ opens wider than LJ/);
    assert.doesNotMatch(hj.explanation, /four players|CO or BTN/);
    assert.match(lj.lessonNotes[0].text, /8.6%.*8.1%/);
    assert.match(hj.lessonNotes[0].text, /21%.*17%/);
  }
  for (const opponent of ["LJ", "HJ"]) {
    const result = evaluateLearnStrategy({
      id: `CO_VS_${opponent}_OPEN-AA`,
      frequencies: [0, 100, 0],
    });
    assert.equal(result.grade, "incorrect");
    assert.ok(Object.values(result.hands).every((mix) => mix[1] === 0));
    assert.throws(
      () =>
        evaluateLearnStrategy({
          id: `CO_VS_${opponent}_OPEN-AA`,
          frequencies: [0, 0, 100],
          raiseTo: 3.5,
        }),
      /Invalid learning strategy/,
    );
  }
});

test("CO retains premium slowplays against LJ and additional suited calls against HJ", () => {
  for (const [opponent, hand, expected] of [
    ["LJ", "AA", [0, 50, 50]],
    ["LJ", "KK", [0, 0, 100]],
    ["LJ", "AKs", [0, 0, 100]],
    ["LJ", "QQ", [0, 90, 10]],
    ["LJ", "AKo", [0, 45, 55]],
    ["LJ", "A5s", [60, 40, 0]],
    ["LJ", "A4s", [70, 30, 0]],
    ["HJ", "AA", [0, 60, 40]],
    ["HJ", "KJs", [0, 100, 0]],
    ["HJ", "ATs", [75, 25, 0]],
    ["HJ", "KTs", [80, 20, 0]],
  ]) {
    const result = evaluateLearnStrategy({
      id: `CO_VS_${opponent}_4BET-${hand}`,
      frequencies: expected,
      raiseTo: 100,
    });
    assert.equal(result.grade, "correct");
    assert.deepEqual(result.expected, expected);
    assert.match(
      result.explanation,
      new RegExp(`in position against ${opponent}`),
    );
    assert.ok(
      result.lessonNotes.some((note) =>
        /calling range|wider defense|wider 3-bet range/.test(note.text),
      ),
    );
  }
  const hj = evaluateLearnStrategy({
    id: "CO_VS_HJ_4BET-KJs",
    frequencies: [0, 100, 0],
  });
  assert.match(hj.explanation, /HJ’s wider starting range/);
  assert.match(hj.playability.situation[0].text, /14.5 ÷ \(33 \+ 14.5\) ~ 31%/);
  for (const opponent of ["LJ", "HJ"]) {
    assert.throws(
      () =>
        evaluateLearnStrategy({
          id: `CO_VS_${opponent}_4BET-72o`,
          frequencies: [100, 0, 0],
        }),
      /Invalid learning strategy/,
    );
    assert.throws(
      () =>
        evaluateLearnStrategy({
          id: `CO_VS_${opponent}_4BET-KK`,
          frequencies: [0, 0, 100],
          raiseTo: 37,
        }),
      /Invalid learning strategy/,
    );
    const shove = evaluateLearnStrategy({
      id: `CO_VS_${opponent}_4BET-KK`,
      frequencies: [0, 0, 100],
      raiseTo: 100,
    });
    assert.match(shove.explanation, /remaining 91.5 BB/);
    assert.match(
      shove.playability.situation[0].text,
      new RegExp(`${opponent}’s 23 BB`),
    );
  }
});

test("CO receives the correct opener's range at both decisions", () => {
  for (const [opponent, openPage, fourBetPage] of [
    ["LJ", 200, 203],
    ["HJ", 194, 196],
  ]) {
    for (const [stage, page, action, size] of [
      ["OPEN", openPage, "Open", 2.5],
      ["4BET", fourBetPage, "4-bet", 23],
    ]) {
      const { opponentRange } = evaluateLearnStrategy({
        id: `CO_VS_${opponent}_${stage}-AA`,
        frequencies: [100, 0, 0],
      });
      assert.equal(opponentRange.position, opponent);
      assert.equal(opponentRange.page, page);
      assert.equal(opponentRange.action, action);
      assert.equal(opponentRange.raiseTo, size);
      assert.equal(Object.keys(opponentRange.hands).length, 169);
      assert.equal(opponentRange.hands.AA.combinations, 1);
      assert.equal(opponentRange.hands["72o"].probability, 0);
      assert.ok(
        Math.abs(
          Object.values(opponentRange.hands).reduce(
            (sum, hand) => sum + hand.probability,
            0,
          ) - 100,
        ) < 1e-10,
      );
    }
  }
  for (const key of ["LJ_RAISE_CO", "HJ_RAISE_CO"]) {
    const { lessonNotes } = evaluateLearnStrategy({
      id: `${key}-AA`,
      frequencies: [100, 0, 0],
    });
    assert.equal(lessonNotes.length, 2);
  }
});
