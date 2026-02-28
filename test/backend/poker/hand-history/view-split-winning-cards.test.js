import { describe, it } from "node:test";
import assert from "node:assert";
import * as HandHistory from "../../../../src/backend/poker/hand-history/index.js";

describe("hand-history view split winning cards", function () {
  it("assigns winner-specific winningCards for split pots", function () {
    const hand = {
      spec_version: "1.4.6",
      site_name: "Pluton Poker",
      game_number: "test-1",
      start_date_utc: "2024-01-01T00:00:00Z",
      game_type: "Holdem",
      bet_limit: { bet_type: "NL" },
      table_size: 6,
      dealer_seat: 1,
      small_blind_amount: 25,
      big_blind_amount: 50,
      ante_amount: 0,
      players: [
        { id: "player1", seat: 1, name: "Elio", starting_stack: 4650 },
        { id: "player2", seat: 2, name: "Cañas", starting_stack: 5300 },
      ],
      rounds: [
        {
          id: 0,
          street: "Preflop",
          actions: [
            {
              action_number: 1,
              player_id: "player1",
              action: "Dealt Cards",
              cards: ["4s", "Jc"],
            },
            {
              action_number: 2,
              player_id: "player2",
              action: "Dealt Cards",
              cards: ["Js", "2c"],
            },
          ],
        },
        { id: 1, street: "Flop", cards: ["6h", "Qd", "3d"], actions: [] },
        { id: 2, street: "Turn", cards: ["8d"], actions: [] },
        { id: 3, street: "River", cards: ["3s"], actions: [] },
        {
          id: 4,
          street: "Showdown",
          actions: [
            {
              action_number: 3,
              player_id: "player1",
              action: "Shows Cards",
              cards: ["4s", "Jc"],
            },
            {
              action_number: 4,
              player_id: "player2",
              action: "Shows Cards",
              cards: ["Js", "2c"],
            },
          ],
        },
      ],
      pots: [
        {
          number: 0,
          amount: 100,
          winning_hand: "Pair of 3s",
          winning_cards: ["Jc", "Qd", "3d", "8d", "3s"],
          player_wins: [
            { player_id: "player1", win_amount: 50, contributed_rake: 0 },
            { player_id: "player2", win_amount: 50, contributed_rake: 0 },
          ],
        },
      ],
    };

    const filtered = HandHistory.filterHandForPlayer(hand, "player1");
    const view = HandHistory.getHandView(filtered, "player1");

    assert.ok(view.seats[0].winningCards?.includes("Jc"));
    assert.ok(view.seats[1].winningCards?.includes("Js"));
    assert.ok(!view.seats[1].winningCards?.includes("Jc"));
  });
});
