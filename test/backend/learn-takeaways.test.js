import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateLearnStrategy } from "../../src/backend/learn.js";

// Content checks belong here; the catalog renders one representative notes list.
for (const [position, opponent, fourBet, takeaway, count] of [
  ["BB", "LJ", false, "Playability can beat a higher card", 2],
  ["BB", "LJ", true, "Keep premiums in both calls and shoves", 2],
  ["BB", "HJ", false, "Widen a little from LJ to HJ", 2],
  ["BB", "HJ", true, "Do not overgeneralize small solver quirks", 2],
  ["BB", "CO", false, "Weak offsuit hands still struggle", 2],
  ["BB", "CO", true, "More polarized 4-bets invite more calls", 2],
  ["BB", "BTN", false, "Build a more linear 3-bet range", 2],
  ["BB", "BTN", true, "Defend mainly by calling", 2],
  ["BB", "SB", false, "Position changes the range structure", 2],
  ["BB", "SB", true, "Slowplay strong hands in position", 2],
  ["SB", "LJ", false, "The blind discount does not justify a call", 2],
  ["SB", "HJ", false, "Widen against the wider opener", 2],
  ["SB", "CO", false, "Add another layer of 3-bets", 2],
  ["SB", "BTN", false, "Defend most widely against BTN", 2],
  ["SB", "LJ", true, "Preserve the opponent’s possible bluffs", 2],
  ["SB", "HJ", true, "A wider 3-bet range needs more defense", 2],
  ["SB", "CO", true, "Some 5-bet bluffs now appear", 3],
  ["SB", "BTN", true, "Always slowplay AA in this reference", 2],
  ["CO", "LJ", false, "One fewer player, only a little wider", 2],
  ["CO", "HJ", false, "A wider opener allows more 3-bets", 2],
  ["CO", "LJ", true, "Strong hands do not all shove", 2],
  ["CO", "HJ", true, "Wider 3-bets need a wider defense", 2],
  ["BTN", "LJ", false, "Position makes room for calls", 3],
  ["BTN", "HJ", false, "More 3-bets, slightly fewer calls", 2],
  ["BTN", "CO", false, "Attack wider while trimming calls", 2],
  ["BTN", "LJ", true, "Keep the shove range narrow", 2],
  ["BTN", "HJ", true, "A pure call can still be a rare hand", 2],
  ["BTN", "CO", true, "AA always calls against CO", 2],
]) {
  const stage = fourBet ? "4BET" : "OPEN";
  const hand = ["SB", "BB"].includes(position) ? "KTs" : "A9s";
  test(`${position} vs ${opponent} ${stage} includes its range-wide takeaway even for a fold`, () => {
    const result = evaluateLearnStrategy({
      id: `${position}_VS_${opponent}_${stage}-${hand}`,
      frequencies: [100, 0, 0],
    });
    assert.equal(result.lessonNotes.length, count);
    assert.ok(result.lessonNotes.some((note) => note.title === takeaway));
  });
}

test("Hijack opponent notes explain folds, calls and premium slowplays", () => {
  const result = evaluateLearnStrategy({
    id: "LJ_RAISE_HJ-AA",
    frequencies: [100, 0, 0],
  });
  const notes = result.opponentRange.notes
    .map(({ title, text }) => `${title} ${text}`)
    .join(" ");
  for (const concept of [
    /There is no calling range/,
    /88 down to 22/,
    /38.3% fold, 43.3% call and 18.4% shove/,
    /HJ calls AA about half the time/,
  ]) {
    assert.match(notes, concept);
  }
});

test("Big Blind takeaway explains the free flop against a limp", () => {
  const result = evaluateLearnStrategy({
    id: "BB_VS_SB_LIMP-72o",
    frequencies: [100, 0],
  });
  assert.ok(
    result.lessonNotes.some(
      (note) => note.title === "A free flop is a real option",
    ),
  );
});
