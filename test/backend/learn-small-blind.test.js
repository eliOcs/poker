import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateLearnStrategy } from "../../src/backend/learn.js";

const ranges = JSON.parse(
  readFileSync(
    new URL("../../src/backend/learn-ranges.json", import.meta.url),
    "utf8",
  ),
);

function evaluate(opponent, stage, hand, frequencies = [100, 0, 0]) {
  return evaluateLearnStrategy({
    id: `SB_VS_${opponent}_${stage}-${hand}`,
    frequencies,
    raiseTo: stage === "OPEN" ? 10 : 100,
  });
}

for (const [opponent, stage, page, chart, count, published, totals] of [
  ["LJ", "OPEN", 230, 68, 169, [92.7, 0, 7.3], [93, 0, 7]],
  ["LJ", "4BET", 231, 69, 27, [33.8, 45.7, 20.6], [34, 46, 20]],
  ["HJ", "OPEN", 232, 70, 169, [91.3, 0, 8.7], [91, 0, 9]],
  ["HJ", "4BET", 233, 71, 32, [32.8, 46.8, 20], [33, 46, 21]],
  ["CO", "OPEN", 234, 72, 169, [89.1, 0, 10.9], [89, 0, 11]],
  ["CO", "4BET", 235, 73, 36, [29.2, 52.2, 18.6], [29, 52, 19]],
  ["BTN", "OPEN", 236, 74, 169, [85, 0, 15], [85, 0, 15]],
  ["BTN", "4BET", 237, 75, 45, [26.5, 56, 17.3], [27, 56, 17]],
]) {
  test(`SB vs ${opponent} ${stage} grades the source chart with out-of-position guidance`, () => {
    const hands = ranges[`SB_VS_${opponent}_${stage}`].hands;
    let weight = 0;
    const measured = [0, 0, 0];
    for (const [hand, mix] of Object.entries(hands)) {
      const result = evaluate(opponent, stage, hand, mix);
      assert.equal(result.grade, "correct");
      assert.equal(result.page, page);
      assert.equal(result.chart, chart);
      assert.equal(Object.keys(result.hands).length, count);
      assert.deepEqual(result.rangeTotals, totals);
      assert.deepEqual(
        result.lessonNotes,
        evaluate(opponent, stage, hand).lessonNotes,
      );
      assert.ok(result.lessonNotes.length >= 2);
      assert.match(
        result.explanation,
        new RegExp(`out of position against ${opponent}`),
      );
      assert.doesNotMatch(
        result.explanation,
        /in position|Acting last|act last|91.5 BB/,
      );
      if (stage === "OPEN") {
        assert.equal(mix[1], 0);
        assert.match(result.explanation, /BB is still to act/);
      }
      const combinations = hand.length === 2 ? 6 : hand.endsWith("s") ? 4 : 12;
      // The posted small blind is not an earlier voluntary action.
      const w =
        combinations *
        (stage === "OPEN"
          ? 1
          : ranges[`SB_VS_${opponent}_OPEN`].hands[hand][2] / 100);
      weight += w;
      mix.forEach((frequency, i) => (measured[i] += frequency * w));
    }
    measured.forEach((sum, i) =>
      assert.ok(Math.abs(sum / weight - published[i]) < 1),
    );
  });
}

test("SB widens its 3-bets by opener without adding calls", () => {
  for (const [opponent, hand, expected] of [
    ["LJ", "KQo", [100, 0, 0]],
    ["HJ", "KQo", [90, 0, 10]],
    ["HJ", "A9s", [75, 0, 25]],
    ["CO", "AJo", [50, 0, 50]],
    ["CO", "A8s", [85, 0, 15]],
    ["CO", "T9s", [55, 0, 45]],
    ["BTN", "ATo", [55, 0, 45]],
    ["BTN", "A7s", [0, 0, 100]],
  ])
    assert.deepEqual(evaluate(opponent, "OPEN", hand).expected, expected);
  for (const opponent of ["LJ", "HJ", "CO", "BTN"]) {
    assert.equal(
      evaluate(opponent, "OPEN", "AA", [0, 100, 0]).grade,
      "incorrect",
    );
    assert.match(
      evaluate(opponent, "OPEN", "AA").explanation,
      /3-betting to 10 BB/,
    );
    assert.throws(
      () => evaluate(opponent, "4BET", "72o"),
      /Invalid learning strategy/,
    );
  }
  const fold = evaluate("LJ", "OPEN", "72o");
  assert.match(fold.explanation, /0.5 BB already posted/);
  assert.match(fold.lessonNotes[0].text, /raked cash-game assumptions/);
});

test("SB retains selective calls and changes its 5-bet range against later openers", () => {
  for (const [opponent, hand, expected] of [
    ["LJ", "AA", [0, 35, 65]],
    ["LJ", "KK", [0, 20, 80]],
    ["LJ", "QQ", [0, 95, 5]],
    ["LJ", "JJ", [0, 90, 10]],
    ["LJ", "AQo", [100, 0, 0]],
    ["LJ", "KQs", [100, 0, 0]],
    ["LJ", "76s", [0, 100, 0]],
    ["HJ", "AQo", [95, 5, 0]],
    ["HJ", "KQs", [50, 50, 0]],
    ["HJ", "KJs", [45, 55, 0]],
    ["CO", "AA", [0, 60, 40]],
    ["CO", "A5s", [0, 90, 10]],
    ["CO", "ATs", [25, 70, 5]],
    ["CO", "A4s", [0, 100, 0]],
    ["CO", "A9s", [100, 0, 0]],
    ["BTN", "AA", [0, 100, 0]],
    ["BTN", "QQ", [0, 0, 100]],
    ["BTN", "A5s", [0, 25, 75]],
    ["BTN", "JJ", [0, 70, 30]],
    ["BTN", "TT", [0, 70, 30]],
  ])
    assert.deepEqual(evaluate(opponent, "4BET", hand).expected, expected);
  const aces = evaluate("BTN", "4BET", "AA", [0, 100, 0]);
  assert.equal(aces.grade, "correct");
  assert.match(aces.explanation, /Keeping AA in the calling range protects it/);
  assert.doesNotMatch(aces.explanation, /5-betting/);
  assert.equal(evaluate("BTN", "4BET", "AA", [0, 0, 100]).grade, "incorrect");
  assert.match(
    evaluate("LJ", "4BET", "76s").lessonNotes[1].text,
    /bluff combinations/,
  );
  assert.match(
    evaluate("CO", "4BET", "ATs").lessonNotes[2].text,
    /ATs and A5s/,
  );
});

test("SB uses its posted blind and 10 BB investment for pricing, legal raises and stack commitment", () => {
  for (const opponent of ["LJ", "HJ", "CO", "BTN"]) {
    const call = evaluate(opponent, "4BET", "AA");
    assert.match(call.explanation, /Calling the extra 13 BB/);
    assert.match(call.playability.situation[0].text, /13 ÷ \(34 \+ 13\) ~ 28%/);
    const shove = evaluate(opponent, "4BET", "AKs", [0, 0, 100]);
    assert.equal(shove.grade, "correct");
    assert.match(shove.explanation, /remaining 90 BB/);
    assert.match(
      shove.playability.situation[0].text,
      /including the 10 BB already committed/,
    );
    for (const [stage, legalMin] of [
      ["OPEN", 4],
      ["4BET", 36],
    ]) {
      const id = `SB_VS_${opponent}_${stage}-AA`;
      assert.doesNotThrow(() =>
        evaluateLearnStrategy({
          id,
          frequencies: [0, 0, 100],
          raiseTo: legalMin,
        }),
      );
      for (const raiseTo of [legalMin - 0.5, 100.5])
        assert.throws(
          () =>
            evaluateLearnStrategy({ id, frequencies: [0, 0, 100], raiseTo }),
          /Invalid learning strategy/,
        );
    }
  }
});

test("SB receives the actual opener and its opening-weighted 4-bet range", () => {
  for (const [opponent, openPage, fourBetPage] of [
    ["LJ", 200, 205],
    ["HJ", 194, 198],
    ["CO", 189, 192],
    ["BTN", 185, 187],
  ]) {
    for (const stage of ["OPEN", "4BET"]) {
      const { opponentRange } = evaluate(opponent, stage, "AA");
      assert.equal(opponentRange.position, opponent);
      assert.equal(
        opponentRange.page,
        stage === "OPEN" ? openPage : fourBetPage,
      );
      assert.equal(opponentRange.action, stage === "OPEN" ? "Open" : "4-bet");
      assert.equal(opponentRange.raiseTo, stage === "OPEN" ? 2.5 : 23);
      assert.equal(Object.keys(opponentRange.hands).length, 169);
      assert.equal(opponentRange.hands.AA.combinations, 1);
      assert.equal(opponentRange.hands["72o"].probability, 0);
      const entries = Object.entries(opponentRange.hands);
      assert.ok(
        Math.abs(
          entries.reduce((sum, [, hand]) => sum + hand.probability, 0) - 100,
        ) < 1e-10,
      );
      if (stage === "4BET")
        for (const [hand, entry] of entries)
          assert.equal(entry.openingFrequency, ranges[opponent].hands[hand][2]);
    }
    const { lessonNotes } = evaluateLearnStrategy({
      id: `${opponent}_RAISE_SB-AA`,
      frequencies: [100, 0, 0],
    });
    assert.ok(lessonNotes.length >= 2);
    assert.ok(
      lessonNotes.some(({ text }) => /out of position|acts first/.test(text)),
    );
  }
});
