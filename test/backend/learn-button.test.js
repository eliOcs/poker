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
    id: `BTN_VS_${opponent}_${stage}-${hand}`,
    frequencies,
    raiseTo: stage === "OPEN" ? 8.5 : 100,
  });
}

for (const [opponent, stage, page, chart, count, published, totals] of [
  ["LJ", "OPEN", 224, 62, 169, [85.8, 6.9, 7.3], [86, 7, 7]],
  ["LJ", "4BET", 225, 63, 44, [40.6, 40, 19.4], [40, 40, 20]],
  ["HJ", "OPEN", 226, 64, 169, [84.6, 6.5, 8.8], [85, 6, 9]],
  ["HJ", "4BET", 227, 65, 45, [40, 41.6, 18.4], [40, 41, 19]],
  ["CO", "OPEN", 228, 66, 169, [82.3, 5.4, 11.7], [83, 5, 12]],
  ["CO", "4BET", 229, 67, 44, [37.3, 45.2, 17.1], [38, 45, 17]],
]) {
  test(`BTN vs ${opponent} ${stage} grades all eligible hands and weights the correct range`, () => {
    const hands = ranges[`BTN_VS_${opponent}_${stage}`].hands;
    const measured = [0, 0, 0];
    let weight = 0;
    for (const [hand, mix] of Object.entries(hands)) {
      const answer = evaluate(opponent, stage, hand, mix);
      assert.equal(answer.grade, "correct");
      assert.equal(answer.page, page);
      assert.equal(answer.chart, chart);
      assert.equal(Object.keys(answer.hands).length, count);
      assert.deepEqual(answer.rangeTotals, totals);
      assert.ok(answer.lessonNotes.length >= 2);
      assert.deepEqual(
        answer.lessonNotes,
        evaluate(opponent, stage, hand).lessonNotes,
      );
      assert.match(
        answer.explanation,
        new RegExp(`position (?:on|against) ${opponent}`),
      );
      assert.doesNotMatch(
        answer.explanation,
        /3-bet-or-fold|four players behind|BTN would have position/,
      );
      const combinations = hand.length === 2 ? 6 : hand.endsWith("s") ? 4 : 12;
      const w =
        combinations *
        (stage === "OPEN"
          ? 1
          : ranges[`BTN_VS_${opponent}_OPEN`].hands[hand][2] / 100);
      weight += w;
      mix.forEach((frequency, i) => (measured[i] += frequency * w));
    }
    measured.forEach((sum, i) =>
      assert.ok(Math.abs(sum / weight - published[i]) < 1),
    );
    if (stage === "4BET")
      assert.throws(
        () => evaluate(opponent, stage, "72o"),
        /Invalid learning strategy/,
      );
  });
}

test("BTN keeps strong flat calls and adds blocker 3-bets against wider openers", () => {
  for (const [hand, mix] of [
    ["QQ", [0, 20, 80]],
    ["JJ", [0, 50, 50]],
    ["TT", [0, 60, 40]],
    ["99", [0, 75, 25]],
    ["AKo", [0, 20, 80]],
  ]) {
    const answer = evaluate("LJ", "OPEN", hand, mix);
    assert.deepEqual(answer.expected, mix);
    assert.match(answer.explanation, /Both blinds can still squeeze/);
    assert.match(
      answer.playability.situation[0].text,
      /2.5 ÷ \(4 \+ 2.5\) ~ 38%/,
    );
    assert.match(answer.lessonNotes[1].text, /QQ, JJ, TT, 99 and AKo/);
  }
  for (const hand of ["QJo", "ATo"]) {
    assert.deepEqual(evaluate("LJ", "OPEN", hand).expected, [100, 0, 0]);
    assert.deepEqual(evaluate("HJ", "OPEN", hand).expected, [85, 0, 15]);
    assert.ok(evaluate("CO", "OPEN", hand).expected[2] > 15);
  }
  for (const opponent of ["LJ", "HJ", "CO"]) {
    const fold = evaluate(opponent, "OPEN", "72o");
    assert.match(fold.explanation, /Both blinds are still to act/);
    assert.doesNotMatch(fold.explanation, /Calling the extra|3-betting to/);
  }
});

test("BTN adjusts premium 5-bets and calls by opener, including pure AA calls versus CO", () => {
  for (const [opponent, hand, mix] of [
    ["LJ", "AA", [0, 55, 45]],
    ["LJ", "QQ", [0, 95, 5]],
    ["LJ", "AKo", [0, 35, 65]],
    ["LJ", "AKs", [0, 0, 100]],
    ["HJ", "QQ", [0, 60, 40]],
    ["HJ", "KTs", [0, 100, 0]],
    ["HJ", "AQo", [30, 70, 0]],
    ["HJ", "JTs", [5, 95, 0]],
    ["CO", "AA", [0, 100, 0]],
    ["CO", "JJ", [0, 60, 40]],
    ["CO", "QQ", [0, 30, 70]],
    ["CO", "AKo", [0, 0, 100]],
    ["CO", "K9s", [30, 70, 0]],
  ])
    assert.deepEqual(evaluate(opponent, "4BET", hand).expected, mix);
  const aces = evaluate("CO", "4BET", "AA", [0, 100, 0]);
  assert.equal(aces.grade, "correct");
  assert.match(aces.explanation, /Keeping AA in the calling range protects it/);
  assert.doesNotMatch(aces.explanation, /5-betting all-in/);
  assert.match(
    aces.playability.situation[0].text,
    /14.5 ÷ \(33 \+ 14.5\) ~ 31%/,
  );
  assert.equal(evaluate("CO", "4BET", "AA", [0, 0, 100]).grade, "incorrect");
});

test("54s rarely 3-bets HJ but always calls the 4-bet when it gets there", () => {
  assert.deepEqual(evaluate("HJ", "OPEN", "54s").expected, [65, 30, 5]);
  const answer = evaluate("HJ", "4BET", "54s", [0, 100, 0]);
  assert.equal(answer.grade, "correct");
  assert.match(answer.lessonNotes[1].text, /only 3-bets it about 4%/);
  const { opponentRange } = evaluateLearnStrategy({
    id: "HJ_RAISE_BTN-AA",
    frequencies: [100, 0, 0],
  });
  assert.equal(opponentRange.hands["54s"].frequency, 5);
  assert.ok(opponentRange.hands["54s"].probability > 0);
  assert.ok(opponentRange.hands["54s"].probability < 1);
});

test("BTN feedback uses the actual opener and conditions 4-bets on the earlier open", () => {
  for (const [opponent, openPage, fourBetPage] of [
    ["LJ", 200, 204],
    ["HJ", 194, 197],
    ["CO", 189, 191],
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
      let total = 0;
      for (const [hand, entry] of Object.entries(opponentRange.hands)) {
        if (stage === "4BET")
          assert.equal(entry.openingFrequency, ranges[opponent].hands[hand][2]);
        else assert.equal(entry.openingFrequency, undefined);
        total += entry.probability;
      }
      assert.ok(Math.abs(total - 100) < 1e-10);
    }
    const { lessonNotes } = evaluateLearnStrategy({
      id: `${opponent}_RAISE_BTN-AA`,
      frequencies: [100, 0, 0],
    });
    assert.ok(lessonNotes.length >= 2);
    assert.ok(lessonNotes.some(({ text }) => /calls|calling/.test(text)));
    for (const [stage, invalidSize] of [
      ["OPEN", 3.5],
      ["4BET", 37],
      ["4BET", 100.5],
    ])
      assert.throws(
        () =>
          evaluateLearnStrategy({
            id: `BTN_VS_${opponent}_${stage}-KK`,
            frequencies: [0, 0, 100],
            raiseTo: invalidSize,
          }),
        /Invalid learning strategy/,
      );
  }
});
