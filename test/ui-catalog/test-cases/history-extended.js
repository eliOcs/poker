/**
 * UI Catalog Test Cases - Extended Hand History States
 *
 * Contains larger, multi-player hand history test cases.
 * Separated from test-cases-history.js to keep file sizes under 500 lines.
 */

import { createMockView } from "/fixtures.js";
import {
  createOHHHand,
  createHandListItem,
  historyView,
} from "../test-cases-history.js";

// === EXTENDED HISTORY TEST CASES ===

export const HISTORY_EXTENDED_TEST_CASES = {
  "history-showdown-lose": () => {
    const hand = createOHHHand({
      dealer_seat: 5,
      players: [
        { id: "player1", seat: 0, name: "Bob", starting_stack: 1000 },
        { id: "player2", seat: 1, name: "Alice", starting_stack: 1200 },
        { id: "player3", seat: 3, name: "Charlie", starting_stack: 750 },
        { id: "player4", seat: 4, name: "Diana", starting_stack: 900 },
        { id: "player5", seat: 5, name: "Eve", starting_stack: 500 },
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
              cards: ["Kc", "Ks"],
            },
            {
              action_number: 4,
              player_id: "player2",
              action: "Dealt Cards",
              cards: ["As", "Ad"],
            },
            {
              action_number: 5,
              player_id: "player3",
              action: "Dealt Cards",
              cards: ["9h", "9d"],
            },
            {
              action_number: 6,
              player_id: "player4",
              action: "Dealt Cards",
              cards: ["Jc", "Tc"],
            },
            {
              action_number: 7,
              player_id: "player5",
              action: "Dealt Cards",
              cards: ["5s", "5c"],
            },
            {
              action_number: 8,
              player_id: "player3",
              action: "Call",
              amount: 50,
            },
            { action_number: 9, player_id: "player4", action: "Fold" },
            {
              action_number: 10,
              player_id: "player5",
              action: "Call",
              amount: 50,
            },
            {
              action_number: 11,
              player_id: "player1",
              action: "Raise",
              amount: 150,
            },
            {
              action_number: 12,
              player_id: "player2",
              action: "Raise",
              amount: 350,
            },
            { action_number: 13, player_id: "player3", action: "Fold" },
            { action_number: 14, player_id: "player5", action: "Fold" },
            {
              action_number: 15,
              player_id: "player1",
              action: "Call",
              amount: 350,
            },
          ],
        },
        {
          id: 1,
          street: "Flop",
          cards: ["Kd", "5h", "2c"],
          actions: [
            { action_number: 16, player_id: "player1", action: "Check" },
            {
              action_number: 17,
              player_id: "player2",
              action: "Bet",
              amount: 200,
            },
            {
              action_number: 18,
              player_id: "player1",
              action: "Call",
              amount: 200,
            },
          ],
        },
        {
          id: 2,
          street: "Turn",
          cards: ["Ac"],
          actions: [
            { action_number: 19, player_id: "player1", action: "Check" },
            { action_number: 20, player_id: "player2", action: "Check" },
          ],
        },
        {
          id: 3,
          street: "River",
          cards: ["3s"],
          actions: [
            { action_number: 21, player_id: "player1", action: "Check" },
            { action_number: 22, player_id: "player2", action: "Check" },
          ],
        },
        {
          id: 4,
          street: "Showdown",
          actions: [
            {
              action_number: 23,
              player_id: "player1",
              action: "Shows Cards",
              cards: ["Kc", "Ks"],
            },
            {
              action_number: 24,
              player_id: "player2",
              action: "Shows Cards",
              cards: ["As", "Ad"],
            },
          ],
        },
      ],
      pots: [
        {
          number: 0,
          amount: 1200,
          winning_hand: "Three As",
          winning_cards: ["As", "Ad", "Ac", "Kd", "5h"],
          player_wins: [
            { player_id: "player2", win_amount: 1200, contributed_rake: 0 },
          ],
        },
      ],
    });

    return historyView({
      handNumber: 1,
      playerId: "player1",
      handList: [
        createHandListItem({
          hole_cards: ["Kc", "Ks"],
          winner_name: "Alice",
          winner_id: "player2",
          pot: 850,
          is_winner: false,
        }),
      ],
      hand,
      view: createMockView(hand, "player1"),
    });
  },

  "history-multiple-hands": () => {
    const hand = createOHHHand({
      game_number: "test123-2",
      start_date_utc: "2024-01-15T20:35:00Z",
      dealer_seat: 5,
      players: [
        { id: "player1", seat: 3, name: "Bob", starting_stack: 1150 },
        { id: "player2", seat: 5, name: "Alice", starting_stack: 850 },
      ],
      rounds: [
        {
          id: 0,
          street: "Preflop",
          actions: [
            {
              action_number: 1,
              player_id: "player2",
              action: "Post SB",
              amount: 25,
            },
            {
              action_number: 2,
              player_id: "player1",
              action: "Post BB",
              amount: 50,
            },
            {
              action_number: 3,
              player_id: "player2",
              action: "Dealt Cards",
              cards: ["Ah", "Qh"],
            },
            {
              action_number: 4,
              player_id: "player1",
              action: "Dealt Cards",
              cards: ["7s", "2d"],
            },
            {
              action_number: 5,
              player_id: "player2",
              action: "Raise",
              amount: 100,
            },
            {
              action_number: 6,
              player_id: "player1",
              action: "Call",
              amount: 100,
            },
          ],
        },
        {
          id: 1,
          street: "Flop",
          cards: ["Qc", "7h", "3d"],
          actions: [
            { action_number: 7, player_id: "player1", action: "Check" },
            { action_number: 8, player_id: "player2", action: "Check" },
          ],
        },
        {
          id: 2,
          street: "Turn",
          cards: ["Qs"],
          actions: [
            { action_number: 9, player_id: "player1", action: "Check" },
            { action_number: 10, player_id: "player2", action: "Check" },
          ],
        },
        {
          id: 3,
          street: "River",
          cards: ["5c"],
          actions: [
            { action_number: 11, player_id: "player1", action: "Check" },
            { action_number: 12, player_id: "player2", action: "Check" },
          ],
        },
        {
          id: 4,
          street: "Showdown",
          actions: [
            {
              action_number: 13,
              player_id: "player2",
              action: "Shows Cards",
              cards: ["Ah", "Qh"],
            },
            {
              action_number: 14,
              player_id: "player1",
              action: "Shows Cards",
              cards: ["7s", "2d"],
            },
          ],
        },
      ],
      pots: [
        {
          number: 0,
          amount: 200,
          winning_hand: "Three Qs",
          winning_cards: ["Qh", "Qc", "Qs", "Ah", "7h"],
          player_wins: [
            { player_id: "player2", win_amount: 200, contributed_rake: 0 },
          ],
        },
      ],
    });

    return historyView({
      handNumber: 2,
      playerId: "player1",
      handList: [
        createHandListItem({
          hand_number: 1,
          hole_cards: ["Ah", "Kh"],
          winner_name: "Bob",
          pot: 150,
          is_winner: true,
        }),
        createHandListItem({
          game_number: "test123-2",
          hand_number: 2,
          hole_cards: ["7s", "2d"],
          winner_name: "Alice",
          winner_id: "player2",
          pot: 200,
          is_winner: false,
        }),
        createHandListItem({
          game_number: "test123-3",
          hand_number: 3,
          hole_cards: ["Qc", "Qd"],
          winner_name: "Bob",
          pot: 350,
          is_winner: true,
        }),
        createHandListItem({
          game_number: "test123-4",
          hand_number: 4,
          hole_cards: ["Jc", "Ts"],
          winner_name: "Bob",
          winner_id: "player3",
          pot: 100,
          is_winner: false,
        }),
        createHandListItem({
          game_number: "test123-5",
          hand_number: 5,
          hole_cards: ["9h", "9s"],
          winner_name: "Bob",
          pot: 500,
          is_winner: true,
        }),
      ],
      hand,
      view: createMockView(hand, "player1"),
    });
  },
};

export const HISTORY_EXTENDED_IDS = [
  "history-showdown-lose",
  "history-multiple-hands",
];
