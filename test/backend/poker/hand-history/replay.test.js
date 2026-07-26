import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filterHandForPlayer,
  getHandReplay,
  getHandView,
} from "../../../../src/backend/poker/hand-history/index.js";

function createHand(overrides = {}) {
  return {
    spec_version: "1.4.6",
    site_name: "Pluton Poker",
    game_number: "replay-1",
    start_date_utc: "2026-01-01T00:00:00Z",
    game_type: "Holdem",
    bet_limit: { bet_type: "NL" },
    table_size: 6,
    dealer_seat: 1,
    small_blind_amount: 25,
    big_blind_amount: 50,
    ante_amount: 0,
    players: [
      { id: "player1", seat: 1, name: "Alice", starting_stack: 1000 },
      { id: "player2", seat: 2, name: "Bob", starting_stack: 1000 },
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
            cards: ["Ah", "Kh"],
          },
          {
            action_number: 2,
            player_id: "player2",
            action: "Dealt Cards",
            cards: ["Qc", "Jc"],
          },
          {
            action_number: 3,
            player_id: "player1",
            action: "Post SB",
            amount: 25,
          },
          {
            action_number: 4,
            player_id: "player2",
            action: "Post BB",
            amount: 50,
          },
          {
            action_number: 5,
            player_id: "player1",
            action: "Raise",
            amount: 150,
          },
          {
            action_number: 6,
            player_id: "player2",
            action: "Call",
            amount: 150,
          },
        ],
      },
      {
        id: 1,
        street: "Flop",
        cards: ["2c", "3d", "4h"],
        actions: [
          {
            action_number: 7,
            player_id: "player2",
            action: "Check",
          },
          {
            action_number: 8,
            player_id: "player1",
            action: "Bet",
            amount: 100,
          },
          {
            action_number: 9,
            player_id: "player2",
            action: "Fold",
          },
        ],
      },
    ],
    pots: [
      {
        number: 0,
        amount: 400,
        winning_hand: null,
        player_wins: [
          { player_id: "player1", win_amount: 400, contributed_rake: 0 },
        ],
      },
    ],
    ...overrides,
  };
}

function createReplay(rawHand = createHand(), playerId = "player1") {
  const hand = filterHandForPlayer(rawHand, playerId);
  const view = getHandView(hand, playerId);
  return { hand, view, replay: getHandReplay(hand, playerId, view) };
}

function occupiedSeat(view, playerId) {
  return view.seats.find((seat) => !seat.empty && seat.player.id === playerId);
}

function actionStep(replay, actionNumber) {
  return replay.steps.find((step) => step.actionNumber === actionNumber);
}

describe("hand-history replay", () => {
  it("starts with starting stacks, private cards, and no pot", () => {
    const { replay } = createReplay();
    const start = replay.steps[0];

    assert.equal(start.kind, "start");
    assert.equal(start.street, "Preflop");
    assert.equal(start.view.pot, 0);
    assert.deepEqual(occupiedSeat(start.view, "player1").cards, ["Ah", "Kh"]);
    assert.deepEqual(occupiedSeat(start.view, "player2").cards, ["??", "??"]);
    assert.equal(occupiedSeat(start.view, "player1").stack, 100000);
  });

  it("applies cumulative action amounts as deltas to bets, stacks, and pot", () => {
    const { replay } = createReplay();
    const raise = actionStep(replay, 5).view;
    const call = actionStep(replay, 6).view;

    assert.equal(raise.pot, 20000);
    assert.equal(occupiedSeat(raise, "player1").bet, 15000);
    assert.equal(occupiedSeat(raise, "player1").stack, 85000);
    assert.equal(call.pot, 30000);
    assert.equal(occupiedSeat(call, "player2").stack, 85000);
  });

  it("adds incremental antes and blinds before a cumulative raise", () => {
    const hand = createHand({
      rounds: [
        {
          id: 0,
          street: "Preflop",
          actions: [
            {
              action_number: 1,
              player_id: "player1",
              action: "Dealt Cards",
              cards: ["Ah", "Kh"],
            },
            {
              action_number: 2,
              player_id: "player1",
              action: "Post Ante",
              amount: 10,
            },
            {
              action_number: 3,
              player_id: "player1",
              action: "Post SB",
              amount: 25,
            },
            {
              action_number: 4,
              player_id: "player1",
              action: "Raise",
              amount: 100,
            },
          ],
        },
      ],
    });
    const { replay } = createReplay(hand);

    const blind = actionStep(replay, 3).view;
    assert.equal(blind.pot, 3500);
    assert.equal(occupiedSeat(blind, "player1").bet, 3500);

    const raise = actionStep(replay, 4).view;
    assert.equal(raise.pot, 10000);
    assert.equal(occupiedSeat(raise, "player1").bet, 10000);
    assert.equal(occupiedSeat(raise, "player1").stack, 90000);
  });

  it("resets displayed bets on a new street while retaining the pot", () => {
    const { replay } = createReplay();
    const flop = replay.steps.find(
      (step) => step.kind === "street" && step.street === "Flop",
    ).view;

    assert.deepEqual(flop.board.cards, ["2c", "3d", "4h"]);
    assert.equal(flop.pot, 30000);
    assert.equal(occupiedSeat(flop, "player1").bet, 0);
    assert.equal(occupiedSeat(flop, "player2").bet, 0);
  });

  it("tracks folds, all-ins, last actions, and per-street contributions", () => {
    const allInHand = createHand();
    allInHand.rounds[1].actions[1].amount = 850;
    allInHand.rounds[1].actions[1].is_allin = true;
    const { replay } = createReplay(allInHand);
    const bet = actionStep(replay, 8).view;
    const fold = actionStep(replay, 9).view;

    assert.equal(bet.pot, 115000);
    assert.equal(occupiedSeat(bet, "player1").stack, 0);
    assert.equal(occupiedSeat(bet, "player1").allIn, true);
    assert.equal(occupiedSeat(bet, "player1").lastAction, "Bet");
    assert.equal(occupiedSeat(fold, "player2").folded, true);
    assert.equal(occupiedSeat(fold, "player2").lastAction, "Fold");
  });

  it("rejects actions for players absent from the hand", () => {
    const hand = createHand();
    hand.rounds[0].actions.push({
      action_number: 10,
      player_id: "unknown-player",
      action: "Check",
    });

    assert.throws(
      () => createReplay(hand),
      /Replay action references unknown player: unknown-player/,
    );
  });

  it("rejects malformed dealt-card actions", () => {
    const unknownPlayerHand = createHand();
    unknownPlayerHand.rounds[0].actions[0].player_id = "unknown-player";
    assert.throws(
      () => createReplay(unknownPlayerHand),
      /Replay dealt cards reference unknown player: unknown-player/,
    );

    const missingCardsHand = createHand();
    delete missingCardsHand.rounds[0].actions[0].cards;
    assert.throws(
      () => createReplay(missingCardsHand),
      /Replay dealt cards are missing for player: player1/,
    );

    const duplicateDealHand = createHand();
    duplicateDealHand.rounds[0].actions.push({
      ...duplicateDealHand.rounds[0].actions[0],
      action_number: 10,
    });
    assert.throws(
      () => createReplay(duplicateDealHand),
      /Replay contains duplicate dealt cards for player: player1/,
    );
  });

  it("rejects malformed actions, rounds, and streets", () => {
    const missingShownCardsHand = createHand();
    missingShownCardsHand.rounds[1].actions.push({
      action_number: 10,
      player_id: "player1",
      action: "Shows Cards",
    });
    assert.throws(
      () => createReplay(missingShownCardsHand),
      /Replay shown cards are missing for player: player1/,
    );

    const missingDealHand = createHand();
    missingDealHand.rounds[0].actions.shift();
    missingDealHand.rounds[1].actions.push({
      action_number: 10,
      player_id: "player1",
      action: "Shows Cards",
      cards: ["Ah", "Kh"],
    });
    assert.throws(
      () => createReplay(missingDealHand),
      /Replay shown cards have no deal for player: player1/,
    );

    const mismatchedShownCardsHand = createHand();
    mismatchedShownCardsHand.rounds[1].actions.push({
      action_number: 10,
      player_id: "player2",
      action: "Shows Cards",
      cards: ["Qd"],
    });
    assert.throws(
      () => createReplay(mismatchedShownCardsHand),
      /Replay shown card Qd does not match the deal for player: player2/,
    );

    const unsupportedActionHand = createHand();
    unsupportedActionHand.rounds[1].actions.push({
      action_number: 10,
      player_id: "player1",
      action: "Dance",
    });
    assert.throws(
      () => createReplay(unsupportedActionHand),
      /Replay contains unsupported action: Dance/,
    );

    assert.throws(
      () => createReplay(createHand({ rounds: [] })),
      /Replay hand has no rounds/,
    );

    const unknownStreetHand = createHand();
    unknownStreetHand.rounds[1].street = "Ocean";
    assert.throws(
      () => createReplay(unknownStreetHand),
      /Replay contains unknown street: Ocean/,
    );
  });

  it("rejects contribution actions without an amount", () => {
    const hand = createHand();
    hand.rounds[0].actions.push({
      action_number: 10,
      player_id: "player1",
      action: "Bet",
    });

    assert.throws(
      () => createReplay(hand),
      /Replay contribution action Bet is missing an amount for player: player1/,
    );
  });

  it("rejects cumulative contributions below the player's previous bet", () => {
    const hand = createHand();
    hand.rounds[0].actions.push({
      action_number: 10,
      player_id: "player1",
      action: "Call",
      amount: 100,
    });

    assert.throws(
      () => createReplay(hand),
      /Replay contribution action Call is below the previous bet for player: player1/,
    );
  });

  it("rejects negative contributions and contributions exceeding the stack", () => {
    const negativeHand = createHand();
    negativeHand.rounds[1].actions[1].amount = -1;
    assert.throws(
      () => createReplay(negativeHand),
      /Replay contribution action Bet has a negative amount for player: player1/,
    );

    const oversizedHand = createHand();
    oversizedHand.rounds[1].actions[1].amount = 851;
    assert.throws(
      () => createReplay(oversizedHand),
      /Replay contribution action Bet exceeds the stack for player: player1/,
    );
  });

  it("adds street steps for board-only runouts", () => {
    const hand = createHand({
      rounds: [
        createHand().rounds[0],
        { id: 1, street: "Flop", cards: ["2c", "3d", "4h"], actions: [] },
        { id: 2, street: "Turn", cards: ["5s"], actions: [] },
        { id: 3, street: "River", cards: ["6c"], actions: [] },
      ],
    });
    const { replay } = createReplay(hand);
    const streetSteps = replay.steps.filter((step) => step.kind === "street");

    assert.deepEqual(
      streetSteps.map((step) => step.street),
      ["Flop", "Turn", "River"],
    );
    assert.deepEqual(streetSteps.at(-1).view.board.cards, [
      "2c",
      "3d",
      "4h",
      "5s",
      "6c",
    ]);
  });

  it("reveals only cards shown by an opponent and only at that action", () => {
    const hand = createHand({
      rounds: [
        createHand().rounds[0],
        {
          id: 1,
          street: "Showdown",
          actions: [
            {
              action_number: 10,
              player_id: "player2",
              action: "Shows Cards",
              cards: ["Qc"],
            },
          ],
        },
      ],
    });
    const { replay } = createReplay(hand);

    assert.deepEqual(occupiedSeat(replay.steps[0].view, "player2").cards, [
      "??",
      "??",
    ]);
    assert.deepEqual(
      occupiedSeat(actionStep(replay, 10).view, "player2").cards,
      ["Qc", "??"],
    );
  });

  it("uses the existing final view unchanged for split and side-pot results", () => {
    const hand = createHand({
      players: [
        { id: "player1", seat: 1, name: "Alice", starting_stack: 1000 },
        { id: "player2", seat: 2, name: "Bob", starting_stack: 1000 },
        { id: "player3", seat: 3, name: "Carol", starting_stack: 500 },
      ],
      pots: [
        {
          number: 0,
          amount: 300,
          winning_hand: "Straight",
          winning_cards: ["2c", "3d", "4h", "5s", "6c"],
          player_wins: [
            { player_id: "player1", win_amount: 150, contributed_rake: 0 },
            { player_id: "player2", win_amount: 150, contributed_rake: 0 },
          ],
        },
        {
          number: 1,
          amount: 100,
          winning_hand: "Pair",
          player_wins: [
            { player_id: "player3", win_amount: 100, contributed_rake: 0 },
          ],
        },
      ],
    });
    const { replay, view } = createReplay(hand);

    const result = replay.steps.at(-1);
    assert.equal(result.kind, "result");
    assert.deepEqual(result.view, view);
    assert.equal(result.view.pot, 40000);
    assert.equal(occupiedSeat(result.view, "player3").handResult, 10000);
  });
});
