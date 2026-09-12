import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createLearnScenario,
  evaluateLearnStrategy,
} from "../../src/backend/learn.js";
import { readFileSync } from "node:fs";
const ranges = JSON.parse(
  readFileSync(
    new URL("../../src/backend/learn-ranges.json", import.meta.url),
    "utf8",
  ),
);

test("opening ranges cover every hand and reproduce source totals", () => {
  const sourceTotals = { LJ: 17.1, HJ: 21.4, CO: 27.8, BTN: 43.4, SB: 24.4 };
  for (const [position, range] of Object.entries(ranges)) {
    assert.equal(Object.keys(range.hands).length, 169);
    let raiseTotal = 0;
    for (const [hand, frequencies] of Object.entries(range.hands)) {
      assert.equal(
        frequencies.reduce((a, b) => a + b),
        100,
      );
      assert.ok(frequencies.every((n) => n >= 0 && n <= 100));
      if (position !== "SB") assert.equal(frequencies[1], 0);
      raiseTotal +=
        (frequencies[2] *
          (hand.length === 2 ? 6 : hand.endsWith("s") ? 4 : 12)) /
        1326;
    }
    assert.ok(Math.abs(raiseTotal - sourceTotals[position]) < 0.3);
  }
});

test("deals six seats with the hero acting first in and no answer exposed", () => {
  for (let i = 0; i < 100; i++) {
    const scenario = createLearnScenario();
    assert.equal(scenario.seats.length, 6);
    const hero = scenario.seats.findIndex((s) => s.isCurrentPlayer);
    assert.ok(hero >= 0 && hero < 5);
    assert.deepEqual(
      scenario.seats.map((seat) => seat.player.name.replace("You · ", "")),
      ["UTG", "UTG+1", "CO", "BTN", "SB", "BB"],
    );
    assert.ok(scenario.seats.slice(0, hero).every((s) => s.folded));
    assert.ok(scenario.seats.slice(hero + 1).every((s) => !s.folded));
    const cards = scenario.seats[hero].cards;
    assert.notEqual(cards[0], cards[1]);
    assert.equal(cards[0][1] === cards[1][1], scenario.hand.endsWith("s"));
    assert.equal(scenario.expected, undefined);
    assert.equal(
      scenario.seats.reduce((total, s) => total + s.stack + s.bet, 0),
      300000,
    );
  }
});

test("grades actions, mix and sizing independently", () => {
  const answer = evaluateLearnStrategy({
    id: "BTN-AA",
    frequencies: [0, 0, 100],
    raiseTo: 3,
  });
  assert.equal(answer.actionsMatch, true);
  assert.equal(answer.frequencyMatch, true);
  assert.equal(answer.sizingMatch, false);
  const fold = evaluateLearnStrategy({
    id: "LJ-72o",
    frequencies: [100, 0, 0],
  });
  assert.equal(fold.actionsMatch, true);
  assert.equal(fold.sizingMatch, undefined);
  const wrong = evaluateLearnStrategy({
    id: "BTN-AA",
    frequencies: [100, 0, 0],
  });
  assert.equal(wrong.actionsMatch, false);
  assert.equal(wrong.frequencyMatch, false);
});

test("recognizes mixed strategies instead of marking any single permitted action correct", () => {
  const expected = ranges.SB.hands.AA;
  const answer = evaluateLearnStrategy({
    id: "SB-AA",
    frequencies: expected,
    raiseTo: 3,
  });
  assert.equal(answer.actionsMatch, true);
  assert.equal(answer.frequencyMatch, true);
  assert.equal(answer.sizingMatch, true);
  assert.equal(
    evaluateLearnStrategy({ id: "SB-AA", frequencies: [0, 0, 100], raiseTo: 3 })
      .frequencyMatch,
    false,
  );
});

test("rejects malformed or impossible submitted strategies", () => {
  for (const input of [
    undefined,
    {},
    { id: "toString-AA" },
    { id: "SB-AA-extra" },
    { id: "BTN-AA", frequencies: [10, 0, 100], raiseTo: 2.5 },
    { id: "BTN-AA", frequencies: [0, 0, 100], raiseTo: "2.5" },
    { id: "SB-AA", frequencies: [-5, 5, 100], raiseTo: 3 },
    { id: "SB-AA", frequencies: [0, 0, 100], raiseTo: 1 },
  ])
    assert.throws(
      () => evaluateLearnStrategy(input),
      /Invalid learning strategy/,
    );
});

test("grades exact mixes green, nearby mixes close, and wrong actions or sizes incorrect", () => {
  for (const [frequencies, raiseTo, grade] of [
    [[0, 40, 60], 3, "correct"],
    [[0, 55, 45], 3, "close"],
    [[0, 60, 40], 3, "incorrect"],
    [[5, 40, 55], 3, "incorrect"],
    [[0, 40, 60], 4, "close"],
    [[0, 55, 45], 4, "close"],
    [[0, 40, 60], 2, "close"],
    [[0, 40, 60], 4.01, "incorrect"],
  ]) {
    const result = evaluateLearnStrategy({ id: "SB-AA", frequencies, raiseTo });
    assert.equal(result.grade, grade);
  }
  const folded = evaluateLearnStrategy({
    id: "LJ-72o",
    frequencies: [100, 0, 0],
  });
  assert.equal(folded.grade, "correct");
  assert.equal(folded.distributionMatch, true);
  const queenFive = evaluateLearnStrategy({
    id: "SB-Q5s",
    frequencies: [0, 40, 60],
    raiseTo: 4,
  });
  assert.equal(queenFive.grade, "close");
  assert.equal(queenFive.sizingMatch, false);
});

test("grades first-in calls outside SB as learning mistakes, including mixed calls", () => {
  for (const position of ["LJ", "HJ", "CO", "BTN"]) {
    for (const frequencies of [
      [0, 100, 0],
      [0, 50, 50],
    ]) {
      const result = evaluateLearnStrategy({
        id: `${position}-AA`,
        frequencies,
        raiseTo: 2.5,
      });
      assert.equal(result.actionsMatch, false);
      assert.equal(result.frequencyMatch, false);
      assert.equal(result.expected[1], 0);
      assert.match(result.explanation, /never calls first in/);
    }
  }
});
