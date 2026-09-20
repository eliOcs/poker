import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateLearnStrategy } from "../../src/backend/learn.js";
import { LEARN_SITUATION_KEYS } from "../../src/backend/learn-situations.js";
import { readFileSync } from "node:fs";

const ranges = JSON.parse(
  readFileSync(
    new URL("../../src/backend/learn-ranges.json", import.meta.url),
    "utf8",
  ),
);

function combinations(hand) {
  return hand.length === 2 ? 6 : hand.endsWith("s") ? 4 : 12;
}

test("follow-up feedback includes the opponent's preceding raising range", () => {
  const sources = {
    LJ_RAISE_HJ: [217, 56, 8.1],
    LJ_RAISE_CO: [219, 58, 8.6],
    HJ_RAISE_CO: [221, 60, 9.9],
    LJ_RAISE_BTN: [224, 62, 7.3],
    HJ_RAISE_BTN: [226, 64, 8.8],
    CO_RAISE_BTN: [228, 66, 11.7],
    LJ_RAISE_SB: [230, 68, 7.3],
    HJ_RAISE_SB: [232, 70, 8.7],
    CO_RAISE_SB: [234, 72, 10.9],
    BTN_RAISE_SB: [236, 74, 15],
    LJ_RAISE_BB: [239, 76, 5.8],
    HJ_RAISE_BB: [241, 78, 7.6],
    CO_RAISE_BB: [243, 80, 9.7],
    BTN_RAISE_BB: [245, 82, 13.4],
    SB_RAISE_BB: [247, 84, 16.3],
    SB_LIMP_BB: [249, 86, 40.6],
  };
  for (const key of LEARN_SITUATION_KEYS) {
    const { opponentRange } = evaluateLearnStrategy({
      id: `${key}-AA`,
      frequencies: [100, 0, 0],
    });
    if (!key.includes("_")) {
      assert.equal(opponentRange, undefined);
      continue;
    }
    const [page, chart, published] = sources[key];
    const [hero, priorAction, opponent] = key.split("_");
    assert.equal(opponentRange.position, opponent);
    assert.equal(
      opponentRange.action,
      priorAction === "LIMP" ? "Raise" : "3-bet",
    );
    assert.equal(
      opponentRange.raiseTo,
      priorAction === "LIMP"
        ? 3.5
        : hero === "SB"
          ? 9
          : ["SB", "BB"].includes(opponent)
            ? 10
            : 8.5,
    );
    assert.equal(opponentRange.page, page);
    assert.equal(opponentRange.chart, chart);
    assert.equal(Object.keys(opponentRange.hands).length, 169);
    assert.equal(opponentRange.hands.AA.frequency, 100);
    let total = 0;
    for (const [hand, { frequency }] of Object.entries(opponentRange.hands)) {
      assert.ok(Number.isInteger(frequency / 5));
      assert.ok(frequency >= 0);
      assert.ok(frequency <= 100);
      total += (frequency * combinations(hand)) / 1326;
    }
    assert.ok(Math.abs(total - published) < 1, `${key}: ${total}`);
    assert.deepEqual(
      evaluateLearnStrategy({
        id: `${key}-AA`,
        frequencies: [0, 0, 100],
        raiseTo: ranges[key].raiseTo,
      }).opponentRange,
      opponentRange,
    );
  }
  const result = evaluateLearnStrategy({
    id: "BTN_RAISE_SB-AA",
    frequencies: [100, 0, 0],
  });
  assert.equal(result.opponentRange.hands.A4s.frequency, 75);
  assert.equal(result.opponentRange.hands["72o"].probability, 0);
});

test("shared strategies preserve all actions, including checks against a limp", () => {
  for (const range of Object.values(ranges)) {
    for (const frequencies of Object.values(range.hands)) {
      assert.equal(frequencies.length, range.actions.length);
      assert.equal(
        frequencies.reduce((sum, value) => sum + value, 0),
        100,
      );
      assert.ok(
        frequencies.every(
          (value) => Number.isInteger(value / 5) && value >= 0 && value <= 100,
        ),
      );
    }
  }
  assert.deepEqual(ranges.BB_VS_SB_LIMP.actions, ["check", "raise"]);
  assert.deepEqual(ranges.BB_VS_SB_LIMP.hands["22"], [45, 55]);
  assert.deepEqual(ranges.SB_VS_BTN_OPEN.actions, ["fold", "call", "raise"]);
  assert.deepEqual(ranges.SB_VS_BTN_OPEN.hands.A4s, [25, 0, 75]);
  assert.deepEqual(ranges.SB_VS_BTN_OPEN.hands["72o"], [100, 0, 0]);
  assert.ok(ranges.BTN_VS_LJ_OPEN.hands.AQs[1] > 0);
});

test("opponent feedback selects only the action taken from the shared strategy", () => {
  const facingRanges = Object.entries(ranges).filter(([key]) =>
    key.includes("_VS_"),
  );
  assert.equal(facingRanges.length, 16);
  for (const [key, range] of facingRanges) {
    const [opponent, , hero, action] = key.split("_");
    const id = `${hero}_${action === "LIMP" ? "LIMP" : "RAISE"}_${opponent}-AA`;
    const result = evaluateLearnStrategy({ id, frequencies: [100, 0, 0] });
    assert.equal(Object.keys(range.hands).length, 169);
    for (const [hand, frequencies] of Object.entries(range.hands)) {
      assert.equal(
        result.opponentRange.hands[hand].frequency,
        frequencies[range.actions.indexOf("raise")],
      );
    }
    assert.throws(
      () =>
        evaluateLearnStrategy({ id: `${key}-AA`, frequencies: [100, 0, 0] }),
      /Invalid learning strategy/,
    );
  }
});
