import { test } from "node:test";
import assert from "node:assert/strict";
import { createLearnScenario } from "../../src/backend/learn.js";
import { readFileSync } from "node:fs";
const ranges = JSON.parse(
  readFileSync(
    new URL("../../src/backend/learn-ranges.json", import.meta.url),
    "utf8",
  ),
);

test("deals first-in and follow-up decisions with consistent bets and no answer exposed", () => {
  const seen = new Set();
  for (let i = 0; i < 1000; i++) {
    const scenario = createLearnScenario();
    const key = scenario.id.split("-")[0];
    seen.add(key);
    assert.ok(Object.hasOwn(ranges[key].hands, scenario.hand));
    assert.equal(scenario.seats.length, 6);
    const hero = scenario.seats.findIndex((s) => s.isCurrentPlayer);
    assertLearnReplay(scenario);
    assert.ok(hero >= 0 && hero < 6);
    assert.deepEqual(
      scenario.seats.map((seat) => seat.player.name.replace("You · ", "")),
      ["UTG", "UTG+1", "CO", "BTN", "SB", "BB"],
    );
    assert.ok(
      scenario.seats
        .slice(0, hero)
        .every((s) => s.folded || ["raise", "call"].includes(s.lastAction)),
    );
    const cards = scenario.seats[hero].cards;
    assert.notEqual(cards[0], cards[1]);
    assert.equal(cards[0][1] === cards[1][1], scenario.hand.endsWith("s"));
    assert.equal(scenario.expected, undefined);
    assert.equal(scenario.hands, undefined);
    assert.equal(scenario.rangeTotals, undefined);
    assert.equal(scenario.opponentRange, undefined);
    assert.equal(scenario.lessonNotes, undefined);
    assert.equal(scenario.raiseTo, undefined);
    const followup = {
      BB_VS_LJ_OPEN: {
        hero: 5,
        opponent: 0,
        bets: [1250.0, 0, 0, 0, 250, 500],
        min: 2000,
        action: undefined,
      },
      BB_VS_LJ_4BET: {
        hero: 5,
        opponent: 0,
        bets: [11500, 0, 0, 0, 250, 5000],
        min: 18000,
        action: "raise",
      },
      BB_VS_HJ_OPEN: {
        hero: 5,
        opponent: 1,
        bets: [0, 1250.0, 0, 0, 250, 500],
        min: 2000,
        action: undefined,
      },
      BB_VS_HJ_4BET: {
        hero: 5,
        opponent: 1,
        bets: [0, 11500, 0, 0, 250, 5000],
        min: 18000,
        action: "raise",
      },
      BB_VS_CO_OPEN: {
        hero: 5,
        opponent: 2,
        bets: [0, 0, 1250.0, 0, 250, 500],
        min: 2000,
        action: undefined,
      },
      BB_VS_CO_4BET: {
        hero: 5,
        opponent: 2,
        bets: [0, 0, 11500, 0, 250, 5000],
        min: 18000,
        action: "raise",
      },
      BB_VS_BTN_OPEN: {
        hero: 5,
        opponent: 3,
        bets: [0, 0, 0, 1250.0, 250, 500],
        min: 2000,
        action: undefined,
      },
      BB_VS_BTN_4BET: {
        hero: 5,
        opponent: 3,
        bets: [0, 0, 0, 11500, 250, 5000],
        min: 18000,
        action: "raise",
      },
      BB_VS_SB_OPEN: {
        hero: 5,
        opponent: 4,
        bets: [0, 0, 0, 0, 1500, 500],
        min: 2500,
        action: undefined,
      },
      BB_VS_SB_4BET: {
        hero: 5,
        opponent: 4,
        bets: [0, 0, 0, 0, 12000, 4500],
        min: 19500,
        action: "raise",
      },
      BB_VS_SB_LIMP: {
        hero: 5,
        opponent: 4,
        bets: [0, 0, 0, 0, 500, 500],
        min: 1000,
        action: undefined,
      },
      BB_VS_SB_LIMP_RAISE: {
        hero: 5,
        opponent: 4,
        bets: [0, 0, 0, 0, 6500, 1750],
        min: 11250,
        action: "raise",
      },
      SB_VS_LJ_OPEN: {
        hero: 4,
        opponent: 0,
        bets: [1250, 0, 0, 0, 250, 500],
        min: 2000,
        action: undefined,
        pending: true,
      },
      SB_VS_LJ_4BET: {
        hero: 4,
        opponent: 0,
        bets: [11500, 0, 0, 0, 5000, 500],
        min: 18000,
        action: "raise",
        pending: false,
      },
      SB_VS_HJ_OPEN: {
        hero: 4,
        opponent: 1,
        bets: [0, 1250, 0, 0, 250, 500],
        min: 2000,
        action: undefined,
        pending: true,
      },
      SB_VS_HJ_4BET: {
        hero: 4,
        opponent: 1,
        bets: [0, 11500, 0, 0, 5000, 500],
        min: 18000,
        action: "raise",
        pending: false,
      },
      SB_VS_CO_OPEN: {
        hero: 4,
        opponent: 2,
        bets: [0, 0, 1250, 0, 250, 500],
        min: 2000,
        action: undefined,
        pending: true,
      },
      SB_VS_CO_4BET: {
        hero: 4,
        opponent: 2,
        bets: [0, 0, 11500, 0, 5000, 500],
        min: 18000,
        action: "raise",
        pending: false,
      },
      SB_VS_BTN_OPEN: {
        hero: 4,
        opponent: 3,
        bets: [0, 0, 0, 1250, 250, 500],
        min: 2000,
        action: undefined,
        pending: true,
      },
      SB_VS_BTN_4BET: {
        hero: 4,
        opponent: 3,
        bets: [0, 0, 0, 11500, 5000, 500],
        min: 18000,
        action: "raise",
        pending: false,
      },
      BTN_VS_LJ_OPEN: {
        hero: 3,
        opponent: 0,
        bets: [1250, 0, 0, 0, 250, 500],
        min: 2000,
        action: undefined,
        pending: true,
      },
      BTN_VS_LJ_4BET: {
        hero: 3,
        opponent: 0,
        bets: [11500, 0, 0, 4250, 250, 500],
        min: 18750,
        action: "raise",
        pending: false,
      },
      BTN_VS_HJ_OPEN: {
        hero: 3,
        opponent: 1,
        bets: [0, 1250, 0, 0, 250, 500],
        min: 2000,
        action: undefined,
        pending: true,
      },
      BTN_VS_HJ_4BET: {
        hero: 3,
        opponent: 1,
        bets: [0, 11500, 0, 4250, 250, 500],
        min: 18750,
        action: "raise",
        pending: false,
      },
      BTN_VS_CO_OPEN: {
        hero: 3,
        opponent: 2,
        bets: [0, 0, 1250, 0, 250, 500],
        min: 2000,
        action: undefined,
        pending: true,
      },
      BTN_VS_CO_4BET: {
        hero: 3,
        opponent: 2,
        bets: [0, 0, 11500, 4250, 250, 500],
        min: 18750,
        action: "raise",
        pending: false,
      },
      CO_VS_LJ_OPEN: {
        hero: 2,
        opponent: 0,
        bets: [1250, 0, 0, 0, 250, 500],
        min: 2000,
        action: undefined,
        pending: true,
      },
      CO_VS_LJ_4BET: {
        hero: 2,
        opponent: 0,
        bets: [11500, 0, 4250, 0, 250, 500],
        min: 18750,
        action: "raise",
        pending: false,
      },
      CO_VS_HJ_OPEN: {
        hero: 2,
        opponent: 1,
        bets: [0, 1250, 0, 0, 250, 500],
        min: 2000,
        action: undefined,
        pending: true,
      },
      CO_VS_HJ_4BET: {
        hero: 2,
        opponent: 1,
        bets: [0, 11500, 4250, 0, 250, 500],
        min: 18750,
        action: "raise",
        pending: false,
      },
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
      assert.match(scenario.history, /3-bet|raised|opened|called/i);
      assert.deepEqual(
        scenario.seats.map((s) => s.bet),
        followup.bets,
      );
      assert.equal(scenario.currentBet, followup.bets[followup.opponent]);
      assert.equal(scenario.minRaiseTo, followup.min);
      assert.equal(scenario.seats[hero].lastAction, followup.action);
      assert.equal(
        scenario.seats[followup.opponent].lastAction,
        key === "BB_VS_SB_LIMP" ? "call" : "raise",
      );
      scenario.seats.forEach((seat, index) => {
        const folded =
          index !== hero &&
          index !== followup.opponent &&
          (!followup.pending || index < hero);
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
  assert.equal(seen.size, 53);
});

function assertLearnReplay(scenario) {
  const { replay, seats: decision } = scenario;
  if (scenario.id.startsWith("LJ-")) {
    assert.deepEqual(replay, []);
    return;
  }
  assert.deepEqual(replay.at(-1).seats, decision);
  assert.deepEqual(
    replay[0].seats.map((seat) => seat.bet),
    [0, 0, 0, 0, 250, 500],
  );
  assert.ok(replay[0].seats.every((seat) => !seat.folded));
  for (const [index, step] of replay.entries()) {
    assert.equal(step.seats.filter((seat) => seat.isActing).length, 1);
    step.seats.forEach((seat, seatIndex) => {
      assert.equal(seat.stack + seat.bet, 50000);
      assert.ok(Number.isInteger(seat.stack));
      assert.ok(Number.isInteger(seat.bet));
      assert.deepEqual(
        seat.cards,
        seat.isCurrentPlayer
          ? decision[seatIndex].cards
          : seat.folded
            ? []
            : ["??", "??"],
      );
    });
    if (!step.action) continue;
    const before = replay[index - 1].seats;
    const { seat, action } = step.action;
    assert.equal(before[seat].isActing, true);
    assert.equal(before[seat].folded, false);
    assert.equal(step.seats[seat].lastAction, action);
    // Acting passes clockwise, skipping everyone who has already folded.
    let next = (seat + 1) % 6;
    while (step.seats[next].folded) next = (next + 1) % 6;
    assert.equal(step.seats[next].isActing, true);
    if (action === "fold") assert.equal(step.seats[seat].folded, true);
    else assert.equal(step.seats[seat].bet, step.action.amount);
  }
}
