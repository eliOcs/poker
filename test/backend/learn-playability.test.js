import { test } from "node:test";
import assert from "node:assert/strict";
import { describePlayability } from "../../src/backend/learn-playability.js";
import { LEARN_SITUATION_KEYS } from "../../src/backend/learn-situations.js";
import { readFileSync } from "node:fs";
const ranges = JSON.parse(
  readFileSync(
    new URL("../../src/backend/learn-ranges.json", import.meta.url),
    "utf8",
  ),
);
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

test("situation guidance follows every hand's recommended actions, regardless of the answer", () => {
  const actionNames = ["Fold", "Call", "Raise"];
  const coveredMixes = new Set();
  for (const key of LEARN_SITUATION_KEYS) {
    const range = ranges[key];
    for (const [hand, expected] of Object.entries(range.hands)) {
      const id = `${key}-${hand}`;
      const result = evaluateLearnStrategy({ id, frequencies: [100, 0, 0] });
      const otherAnswer = evaluateLearnStrategy({
        id,
        frequencies: [0, 0, 100],
        raiseTo: range.raiseTo,
      });
      assert.equal(result.explanation, otherAnswer.explanation, id);
      assert.ok(!result.explanation.startsWith(`${hand}:`), id);
      assert.deepEqual(result.playability, otherAnswer.playability, id);
      for (const [index, action] of actionNames.entries()) {
        assert.equal(
          result.explanation.includes(`${action} ${expected[index]}%`),
          expected[index] > 0,
          id,
        );
      }
      const notes = result.playability.situation;
      assert.equal(
        notes.some((note) => /opening size|re-raise total/.test(note.title)),
        expected[2] > 0,
        id,
      );
      assert.equal(
        notes.some((note) => note.text.includes("Pot odds:")),
        key.includes("_") && expected[1] > 0,
        id,
      );
      if (expected[0] === 100) {
        assert.deepEqual(notes, [], id);
        assert.doesNotMatch(result.explanation, /call|rais|limp|4-bet/i, id);
        assert.match(
          result.explanation,
          /risk more|without investing more/,
          id,
        );
      }
      if (expected[1] === 100)
        assert.doesNotMatch(result.explanation, /rais|4-bet/i, id);
      if (expected[2] === 100)
        assert.doesNotMatch(
          result.explanation,
          /Calling|Limping|mostly.*call/i,
          id,
        );
      const mixed = expected.filter((n) => n > 0).length > 1;
      assert.equal(result.explanation.includes("Mix these actions"), mixed, id);
      coveredMixes.add(expected.map((n) => Number(n > 0)).join(""));
    }
  }
  assert.equal(coveredMixes.size, 7);
});

for (const { name, id, concepts, absent = [] } of [
  {
    name: "first-in fold explains the pressure from players still to act",
    id: "HJ-K4s",
    concepts: [
      /^Fold 100%/,
      /Four players/,
      /cutoff and button.*position/,
      /stronger opposing hands/,
      /preserves your stack/,
    ],
  },
  {
    name: "folding in position acknowledges that position does not justify every hand",
    id: "LJ_RAISE_SB-A9s",
    concepts: [
      /in position against SB/,
      /act last/,
      /stronger range/,
      /already in the pot do not oblige/,
    ],
  },
  {
    name: "folding out of position explains future pressure",
    id: "CO_RAISE_BTN-A7s",
    concepts: [
      /out of position against BTN/,
      /acting first/,
      /committing more chips/,
    ],
  },
  {
    name: "SB call-only explains the limp discount without opening sizing",
    id: "SB-J2s",
    concepts: [/Call 100%/, /0\.5 BB/, /pot small out of position/],
  },
  {
    name: "SB mixed calling and raising explains both actions",
    id: "SB-AA",
    concepts: [
      /Limping/,
      /0\.5 BB/,
      /Raising puts pressure/,
      /larger opening size/,
      /Mix these actions/,
    ],
    absent: [/Folding/],
  },
  {
    name: "limp re-raise explains linear strength and low SPR",
    id: "SB_LIMP_BB-AA",
    concepts: [
      /linear range/,
      /high-equity/,
      /continue against a further raise/,
      /remaining stacks are small relative to the pot/,
    ],
  },
  {
    name: "in-position call explains the actual price and positional advantage",
    id: "BTN_RAISE_SB-22",
    concepts: [/Calling the extra 7\.5 BB/, /Acting last/, /realize your hand/],
  },
  {
    name: "out-of-position call explains pot control",
    id: "CO_RAISE_BTN-22",
    concepts: [
      /Calling the extra 6 BB/,
      /Keeping the pot smaller/,
      /acting first/,
    ],
  },
  {
    name: "out-of-position 4-bet explains reducing the positional disadvantage",
    id: "CO_RAISE_BTN-AA",
    concepts: [
      /4-betting puts pressure/,
      /reduces the opponent’s positional advantage/,
    ],
  },
  {
    name: "a small raise frequency still receives sizing and raise guidance",
    id: "CO_RAISE_SB-KJo",
    concepts: [
      /Raise 5%/,
      /Folding some of the time/,
      /4-betting/,
      /Mix these actions/,
    ],
    absent: [/Calling/],
  },
  {
    name: "mixed calls and 4-bets retain both explanations even for aces",
    id: "LJ_RAISE_BB-AA",
    concepts: [
      /Call 10%, Raise 90%/,
      /Calling the extra/,
      /4-betting/,
      /Mix these actions/,
    ],
    absent: [/Folding/],
  },
]) {
  test(name, () => {
    const result = evaluateLearnStrategy({ id, frequencies: [100, 0, 0] });
    for (const concept of concepts) assert.match(result.explanation, concept);
    for (const concept of absent)
      assert.doesNotMatch(result.explanation, concept);
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

test("hijack ranges support tighter opens and the positional defense lessons", () => {
  const evaluate = (id) =>
    evaluateLearnStrategy({ id, frequencies: [100, 0, 0] });
  for (const hand of ["55", "JTo", "98s", "K5s", "Q8s"]) {
    assert.ok(
      evaluate(`HJ-${hand}`).expected[2] < evaluate(`CO-${hand}`).expected[2],
      hand,
    );
  }
  const co = evaluate("HJ_RAISE_CO-QJs");
  const button = evaluate("HJ_RAISE_BTN-QJs");
  assert.ok(button.expected[1] > co.expected[1]);
  assert.ok(button.rangeTotals[1] > co.rangeTotals[1]);
  for (const opponent of ["SB", "BB"]) {
    const blind = evaluate(`HJ_RAISE_${opponent}-QJs`);
    for (const late of [co, button]) {
      assert.ok(blind.rangeTotals[0] < late.rangeTotals[0]);
      assert.ok(blind.rangeTotals[1] > late.rangeTotals[1]);
      assert.ok(blind.rangeTotals[2] < late.rangeTotals[2]);
    }
  }
});

test("lojack ranges support board coverage and the positional defense lessons", () => {
  const evaluate = (id) =>
    evaluateLearnStrategy({ id, frequencies: [100, 0, 0] });
  for (const hand of ["55", "65s"]) {
    const lojack = evaluate(`LJ-${hand}`);
    assert.ok(lojack.expected[2] > 0);
    assert.ok(lojack.expected[2] < 100);
  }
  assert.ok(
    evaluate("LJ-AA").rangeTotals[2] < evaluate("HJ-AA").rangeTotals[2],
  );
  const hj = evaluate("LJ_RAISE_HJ-QJs");
  const co = evaluate("LJ_RAISE_CO-QJs");
  const button = evaluate("LJ_RAISE_BTN-QJs");
  for (const earlier of [hj, co]) {
    assert.ok(button.expected[1] > earlier.expected[1]);
    assert.ok(button.rangeTotals[1] > earlier.rangeTotals[1]);
  }
  for (const opponent of ["SB", "BB"]) {
    const blind = evaluate(`LJ_RAISE_${opponent}-QJs`);
    for (const inPosition of [hj, co, button]) {
      assert.ok(blind.rangeTotals[0] < inPosition.rangeTotals[0]);
      assert.ok(blind.rangeTotals[1] > inPosition.rangeTotals[1]);
      assert.ok(blind.rangeTotals[2] < inPosition.rangeTotals[2]);
    }
  }
});

test("follow-up explanations calculate pot odds from the additional call and pot after calling", () => {
  for (const [id, title, calculation] of [
    ["SB_LIMP_BB-22", "4.5 BB in the pot", "2.5 ÷ (4.5 + 2.5) ~ 36%"],
    ["SB_RAISE_BB-22", "12 BB in the pot", "6 ÷ (12 + 6) ~ 33%"],
    ["BTN_RAISE_SB-22", "13.5 BB in the pot", "7.5 ÷ (13.5 + 7.5) ~ 36%"],
    ["BTN_RAISE_BB-22", "13 BB in the pot", "7.5 ÷ (13 + 7.5) ~ 37%"],
    ["CO_RAISE_BTN-22", "12.5 BB in the pot", "6 ÷ (12.5 + 6) ~ 32%"],
    ["CO_RAISE_SB-22", "13.5 BB in the pot", "7.5 ÷ (13.5 + 7.5) ~ 36%"],
    ["CO_RAISE_BB-22", "13 BB in the pot", "7.5 ÷ (13 + 7.5) ~ 37%"],
    ["HJ_RAISE_CO-22", "12.5 BB in the pot", "6 ÷ (12.5 + 6) ~ 32%"],
    ["HJ_RAISE_BTN-22", "12.5 BB in the pot", "6 ÷ (12.5 + 6) ~ 32%"],
    ["HJ_RAISE_SB-22", "13.5 BB in the pot", "7.5 ÷ (13.5 + 7.5) ~ 36%"],
    ["HJ_RAISE_BB-22", "13 BB in the pot", "7.5 ÷ (13 + 7.5) ~ 37%"],
    ["LJ_RAISE_HJ-22", "12.5 BB in the pot", "6 ÷ (12.5 + 6) ~ 32%"],
    ["LJ_RAISE_CO-22", "12.5 BB in the pot", "6 ÷ (12.5 + 6) ~ 32%"],
    ["LJ_RAISE_BTN-22", "12.5 BB in the pot", "6 ÷ (12.5 + 6) ~ 32%"],
    ["LJ_RAISE_SB-22", "13.5 BB in the pot", "7.5 ÷ (13.5 + 7.5) ~ 36%"],
    ["LJ_RAISE_BB-22", "13 BB in the pot", "7.5 ÷ (13 + 7.5) ~ 37%"],
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
