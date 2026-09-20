import { test } from "node:test";
import assert from "node:assert/strict";
import { createLearnReplay } from "../../src/backend/learn-replay.js";
import {
  learnSituation,
  LEARN_POSITIONS,
  LEARN_SITUATION_KEYS,
} from "../../src/backend/learn-situations.js";

function replay(key) {
  const situation = learnSituation(key);
  const seats = LEARN_POSITIONS.map((position) => ({
    empty: false,
    allIn: false,
    sittingOut: false,
    disconnected: false,
    player: { name: position },
    isCurrentPlayer: position === situation.position,
    isActing: position === situation.position,
    folded: false,
    stack: 50000,
    bet: 0,
    cards: position === situation.position ? ["As", "Ah"] : ["??", "??"],
  }));
  return createLearnReplay(situation, seats, { small: 250, big: 500 });
}

function actions(key) {
  return replay(key)
    .slice(1)
    .map(({ action }) => [
      LEARN_POSITIONS[action.seat],
      action.action,
      ...(action.action === "fold" ? [] : [action.amount / 500]),
    ]);
}

test("button first-in plays the three preceding folds", () => {
  assert.deepEqual(actions("BTN"), [
    ["LJ", "fold"],
    ["HJ", "fold"],
    ["CO", "fold"],
  ]);
});

test("button open versus BB re-raise plays the hero's open and SB's fold", () => {
  assert.deepEqual(actions("BTN_RAISE_BB"), [
    ["LJ", "fold"],
    ["HJ", "fold"],
    ["CO", "fold"],
    ["BTN", "raise", 2.5],
    ["SB", "fold"],
    ["BB", "raise", 10],
  ]);
});

test("facing an open stops before players behind the learner act", () => {
  assert.deepEqual(actions("CO_VS_HJ_OPEN"), [
    ["LJ", "fold"],
    ["HJ", "raise", 2.5],
  ]);
  assert.ok(
    replay("CO_VS_HJ_OPEN")
      .at(-1)
      .seats.slice(3)
      .every((seat) => !seat.folded),
  );
});

test("facing a 4-bet includes the open, hero 3-bet and remaining folds in order", () => {
  assert.deepEqual(actions("HJ_VS_LJ_4BET"), [
    ["LJ", "raise", 2.5],
    ["HJ", "raise", 8.5],
    ["CO", "fold"],
    ["BTN", "fold"],
    ["SB", "fold"],
    ["BB", "fold"],
    ["LJ", "raise", 23],
  ]);
});

test("blind battles preserve limps and the position-specific raise sizes", () => {
  assert.deepEqual(actions("SB_LIMP_BB").slice(4), [
    ["SB", "call", 1],
    ["BB", "raise", 3.5],
  ]);
  assert.deepEqual(actions("BB_VS_SB_LIMP").slice(4), [["SB", "call", 1]]);
  assert.deepEqual(actions("BB_VS_SB_LIMP_RAISE").slice(4), [
    ["SB", "call", 1],
    ["BB", "raise", 3.5],
    ["SB", "raise", 13],
  ]);
  assert.deepEqual(actions("BB_VS_SB_4BET").slice(4), [
    ["SB", "raise", 3],
    ["BB", "raise", 9],
    ["SB", "raise", 24],
  ]);
});

test("all lesson predecessors are playable situations", () => {
  for (const key of LEARN_SITUATION_KEYS) {
    const { previousRangeKey } = learnSituation(key);
    if (previousRangeKey)
      assert.ok(LEARN_SITUATION_KEYS.includes(previousRangeKey));
  }
});
