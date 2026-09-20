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
    if (!(position in sourceTotals)) continue;
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

test("deals first-in and follow-up decisions with consistent bets and no answer exposed", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const scenario = createLearnScenario();
    const key = scenario.id.split("-")[0];
    seen.add(key);
    assert.ok(Object.hasOwn(ranges[key].hands, scenario.hand));
    assert.equal(scenario.seats.length, 6);
    const hero = scenario.seats.findIndex((s) => s.isCurrentPlayer);
    assert.ok(hero >= 0 && hero < 5);
    assert.deepEqual(
      scenario.seats.map((seat) => seat.player.name.replace("You · ", "")),
      ["UTG", "UTG+1", "CO", "BTN", "SB", "BB"],
    );
    assert.ok(
      scenario.seats
        .slice(0, hero)
        .every((s) => s.folded || s.lastAction === "raise"),
    );
    const cards = scenario.seats[hero].cards;
    assert.notEqual(cards[0], cards[1]);
    assert.equal(cards[0][1] === cards[1][1], scenario.hand.endsWith("s"));
    assert.equal(scenario.expected, undefined);
    assert.equal(scenario.hands, undefined);
    assert.equal(scenario.rangeTotals, undefined);
    assert.equal(scenario.opponentRange, undefined);
    assert.equal(scenario.raiseTo, undefined);
    const followup = {
      HJ_VS_LJ_OPEN: {
        hero: 1,
        opponent: 0,
        bets: [1250, 0, 0, 0, 250, 500],
        min: 2000,
        action: undefined,
        pending: true,
      },
      HJ_VS_LJ_4BET: {
        hero: 1,
        opponent: 0,
        bets: [11500, 4250, 0, 0, 250, 500],
        min: 18750,
        action: "raise",
      },
      SB_LIMP_BB: {
        hero: 4,
        opponent: 5,
        bets: [0, 0, 0, 0, 500, 1750],
        min: 3000,
        action: "call",
      },
      SB_RAISE_BB: {
        hero: 4,
        opponent: 5,
        bets: [0, 0, 0, 0, 1500, 4500],
        min: 7500,
        action: "raise",
      },
      BTN_RAISE_SB: {
        hero: 3,
        opponent: 4,
        bets: [0, 0, 0, 1250, 5000, 500],
        min: 8750,
        action: "raise",
      },
      BTN_RAISE_BB: {
        hero: 3,
        opponent: 5,
        bets: [0, 0, 0, 1250, 250, 5000],
        min: 8750,
        action: "raise",
      },
      CO_RAISE_BTN: {
        hero: 2,
        opponent: 3,
        bets: [0, 0, 1250, 4250, 250, 500],
        min: 7250,
        action: "raise",
      },
      CO_RAISE_SB: {
        hero: 2,
        opponent: 4,
        bets: [0, 0, 1250, 0, 5000, 500],
        min: 8750,
        action: "raise",
      },
      CO_RAISE_BB: {
        hero: 2,
        opponent: 5,
        bets: [0, 0, 1250, 0, 250, 5000],
        min: 8750,
        action: "raise",
      },
      HJ_RAISE_CO: {
        hero: 1,
        opponent: 2,
        bets: [0, 1250, 4250, 0, 250, 500],
        min: 7250,
        action: "raise",
      },
      HJ_RAISE_BTN: {
        hero: 1,
        opponent: 3,
        bets: [0, 1250, 0, 4250, 250, 500],
        min: 7250,
        action: "raise",
      },
      HJ_RAISE_SB: {
        hero: 1,
        opponent: 4,
        bets: [0, 1250, 0, 0, 5000, 500],
        min: 8750,
        action: "raise",
      },
      HJ_RAISE_BB: {
        hero: 1,
        opponent: 5,
        bets: [0, 1250, 0, 0, 250, 5000],
        min: 8750,
        action: "raise",
      },
      LJ_RAISE_HJ: {
        hero: 0,
        opponent: 1,
        bets: [1250, 4250, 0, 0, 250, 500],
        min: 7250,
        action: "raise",
      },
      LJ_RAISE_CO: {
        hero: 0,
        opponent: 2,
        bets: [1250, 0, 4250, 0, 250, 500],
        min: 7250,
        action: "raise",
      },
      LJ_RAISE_BTN: {
        hero: 0,
        opponent: 3,
        bets: [1250, 0, 0, 4250, 250, 500],
        min: 7250,
        action: "raise",
      },
      LJ_RAISE_SB: {
        hero: 0,
        opponent: 4,
        bets: [1250, 0, 0, 0, 5000, 500],
        min: 8750,
        action: "raise",
      },
      LJ_RAISE_BB: {
        hero: 0,
        opponent: 5,
        bets: [1250, 0, 0, 0, 250, 5000],
        min: 8750,
        action: "raise",
      },
    }[key];
    if (followup) {
      assert.equal(hero, followup.hero);
      assert.match(scenario.history, /3-bet|raised/i);
      assert.deepEqual(
        scenario.seats.map((s) => s.bet),
        followup.bets,
      );
      assert.equal(scenario.currentBet, followup.bets[followup.opponent]);
      assert.equal(scenario.minRaiseTo, followup.min);
      assert.equal(scenario.seats[hero].lastAction, followup.action);
      assert.equal(scenario.seats[followup.opponent].lastAction, "raise");
      scenario.seats.forEach((seat, index) => {
        const folded =
          !followup.pending && index !== hero && index !== followup.opponent;
        assert.equal(seat.folded, folded);
        if (folded) {
          assert.deepEqual(seat.cards, []);
          assert.equal(seat.lastAction, "fold");
        } else if (index !== hero) assert.deepEqual(seat.cards, ["??", "??"]);
      });
    } else {
      if (key === "LJ") assert.equal(scenario.history, "You are first to act.");
      assert.equal(scenario.currentBet, 500);
      assert.equal(scenario.minRaiseTo, 1000);
      assert.ok(scenario.seats.slice(hero + 1).every((s) => !s.folded));
    }
    assert.equal(
      scenario.seats.reduce((total, s) => total + s.stack + s.bet, 0),
      300000,
    );
  }
  assert.equal(seen.size, 23);
});

test("follow-up ranges reproduce conditional source totals and omit unreachable hands", () => {
  for (const [key, position, previousAction, totals, tolerance] of [
    ["HJ_VS_LJ_4BET", "HJ_VS_LJ_OPEN", 2, [38.3, 43.3, 18.4], 1],
    ["SB_LIMP_BB", "SB", 1, [46.8, 39.8, 13.4], 0.4],
    ["SB_RAISE_BB", "SB", 2, [45.4, 37.4, 17.2], 0.4],
    ["BTN_RAISE_SB", "BTN", 2, [43.1, 48.9, 8.1], 0.4],
    // The supplied PDF's BB chart is nearly identical to its SB chart,
    // despite different captions. Preserve the chart; see doc/learn.md.
    ["BTN_RAISE_BB", "BTN", 2, [44.5, 47.3, 8.6], 2],
    ["CO_RAISE_BTN", "CO", 2, [59, 20.4, 20.6], 1],
    ["CO_RAISE_SB", "CO", 2, [53.1, 35.8, 11.1], 1],
    ["CO_RAISE_BB", "CO", 2, [52.1, 37.6, 10.3], 1],
    ["HJ_RAISE_CO", "HJ", 2, [63.3, 14.5, 22.2], 1],
    ["HJ_RAISE_BTN", "HJ", 2, [57.6, 20.8, 21.6], 1],
    ["HJ_RAISE_SB", "HJ", 2, [52.6, 36.3, 11.1], 1],
    ["HJ_RAISE_BB", "HJ", 2, [51.4, 39.1, 9.6], 1],
    ["LJ_RAISE_HJ", "LJ", 2, [63.1, 15.1, 21.8], 1],
    ["LJ_RAISE_CO", "LJ", 2, [62.4, 13.8, 23.8], 1],
    ["LJ_RAISE_BTN", "LJ", 2, [54.9, 23.3, 21.9], 1],
    ["LJ_RAISE_SB", "LJ", 2, [51.9, 36.6, 11.5], 1],
    ["LJ_RAISE_BB", "LJ", 2, [51.7, 38.8, 9.5], 1],
  ]) {
    const hands = ranges[key].hands;
    assert.equal(hands["72o"], undefined);
    assert.deepEqual(
      hands.AA,
      key === "HJ_VS_LJ_4BET"
        ? [0, 50, 50]
        : key === "LJ_RAISE_BB"
          ? [0, 10, 90]
          : [0, 0, 100],
    );
    const measured = [0, 0, 0];
    let weightTotal = 0;
    for (const [hand, frequencies] of Object.entries(hands)) {
      assert.equal(
        frequencies.reduce((a, b) => a + b),
        100,
      );
      assert.ok(frequencies.every((n) => n >= 0 && n <= 100 && n % 5 === 0));
      const weight =
        (hand.length === 2 ? 6 : hand.endsWith("s") ? 4 : 12) *
        ranges[position].hands[hand][previousAction];
      weightTotal += weight;
      frequencies.forEach((n, i) => (measured[i] += n * weight));
      const answer = evaluateLearnStrategy({
        id: `${key}-${hand}`,
        frequencies,
        raiseTo: ranges[key].raiseTo,
      });
      assert.equal(answer.grade, "correct");
    }
    measured.forEach((n, i) =>
      assert.ok(Math.abs(n / weightTotal - totals[i]) < tolerance),
    );
  }
});

test("follow-ups grade their own ranges and sizes and explain the actual pot", () => {
  for (const [key, min, size, pot, call] of [
    ["HJ_VS_LJ_4BET", 37.5, 100, 33, 14.5],
    ["SB_LIMP_BB", 6, 13, 4.5, 2.5],
    ["SB_RAISE_BB", 15, 24, 12, 6],
    ["BTN_RAISE_SB", 17.5, 23, 13.5, 7.5],
    ["BTN_RAISE_BB", 17.5, 23, 13, 7.5],
    ["CO_RAISE_BTN", 14.5, 23, 12.5, 6],
    ["CO_RAISE_SB", 17.5, 23, 13.5, 7.5],
    ["CO_RAISE_BB", 17.5, 23, 13, 7.5],
    ["HJ_RAISE_CO", 14.5, 23, 12.5, 6],
    ["HJ_RAISE_BTN", 14.5, 23, 12.5, 6],
    ["HJ_RAISE_SB", 17.5, 23, 13.5, 7.5],
    ["HJ_RAISE_BB", 17.5, 23, 13, 7.5],
    ["LJ_RAISE_HJ", 14.5, 23, 12.5, 6],
    ["LJ_RAISE_CO", 14.5, 23, 12.5, 6],
    ["LJ_RAISE_BTN", 14.5, 23, 12.5, 6],
    ["LJ_RAISE_SB", 17.5, 23, 13.5, 7.5],
    ["LJ_RAISE_BB", 17.5, 23, 13, 7.5],
  ]) {
    const correct = evaluateLearnStrategy({
      id: `${key}-AA`,
      frequencies: ranges[key].hands.AA,
      raiseTo: size,
    });
    assert.equal(correct.grade, "correct");
    const notes = correct.playability.situation;
    const potNote = notes.find((note) => note.title === `${pot} BB in the pot`);
    assert.equal(Boolean(potNote), correct.expected[1] > 0);
    if (potNote) assert.ok(potNote.text.includes(`another ${call} BB`));
    assert.ok(notes.some((note) => note.title === `${size} BB re-raise total`));
    assert.ok(!correct.explanation.includes("never calls first in"));
    assert.throws(
      () =>
        evaluateLearnStrategy({
          id: `${key}-AA`,
          frequencies: [0, 0, 100],
          raiseTo: min - 0.01,
        }),
      /Invalid learning strategy/,
    );
    assert.throws(
      () =>
        evaluateLearnStrategy({ id: `${key}-72o`, frequencies: [100, 0, 0] }),
      /Invalid learning strategy/,
    );
    assert.equal(
      evaluateLearnStrategy({
        id: `${key}-AA`,
        frequencies: [0, 0, 100],
        raiseTo: min,
      }).grade,
      "incorrect",
    );
    assert.equal(
      evaluateLearnStrategy({ id: `${key}-AA`, frequencies: [100, 0, 0] })
        .sizingMatch,
      undefined,
    );
  }
});

test("chart totals weight combinations and the preceding limp or raise, not grid cells", () => {
  for (const [key, totals] of [
    ["HJ_VS_LJ_OPEN", [92, 0, 8]],
    ["HJ_VS_LJ_4BET", [38, 43, 19]],
    ["LJ", [83, 0, 17]],
    ["BTN", [57, 0, 43]],
    ["SB", [38, 37, 25]],
    ["SB_LIMP_BB", [47, 40, 13]],
    ["SB_RAISE_BB", [46, 37, 17]],
    ["CO_RAISE_BTN", [59, 20, 21]],
    ["CO_RAISE_SB", [53, 35, 12]],
    ["HJ_RAISE_CO", [63, 14, 23]],
    ["HJ_RAISE_BTN", [58, 20, 22]],
    ["HJ_RAISE_SB", [52, 36, 12]],
    ["HJ_RAISE_BB", [51, 39, 10]],
    ["LJ_RAISE_HJ", [63, 15, 22]],
    ["LJ_RAISE_CO", [63, 13, 24]],
    ["LJ_RAISE_BTN", [55, 22, 23]],
    ["LJ_RAISE_SB", [52, 36, 12]],
    ["LJ_RAISE_BB", [51, 39, 10]],
  ]) {
    for (const hand of ["AA", "22"]) {
      const result = evaluateLearnStrategy({
        id: `${key}-${hand}`,
        frequencies: [100, 0, 0],
      });
      assert.deepEqual(result.rangeTotals, totals, `${key}-${hand}`);
      assert.equal(
        result.rangeTotals.reduce((sum, value) => sum + value, 0),
        100,
      );
    }
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
      assert.match(result.explanation, /^Raise 100%/);
      assert.doesNotMatch(result.explanation, /Calling|Limping/);
    }
  }
});
