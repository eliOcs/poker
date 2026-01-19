/**
 * UI Catalog Test Cases - Hand History States
 *
 * Separated from main test-cases.js to keep file sizes manageable.
 */

import { html } from "lit";
import { createMockView } from "/fixtures.js";
import {
  HISTORY_EXTENDED_TEST_CASES,
  HISTORY_EXTENDED_IDS,
} from "./test-cases/history-extended.js";

// Hand history factory - creates a base OHH hand object
export function createOHHHand(overrides = {}) {
  return {
    spec_version: "1.4.6",
    site_name: "Pluton Poker",
    game_number: "test123-1",
    start_date_utc: "2024-01-15T20:30:00Z",
    game_type: "Holdem",
    bet_limit: { bet_type: "NL" },
    table_size: 6,
    dealer_seat: 0,
    small_blind_amount: 25,
    big_blind_amount: 50,
    ante_amount: 0,
    players: [],
    rounds: [],
    pots: [],
    ...overrides,
  };
}

// Hand list item factory
export function createHandListItem(overrides = {}) {
  return {
    game_number: "test123-1",
    hand_number: 1,
    hole_cards: ["??", "??"],
    winner_name: "Unknown",
    winner_id: "player1",
    pot: 100,
    is_winner: false,
    ...overrides,
  };
}

// History component wrapper
export function historyView(props) {
  return html`
    <div style="height: 100vh; width: 100%;">
      <phg-history
        .gameId=${props.gameId || "test123"}
        .handNumber=${props.handNumber}
        .playerId=${props.playerId}
        .loading=${props.loading || false}
        .handList=${props.handList || []}
        .hand=${props.hand}
        .view=${props.view}
      ></phg-history>
    </div>
  `;
}

// === HISTORY TEST CASES ===

const BASE_HISTORY_TEST_CASES = {
  "history-loading": () => html`
    <div style="height: 100vh; width: 100%;">
      <phg-history .gameId=${"test123"} .loading=${true}></phg-history>
    </div>
  `,

  "history-empty": () => html`
    <div style="height: 100vh; width: 100%;">
      <phg-history
        .gameId=${"test123"}
        .loading=${false}
        .handList=${[]}
      ></phg-history>
    </div>
  `,

  "history-preflop-fold": () => {
    const hand = createOHHHand({
      dealer_seat: 3,
      players: [
        { id: "player1", seat: 3, name: "Bob", starting_stack: 1000 },
        { id: "player2", seat: 5, name: "Alice", starting_stack: 1000 },
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
              cards: ["Ah", "Kh"],
            },
            {
              action_number: 4,
              player_id: "player2",
              action: "Dealt Cards",
              cards: ["??", "??"],
            },
            {
              action_number: 5,
              player_id: "player1",
              action: "Raise",
              amount: 150,
            },
            { action_number: 6, player_id: "player2", action: "Fold" },
          ],
        },
      ],
      pots: [
        {
          number: 0,
          amount: 75,
          winning_hand: null,
          winning_cards: null,
          player_wins: [
            { player_id: "player1", win_amount: 75, contributed_rake: 0 },
          ],
        },
      ],
    });

    return historyView({
      handNumber: 1,
      playerId: "player1",
      handList: [
        createHandListItem({
          hole_cards: ["Ah", "Kh"],
          winner_name: "Bob",
          pot: 75,
          is_winner: true,
        }),
      ],
      hand,
      view: createMockView(hand, "player1"),
    });
  },

  "history-showdown-win": () => {
    const hand = createOHHHand({
      players: [
        { id: "player1", seat: 1, name: "Bob", starting_stack: 1000 },
        { id: "player2", seat: 2, name: "Alice", starting_stack: 850 },
        { id: "player3", seat: 4, name: "Charlie", starting_stack: 1200 },
        { id: "player4", seat: 5, name: "Diana", starting_stack: 650 },
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
              cards: ["Jh", "Th"],
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
              cards: ["7c", "2d"],
            },
            {
              action_number: 6,
              player_id: "player4",
              action: "Dealt Cards",
              cards: ["Kd", "Qd"],
            },
            {
              action_number: 7,
              player_id: "player3",
              action: "Raise",
              amount: 150,
            },
            {
              action_number: 8,
              player_id: "player4",
              action: "Call",
              amount: 150,
            },
            {
              action_number: 9,
              player_id: "player1",
              action: "Call",
              amount: 150,
            },
            {
              action_number: 10,
              player_id: "player2",
              action: "Call",
              amount: 150,
            },
          ],
        },
        {
          id: 1,
          street: "Flop",
          cards: ["Ah", "Kh", "Qh"],
          actions: [
            { action_number: 11, player_id: "player1", action: "Check" },
            {
              action_number: 12,
              player_id: "player2",
              action: "Bet",
              amount: 200,
            },
            { action_number: 13, player_id: "player3", action: "Fold" },
            { action_number: 14, player_id: "player4", action: "Fold" },
            {
              action_number: 15,
              player_id: "player1",
              action: "Call",
              amount: 200,
            },
          ],
        },
        {
          id: 2,
          street: "Turn",
          cards: ["5c"],
          actions: [
            { action_number: 16, player_id: "player1", action: "Check" },
            { action_number: 17, player_id: "player2", action: "Check" },
          ],
        },
        {
          id: 3,
          street: "River",
          cards: ["2d"],
          actions: [
            { action_number: 18, player_id: "player1", action: "Check" },
            { action_number: 19, player_id: "player2", action: "Check" },
          ],
        },
        {
          id: 4,
          street: "Showdown",
          actions: [
            {
              action_number: 20,
              player_id: "player1",
              action: "Shows Cards",
              cards: ["Jh", "Th"],
            },
            {
              action_number: 21,
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
          amount: 1000,
          winning_hand: "Royal Flush",
          winning_cards: ["Ah", "Kh", "Qh", "Jh", "Th"],
          player_wins: [
            { player_id: "player1", win_amount: 1000, contributed_rake: 0 },
          ],
        },
      ],
    });

    return historyView({
      handNumber: 1,
      playerId: "player1",
      handList: [
        createHandListItem({
          hole_cards: ["Jh", "Th"],
          winner_name: "Bob",
          pot: 750,
          is_winner: true,
        }),
      ],
      hand,
      view: createMockView(hand, "player1"),
    });
  },
};

// Merge base and extended test cases
export const HISTORY_TEST_CASES = {
  ...BASE_HISTORY_TEST_CASES,
  ...HISTORY_EXTENDED_TEST_CASES,
};

export const HISTORY_CATEGORY = {
  name: "Hand History",
  ids: [
    "history-loading",
    "history-empty",
    "history-preflop-fold",
    "history-showdown-win",
    ...HISTORY_EXTENDED_IDS,
  ],
};
