import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateLearnStrategy } from "../../src/backend/learn.js";

test("HJ facing an LJ open uses the full 3-bet-or-fold chart and LJ's opening range", () => {
  const result = evaluateLearnStrategy({
    id: "HJ_VS_LJ_OPEN-22",
    frequencies: [90, 0, 10],
    raiseTo: 8.5,
  });
  assert.equal(result.grade, "correct");
  assert.equal(result.page, 217);
  assert.equal(result.chart, 56);
  assert.equal(Object.keys(result.hands).length, 169);
  assert.ok(Object.values(result.hands).every((mix) => mix[1] === 0));
  assert.match(result.explanation, /CO, BTN and both blinds are still to act/);
  assert.match(
    result.lessonNotes[0].text,
    /set potential across more flop textures/,
  );
  assert.doesNotMatch(result.explanation, /flop textures|blockers/);
  assert.doesNotMatch(result.explanation, /4-betting|act last/);
  assert.equal(result.opponentRange.position, "LJ");
  assert.equal(result.opponentRange.action, "Open");
  assert.equal(result.opponentRange.page, 200);
  assert.equal(result.opponentRange.raiseTo, 2.5);
  assert.equal(result.opponentRange.hands["22"].frequency, 10);
  assert.equal(
    evaluateLearnStrategy({ id: "HJ_VS_LJ_OPEN-72o", frequencies: [100, 0, 0] })
      .grade,
    "correct",
  );
  assert.equal(
    evaluateLearnStrategy({ id: "HJ_VS_LJ_OPEN-AA", frequencies: [0, 100, 0] })
      .grade,
    "incorrect",
  );
  assert.throws(
    () =>
      evaluateLearnStrategy({
        id: "HJ_VS_LJ_OPEN-AA",
        frequencies: [0, 0, 100],
        raiseTo: 3.5,
      }),
    /Invalid learning strategy/,
  );
});

test("HJ facing a 4-bet retains slowplays and grades a 100 BB shove", () => {
  const result = evaluateLearnStrategy({
    id: "HJ_VS_LJ_4BET-AA",
    frequencies: [0, 50, 50],
    raiseTo: 100,
  });
  assert.equal(result.grade, "correct");
  assert.equal(result.page, 218);
  assert.equal(result.chart, 57);
  assert.equal(Object.keys(result.hands).length, 32);
  assert.equal(result.hands["72o"], undefined);
  assert.deepEqual(result.hands["76s"], [0, 100, 0]);
  assert.match(result.explanation, /in position against LJ/);
  assert.match(
    result.lessonNotes[0].text,
    /Keeping AA among those calls protects/,
  );
  assert.doesNotMatch(result.explanation, /protects/);
  assert.match(result.explanation, /5-betting all-in commits/);
  assert.match(result.explanation, /remaining 91.5 BB/);
  const notes = result.playability.situation.map((note) => note.text).join(" ");
  assert.match(notes, /14.5 ÷ \(33 \+ 14.5\) ~ 31%/);
  assert.equal(
    evaluateLearnStrategy({
      id: "HJ_VS_LJ_4BET-KK",
      frequencies: [0, 0, 100],
      raiseTo: 100,
    }).grade,
    "correct",
  );
  assert.equal(
    evaluateLearnStrategy({ id: "HJ_VS_LJ_4BET-JJ", frequencies: [0, 100, 0] })
      .grade,
    "correct",
  );
  assert.throws(
    () =>
      evaluateLearnStrategy({
        id: "HJ_VS_LJ_4BET-72o",
        frequencies: [100, 0, 0],
      }),
    /Invalid learning strategy/,
  );
  assert.throws(
    () =>
      evaluateLearnStrategy({
        id: "HJ_VS_LJ_4BET-AA",
        frequencies: [0, 50, 50],
        raiseTo: 100.5,
      }),
    /Invalid learning strategy/,
  );
});

test("HJ's 4-bet opponent view includes the earlier LJ open and card removal", () => {
  const { opponentRange: range } = evaluateLearnStrategy({
    id: "HJ_VS_LJ_4BET-AA",
    frequencies: [100, 0, 0],
  });
  assert.equal(range.position, "LJ");
  assert.equal(range.action, "4-bet");
  assert.equal(range.page, 202);
  assert.equal(range.raiseTo, 23);
  assert.equal(Object.keys(range.hands).length, 169);
  assert.equal(range.hands.AA.combinations, 1);
  assert.equal(range.hands["72o"].probability, 0);
  const hands = Object.values(range.hands);
  assert.equal(
    hands.reduce((sum, hand) => sum + hand.combinations, 0),
    1225,
  );
  assert.ok(
    Math.abs(hands.reduce((sum, hand) => sum + hand.probability, 0) - 100) <
      1e-10,
  );
});
