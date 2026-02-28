import { describe, it } from "node:test";
import assert from "assert";
import * as HandHistory from "../../../../src/backend/poker/hand-history/index.js";

function createCumulativeAllInHand() {
  return {
    spec_version: "1.4.6",
    site_name: "Pluton Poker",
    game_number: "test-4",
    start_date_utc: "2024-01-01T00:00:00Z",
    game_type: "Holdem",
    bet_limit: { bet_type: "NL" },
    table_size: 6,
    dealer_seat: 1,
    small_blind_amount: 25,
    big_blind_amount: 50,
    ante_amount: 0,
    players: [
      { id: "player1", seat: 1, name: "Sb", starting_stack: 4925 },
      { id: "player2", seat: 2, name: "Bb", starting_stack: 5000 },
    ],
    rounds: [
      {
        id: 0,
        street: "Preflop",
        actions: [
          {
            action_number: 1,
            player_id: "player1",
            action: "Post SB",
            amount: 25,
          },
          {
            action_number: 2,
            player_id: "player2",
            action: "Post BB",
            amount: 50,
          },
          {
            action_number: 3,
            player_id: "player1",
            action: "Dealt Cards",
            cards: ["Kd", "Qd"],
          },
          {
            action_number: 4,
            player_id: "player2",
            action: "Dealt Cards",
            cards: ["7s", "Ts"],
          },
          {
            action_number: 5,
            player_id: "player1",
            action: "Raise",
            amount: 125,
          },
          {
            action_number: 6,
            player_id: "player2",
            action: "Call",
            amount: 125,
          },
        ],
      },
      {
        id: 1,
        street: "Flop",
        actions: [
          {
            action_number: 7,
            player_id: "player1",
            action: "Bet",
            amount: 187.5,
          },
          {
            action_number: 8,
            player_id: "player2",
            action: "Raise",
            amount: 4875,
          },
          {
            action_number: 9,
            player_id: "player1",
            action: "Call",
            amount: 4800,
          },
        ],
      },
    ],
    pots: [
      {
        number: 0,
        amount: 9925,
        player_wins: [
          { player_id: "player2", win_amount: 9925, contributed_rake: 0 },
        ],
      },
    ],
  };
}

describe("hand-history-view contributions", function () {
  it("does not double-count cumulative all-in amounts in net_result", function () {
    const hand = createCumulativeAllInHand();
    const summary = HandHistory.getHandSummary(hand, "player1");

    // Player1 invested full starting stack ($4,925), so net should be -$4,925.
    assert.strictEqual(summary.net_result, -492500);
  });

  it("keeps endingStack at zero for an all-in loser with cumulative actions", function () {
    const hand = createCumulativeAllInHand();
    const filtered = HandHistory.filterHandForPlayer(hand, "player1");
    const view = HandHistory.getHandView(filtered, "player1");

    assert.strictEqual(view.seats[0].netResult, -492500);
    assert.strictEqual(view.seats[0].endingStack, 0);
  });
});
