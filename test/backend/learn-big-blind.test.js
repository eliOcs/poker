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
const cases = [
  ["LJ", "OPEN", 239, 76, 169, [71, 23, 6], [71.2, 22.8, 5.8], 1],
  ["LJ", "4BET", 240, 77, 55, [35, 43, 22], [36.4, 42.2, 21.4], 2],
  ["HJ", "OPEN", 241, 78, 169, [68, 24, 8], [68.5, 23.9, 7.6], 1],
  ["HJ", "4BET", 242, 79, 59, [37, 42, 21], [36.5, 42.5, 21], 1],
  ["CO", "OPEN", 243, 80, 169, [64, 26, 10], [64.6, 25.7, 9.7], 1],
  ["CO", "4BET", 244, 81, 66, [32, 49, 19], [31.5, 49.6, 18.8], 1],
  ["BTN", "OPEN", 245, 82, 169, [43, 44, 13], [43.2, 43.4, 13.4], 1],
  ["BTN", "4BET", 246, 83, 73, [20, 62, 18], [26.5, 54.1, 19.4], 9],
  ["SB", "OPEN", 247, 84, 169, [36, 48, 16], [35.4, 48.3, 16.3], 1],
  ["SB", "4BET", 248, 85, 99, [41, 46, 13], [41.2, 46.2, 12.6], 1],
  ["SB", "LIMP", 249, 86, 169, [59, 41], [59.4, 40.6], 1],
  ["SB", "LIMP_RAISE", 250, 87, 164, [51, 41, 8], [51.4, 41.3, 7.3], 1],
];

function answer(opponent, stage, hand, frequencies) {
  const key = `BB_VS_${opponent}_${stage}`;
  return evaluateLearnStrategy({
    id: `${key}-${hand}`,
    frequencies: frequencies ?? ranges[key].hands[hand],
    raiseTo: ranges[key].raiseTo,
  });
}

for (const [
  opponent,
  stage,
  page,
  chart,
  count,
  totals,
  published,
  tolerance,
] of cases) {
  test(`BB vs ${opponent} ${stage} grades its chart and preserves action and range semantics`, () => {
    const range = ranges[`BB_VS_${opponent}_${stage}`];
    const previous =
      stage === "4BET"
        ? ranges[`BB_VS_${opponent}_OPEN`]
        : stage === "LIMP_RAISE"
          ? ranges.BB_VS_SB_LIMP
          : undefined;
    const measured = range.actions.map(() => 0);
    let weight = 0;
    for (const [hand, frequencies] of Object.entries(range.hands)) {
      const result = answer(opponent, stage, hand);
      assert.equal(result.grade, "correct");
      assert.equal(result.page, page);
      assert.equal(result.chart, chart);
      assert.equal(Object.keys(result.hands).length, count);
      assert.deepEqual(result.rangeTotals, totals);
      assert.deepEqual(result.actions, range.actions);
      assert.equal(result.lessonNotes.length, 2);
      assert.doesNotMatch(
        result.explanation,
        /Both blinds|BB is still to act|BTN’s guaranteed/,
      );
      assert.match(
        result.explanation,
        opponent === "SB"
          ? /position on SB|in position against SB/
          : /out of position/,
      );
      const combinations = hand.length === 2 ? 6 : hand.endsWith("s") ? 4 : 12;
      const w =
        combinations *
        (previous
          ? previous.hands[hand][previous.actions.indexOf("raise")] / 100
          : 1);
      weight += w;
      frequencies.forEach((value, i) => (measured[i] += w * value));
    }
    measured.forEach((sum, i) =>
      assert.ok(Math.abs(sum / weight - published[i]) < tolerance),
    );
  });
}

test("BB calls with playable hands and widens against later openers", () => {
  for (const [opponent, hand, mix] of [
    ["LJ", "A9o", [100, 0, 0]],
    ["LJ", "K2s", [20, 80, 0]],
    ["LJ", "AQo", [0, 100, 0]],
    ["CO", "K8o", [100, 0, 0]],
    ["CO", "Q9o", [100, 0, 0]],
    ["BTN", "K8o", [0, 100, 0]],
    ["BTN", "Q9o", [0, 100, 0]],
    ["BTN", "32s", [0, 100, 0]],
  ])
    assert.deepEqual(answer(opponent, "OPEN", hand).expected, mix);
  const call = answer("LJ", "OPEN", "AQo");
  assert.match(call.explanation, /Calling the extra 1.5 BB guarantees a flop/);
  assert.match(call.playability.situation[0].text, /1.5 ÷ \(4 \+ 1.5\) ~ 27%/);
  assert.match(
    answer("SB", "OPEN", "ATo").explanation,
    /respond to SB’s decisions help you realize equity/,
  );
});

test("BB preserves measured slowplays and mixed shoves, including the inconsistent BTN source chart", () => {
  for (const [opponent, hand, mix] of [
    ["LJ", "AA", [0, 35, 65]],
    ["LJ", "A5s", [25, 40, 35]],
    ["HJ", "QQ", [0, 100, 0]],
    ["HJ", "JJ", [0, 75, 25]],
    ["HJ", "KJs", [50, 50, 0]],
    ["CO", "AA", [0, 50, 50]],
    ["CO", "AQo", [35, 65, 0]],
    ["BTN", "AA", [0, 90, 10]],
    ["BTN", "AKs", [0, 30, 70]],
    ["BTN", "A4s", [0, 85, 15]],
    ["SB", "AA", [0, 100, 0]],
    ["SB", "KK", [0, 65, 35]],
    ["SB", "AKs", [0, 85, 15]],
  ])
    assert.deepEqual(answer(opponent, "4BET", hand).expected, mix);
  assert.deepEqual(answer("BTN", "4BET", "AA").rangeTotals, [20, 62, 18]);
  assert.throws(
    () => answer("CO", "4BET", "44", [100, 0, 0]),
    /Invalid learning strategy/,
  );
  for (const opponent of ["LJ", "HJ", "CO", "BTN", "SB"])
    assert.throws(
      () => answer(opponent, "4BET", "72o", [100, 0, 0]),
      /Invalid learning strategy/,
    );
});

test("free checks have two actions, no pot-odds claim and no fold or call submission", () => {
  const result = answer("SB", "LIMP", "72o");
  assert.deepEqual(result.actions, ["check", "raise"]);
  assert.deepEqual(result.expected, [100, 0]);
  assert.doesNotMatch(result.explanation, /Check \d+%/);
  assert.match(result.explanation, /Checking costs nothing/);
  assert.deepEqual(result.playability.situation, []);
  assert.equal(result.sizingMatch, undefined);
  assert.equal(answer("SB", "LIMP", "AA").raiseTo, 3.5);
  for (const frequencies of [
    [100, 0, 0],
    [0, 100, 0],
    [50],
    [0, 50],
    [-5, 105],
  ])
    assert.throws(
      () => answer("SB", "LIMP", "72o", frequencies),
      /Invalid learning strategy/,
    );
  const mixed = answer("SB", "LIMP", "32s");
  assert.deepEqual(mixed.expected, [50, 50]);
  assert.doesNotMatch(mixed.explanation, /(?:Check|Raise) \d+%/);
  assert.match(mixed.explanation, /Checking costs nothing/);
  assert.match(mixed.explanation, /Raising to 3.5 BB/);
  assert.ok(
    mixed.playability.situation.every(({ text }) => !text.includes("Pot odds")),
  );
});

test("SB limp and limp-reraise probabilities use limp frequencies rather than opens", () => {
  const limp = answer("SB", "LIMP", "AA").opponentRange;
  assert.equal(limp.action, "Limp");
  assert.equal(limp.raiseTo, 1);
  for (const [hand, value] of Object.entries(limp.hands))
    assert.equal(value.frequency, ranges.SB.hands[hand][1]);
  const reraise = answer("SB", "LIMP_RAISE", "AA").opponentRange;
  assert.equal(reraise.openingAction, "Limp");
  assert.equal(reraise.page, 183);
  assert.equal(reraise.raiseTo, 13);
  let total = 0;
  for (const [hand, value] of Object.entries(reraise.hands)) {
    assert.equal(value.openingFrequency, ranges.SB.hands[hand][1]);
    assert.equal(value.frequency, ranges.SB_LIMP_BB.hands[hand]?.[2] ?? 0);
    total += value.combinations * value.openingFrequency * value.frequency;
  }
  for (const value of Object.values(reraise.hands))
    assert.ok(
      Math.abs(
        value.probability -
          (100 *
            value.combinations *
            value.openingFrequency *
            value.frequency) /
            total,
      ) < 1e-10,
    );
  assert.equal(reraise.hands.AA.combinations, 1);
});

test("BB follows actual blind-versus-blind sizes and legal minimums", () => {
  for (const [opponent, stage, hand, potOdds, commitment, min, reference] of [
    [
      "LJ",
      "4BET",
      "AA",
      /13 ÷ \(33.5 \+ 13\) ~ 28%/,
      /remaining 90 BB/,
      36,
      100,
    ],
    ["SB", "4BET", "KK", /15 ÷ \(33 \+ 15\) ~ 31%/, /remaining 91 BB/, 39, 100],
    [
      "SB",
      "LIMP_RAISE",
      "AA",
      /9.5 ÷ \(16.5 \+ 9.5\) ~ 37%/,
      /4-betting to 28 BB/,
      22.5,
      28,
    ],
  ]) {
    const result = answer(opponent, stage, hand);
    assert.match(result.explanation, commitment);
    assert.match(result.playability.situation[0].text, potOdds);
    assert.equal(result.raiseTo, reference);
    const id = `BB_VS_${opponent}_${stage}-${hand}`;
    assert.doesNotThrow(() =>
      evaluateLearnStrategy({ id, frequencies: [0, 0, 100], raiseTo: min }),
    );
    assert.throws(
      () =>
        evaluateLearnStrategy({
          id,
          frequencies: [0, 0, 100],
          raiseTo: min - 0.5,
        }),
      /Invalid learning strategy/,
    );
  }
  assert.match(
    answer("SB", "4BET", "KK").playability.situation[1].text,
    /SB’s 24 BB/,
  );
  assert.doesNotMatch(
    answer("SB", "LIMP_RAISE", "AA").playability.situation[1].text,
    /5-bet|remaining 90/,
  );
});
