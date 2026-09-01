import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getHandSummary } from "../../../../src/backend/poker/hand-history/index.js";

/**
 * @param {boolean} shown
 * @returns {import('../../../../src/backend/poker/hand-history/index.js').OHHHand}
 */
function createFoldWinHand(shown) {
  const actions = [
    {
      action_number: 1,
      player_id: "winner",
      action: "Dealt Cards",
      cards: ["Ah", "Kh"],
    },
    {
      action_number: 2,
      player_id: "opponent",
      action: "Dealt Cards",
      cards: ["Qc", "Jc"],
    },
    { action_number: 3, player_id: "opponent", action: "Fold" },
  ];
  if (shown) {
    actions.push({
      action_number: 4,
      player_id: "winner",
      action: "Shows Cards",
      cards: ["Ah", "Kh"],
    });
  }

  return {
    spec_version: "1.4.6",
    site_name: "Pluton Poker",
    game_number: "table1-1",
    start_date_utc: "2026-01-01T00:00:00Z",
    game_type: "Holdem",
    bet_limit: { bet_type: "NL" },
    table_size: 2,
    dealer_seat: 1,
    small_blind_amount: 0.25,
    big_blind_amount: 0.5,
    ante_amount: 0,
    players: [
      { id: "winner", seat: 1, name: "Alice", starting_stack: 10 },
      { id: "opponent", seat: 2, name: "Bob", starting_stack: 10 },
    ],
    rounds: [{ id: 0, street: "Preflop", actions }],
    pots: [
      {
        number: 0,
        amount: 1,
        winning_hand: null,
        player_wins: [
          { player_id: "winner", win_amount: 1, contributed_rake: 0 },
        ],
      },
    ],
  };
}

describe("hand-history summary privacy", () => {
  it("does not expose an unshown fold winner's cards to a spectator", () => {
    const summary = getHandSummary(createFoldWinHand(false), "spectator");

    assert.deepEqual(summary.hole_cards, ["??", "??"]);
    assert.deepEqual(summary.winner_hole_cards, ["??", "??"]);
    assert.equal(summary.was_dealt, false);
  });

  it("keeps explicitly shown winner cards visible to a spectator", () => {
    const summary = getHandSummary(createFoldWinHand(true), "spectator");

    assert.deepEqual(summary.winner_hole_cards, ["Ah", "Kh"]);
  });
});
