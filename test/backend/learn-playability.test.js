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

// Modern Poker Theory, Small Blind through Cutoff, PDF pages 181–193. Check the teaching
// concepts in the public evaluation response rather than exact paragraphs.
for (const { name, id, raiseTo, concepts } of [
  {
    name: "SB first-in explains the limp/raise split, discount and larger opening size",
    id: "SB-AA",
    raiseTo: 3,
    concepts: [
      /out of position/i,
      /limping/i,
      /raising/i,
      /folding/i,
      /0\.5 BB/i,
      /3-bets less effective/i,
      /3 BB.*discourage calls/i,
    ],
  },
  {
    name: "SB limp versus raise explains linear re-raises and low-SPR playability",
    id: "SB_LIMP_BB-AA",
    raiseTo: 13,
    concepts: [
      /out of position/i,
      /linear/i,
      /high-equity hands/i,
      /continue against a further raise/i,
      /remaining stacks are small relative to the pot/i,
    ],
  },
  {
    name: "SB open versus 3-bet explains calling medium hands and polarized 4-bets",
    id: "SB_RAISE_BB-AA",
    raiseTo: 24,
    concepts: [
      /act first after the flop/i,
      /medium-strength hands.*calling/i,
      /4-betting and then folding to an all-in/i,
      /polarized/i,
      /strong hands and selected bluffs/i,
      /blockers/i,
      /different boards if BB calls/i,
    ],
  },
  {
    name: "BTN first-in explains raise-or-fold, positional advantage and adapting to overfolds",
    id: "BTN-AA",
    raiseTo: 2.5,
    concepts: [
      /raise or fold/i,
      /2\.5 BB/i,
      /about 43%/i,
      /position on both blinds/i,
      /no discount to limp/i,
      /limping invites.*raise/i,
      /defend against 3-bets/i,
      /blinds fold too often.*open wider/i,
    ],
  },
  ...["SB", "BB"].map((opponent) => ({
    name: `BTN vs ${opponent} explains calling in position, polarized 4-bets and the price difference`,
    id: `BTN_RAISE_${opponent}-AA`,
    raiseTo: 23,
    concepts: [
      /act last after the flop/i,
      /mostly calling/i,
      /polarized 4-bet range/i,
      /strong hands and selected bluffs/i,
      /blockers/i,
      /different boards/i,
      /5-bet shove.*fold/i,
      /similar defenses against both blinds/i,
      ...(opponent === "SB"
        ? [/folded BB.*1 BB/i, /better calling odds/i]
        : [/folded SB.*0\.5 BB/i, /slightly less defense/i]),
    ],
  })),
  {
    name: "CO first-in explains tightening the button range because BTN has position",
    id: "CO-AA",
    raiseTo: 2.5,
    concepts: [
      /button.*position on you/i,
      /call or 3-bet/i,
      /tighter range/i,
      /about 28%.*43%/i,
      /raise or fold/i,
      /2\.5 BB/i,
      /K2s.*Q2s.*98o.*fold/i,
    ],
  },
  {
    name: "CO vs BTN explains more 4-betting and folding, less calling, and reducing the positional disadvantage",
    id: "CO_RAISE_BTN-AA",
    raiseTo: 23,
    concepts: [
      /out of position/i,
      /act first after the flop/i,
      /4-bets more and calls less/i,
      /win the pot preflop/i,
      /less money behind relative to/i,
      /reducing.*positional advantage/i,
      /weaker hands.*fold more/i,
    ],
  },
  ...["SB", "BB"].map((opponent) => ({
    name: `CO vs ${opponent} explains calling in position with polarized 4-bets`,
    id: `CO_RAISE_${opponent}-AA`,
    raiseTo: 23,
    concepts: [
      /in position/i,
      /act last after the flop/i,
      /calls more and 4-bets less/i,
      /mostly by calling/i,
      /polarized 4-bet range/i,
      /strong hands with selected bluffs/i,
    ],
  })),
]) {
  test(name, () => {
    const result = evaluateLearnStrategy({
      id,
      frequencies: [0, 0, 100],
      raiseTo,
    });
    for (const concept of concepts) assert.match(result.explanation, concept);
  });
}

test("the weaker button opens named in the cutoff explanation really fold there", () => {
  for (const hand of ["K2s", "Q2s", "98o"]) {
    const cutoff = evaluateLearnStrategy({
      id: `CO-${hand}`,
      frequencies: [100, 0, 0],
    });
    const button = evaluateLearnStrategy({
      id: `BTN-${hand}`,
      frequencies: [100, 0, 0],
    });
    assert.ok(cutoff.explanation.includes(hand));
    assert.deepEqual(cutoff.expected, [100, 0, 0]);
    assert.ok(button.expected[2] > 0);
  }
});

test("follow-up explanations calculate pot odds from the additional call and pot after calling", () => {
  for (const [id, title, calculation] of [
    ["SB_LIMP_BB-AA", "4.5 BB in the pot", "2.5 ÷ (4.5 + 2.5) ~ 36%"],
    ["SB_RAISE_BB-AA", "12 BB in the pot", "6 ÷ (12 + 6) ~ 33%"],
    ["BTN_RAISE_SB-AA", "13.5 BB in the pot", "7.5 ÷ (13.5 + 7.5) ~ 36%"],
    ["BTN_RAISE_BB-AA", "13 BB in the pot", "7.5 ÷ (13 + 7.5) ~ 37%"],
    ["CO_RAISE_BTN-AA", "12.5 BB in the pot", "6 ÷ (12.5 + 6) ~ 32%"],
    ["CO_RAISE_SB-AA", "13.5 BB in the pot", "7.5 ÷ (13.5 + 7.5) ~ 36%"],
    ["CO_RAISE_BB-AA", "13 BB in the pot", "7.5 ÷ (13 + 7.5) ~ 37%"],
  ]) {
    const result = evaluateLearnStrategy({ id, frequencies: [0, 100, 0] });
    const note = result.playability.situation.find((n) => n.title === title);
    assert.equal(note.title, title);
    assert.ok(note.text.includes(calculation));
    assert.match(note.text, /no further betting/);
    assert.match(note.text, /break-even win rate/);
    assert.match(note.text, /winning more often is profitable/);
    assert.match(note.text, /Future bets and folds/);
  }
});

test("first-in explanations do not use heads-up follow-up pot odds", () => {
  for (const position of ["LJ", "HJ", "CO", "BTN", "SB"]) {
    const result = evaluateLearnStrategy({
      id: `${position}-AA`,
      frequencies: [100, 0, 0],
    });
    assert.ok(
      result.playability.situation.every((n) => !n.text.includes("Pot odds:")),
    );
  }
});
