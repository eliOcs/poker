import { test } from "node:test";
import assert from "node:assert/strict";
import { describePlayability } from "../../src/backend/learn-playability.js";
import { evaluateLearnStrategy } from "../../src/backend/learn.js";

test("distinguishes high cards, suitedness, connectedness and pocket pairs", () => {
  const suited = describePlayability("T9s", 2.5);
  assert.deepEqual(suited.features, {
    pair: false,
    suited: true,
    highCards: 1,
    straightPatterns: 4,
  });
  assert.deepEqual(
    suited.cards.map((c) => c.title),
    ["One high card", "Suited", "Connected"],
  );
  assert.equal(describePlayability("T9o", 2.5).features.suited, false);
  assert.equal(describePlayability("AKo", 2.5).features.highCards, 2);
  const pair = describePlayability("55", 2.5);
  assert.equal(pair.features.pair, true);
  assert.equal(pair.features.straightPatterns, 0);
  assert.deepEqual(
    pair.cards.map((c) => c.title),
    ["Pocket pair"],
  );
});

test("counts actual straight patterns including ace high/low without wrapping", () => {
  for (const [hand, count] of Object.entries({
    T9s: 4,
    T8s: 3,
    T7s: 2,
    T6s: 1,
    AKo: 1,
    A2s: 1,
    A3s: 1,
    A5s: 1,
    A6s: 0,
    K2s: 0,
    "32s": 2,
    "72o": 0,
  }))
    assert.equal(
      describePlayability(hand, 2.5).features.straightPatterns,
      count,
      hand,
    );
});

test("connects the evaluation to this hand and position without changing grading", () => {
  const response = evaluateLearnStrategy({
    id: "SB-A5s",
    frequencies: [0, 50, 50],
    raiseTo: 3,
  });
  assert.equal(response.playability.features.suited, true);
  assert.match(response.playability.cards[1].text, /ace-high flush/);
  assert.equal(response.playability.situation[1].title, "3 BB opening size");
  const early = evaluateLearnStrategy({
    id: "LJ-T9s",
    frequencies: [100, 0, 0],
  });
  assert.match(early.explanation, /Five players/);
  assert.equal(early.playability.cards[2].title, "Connected");
});
