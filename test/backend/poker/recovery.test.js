import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { recoverGameFromHistory } from "../../../src/backend/poker/recovery.js";

const TEST_DATA_DIR = "test-data-recovery";

/**
 * @param {string} gameId
 * @param {object[]} hands
 * @param {string} [trailing]
 */
async function writeOHH(gameId, hands, trailing = "") {
  const content =
    hands.map((hand) => JSON.stringify({ ohh: hand })).join("\n\n") +
    "\n\n" +
    trailing;
  await writeFile(`${TEST_DATA_DIR}/${gameId}.ohh`, content, "utf8");
}

describe("game recovery", () => {
  beforeEach(async () => {
    process.env.DATA_DIR = TEST_DATA_DIR;
    if (existsSync(TEST_DATA_DIR)) {
      await rm(TEST_DATA_DIR, { recursive: true, force: true });
    }
    await mkdir(TEST_DATA_DIR, { recursive: true });
  });

  afterEach(async () => {
    delete process.env.DATA_DIR;
    if (existsSync(TEST_DATA_DIR)) {
      await rm(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  it("rebuilds a cash game from hand history", async () => {
    const gameId = "cashrecover1";
    await writeOHH(gameId, [
      {
        game_number: `${gameId}-1`,
        table_size: 6,
        dealer_seat: 1,
        small_blind_amount: 1,
        big_blind_amount: 2,
        ante_amount: 0,
        players: [
          { id: "p1", seat: 1, name: "Alice", starting_stack: 100 },
          { id: "p2", seat: 2, name: "Bob", starting_stack: 100 },
        ],
        rounds: [
          {
            id: 0,
            street: "Preflop",
            actions: [
              {
                action_number: 1,
                player_id: "p1",
                action: "Post SB",
                amount: 1,
              },
              {
                action_number: 2,
                player_id: "p2",
                action: "Post BB",
                amount: 2,
              },
              { action_number: 3, player_id: "p1", action: "Call", amount: 2 },
              { action_number: 4, player_id: "p2", action: "Check" },
            ],
          },
        ],
        pots: [
          {
            number: 0,
            amount: 4,
            player_wins: [
              { player_id: "p2", win_amount: 4, contributed_rake: 0 },
            ],
          },
        ],
      },
      {
        game_number: `${gameId}-2`,
        table_size: 6,
        dealer_seat: 2,
        small_blind_amount: 1,
        big_blind_amount: 2,
        ante_amount: 0,
        players: [
          { id: "p1", seat: 1, name: "Alice", starting_stack: 98 },
          { id: "p2", seat: 2, name: "Bob", starting_stack: 102 },
        ],
        rounds: [
          {
            id: 0,
            street: "Preflop",
            actions: [
              {
                action_number: 1,
                player_id: "p2",
                action: "Post SB",
                amount: 1,
              },
              {
                action_number: 2,
                player_id: "p1",
                action: "Post BB",
                amount: 2,
              },
              { action_number: 3, player_id: "p2", action: "Fold" },
            ],
          },
        ],
        pots: [
          {
            number: 0,
            amount: 3,
            player_wins: [
              { player_id: "p1", win_amount: 3, contributed_rake: 0 },
            ],
          },
        ],
      },
    ]);

    const game = await recoverGameFromHistory(gameId);

    assert.ok(game);
    assert.equal(game.id, gameId);
    assert.equal(game.handNumber, 2);
    assert.equal(game.tournament, null);
    assert.equal(game.blinds.small, 100);
    assert.equal(game.blinds.big, 200);
    assert.equal(game.button, 0);

    assert.equal(game.seats[0].empty, false);
    assert.equal(game.seats[1].empty, false);

    const seat1 =
      /** @type {import('../../../src/backend/poker/seat.js').OccupiedSeat} */ (
        game.seats[0]
      );
    const seat2 =
      /** @type {import('../../../src/backend/poker/seat.js').OccupiedSeat} */ (
        game.seats[1]
      );

    assert.equal(seat1.stack, 9900);
    assert.equal(seat2.stack, 10100);
    assert.equal(seat1.totalBuyIn, 10000);
    assert.equal(seat2.totalBuyIn, 10000);
    assert.equal(seat1.handsPlayed, 2);
    assert.equal(seat2.handsPlayed, 2);
    assert.equal(seat1.disconnected, true);
    assert.equal(seat2.disconnected, true);
  });

  it("ignores malformed trailing OHH data", async () => {
    const gameId = "cashrecover2";
    await writeOHH(
      gameId,
      [
        {
          game_number: `${gameId}-1`,
          table_size: 2,
          dealer_seat: 1,
          small_blind_amount: 0.5,
          big_blind_amount: 1,
          ante_amount: 0,
          players: [
            { id: "p1", seat: 1, name: "Alice", starting_stack: 20 },
            { id: "p2", seat: 2, name: "Bob", starting_stack: 20 },
          ],
          rounds: [],
          pots: [],
        },
      ],
      '{"ohh":',
    );

    const game = await recoverGameFromHistory(gameId);

    assert.ok(game);
    assert.equal(game.handNumber, 1);
    assert.equal(game.blinds.big, 100);
    assert.equal(game.seats[0].empty, false);
    assert.equal(game.seats[1].empty, false);
    const seat1 =
      /** @type {import('../../../src/backend/poker/seat.js').OccupiedSeat} */ (
        game.seats[0]
      );
    const seat2 =
      /** @type {import('../../../src/backend/poker/seat.js').OccupiedSeat} */ (
        game.seats[1]
      );
    assert.equal(seat1.disconnected, true);
    assert.equal(seat2.disconnected, true);
  });

  it("rebuilds tournament metadata and winner from OTS", async () => {
    const gameId = "tourrecover1";
    await writeOHH(gameId, [
      {
        game_number: `${gameId}-1`,
        table_size: 6,
        dealer_seat: 1,
        small_blind_amount: 50,
        big_blind_amount: 100,
        ante_amount: 0,
        tournament: true,
        tournament_info: {
          tournament_number: gameId,
          name: "Sit & Go",
          start_date_utc: "2026-02-07T08:00:00.000Z",
          currency: "USD",
          buyin_amount: 10,
          fee_amount: 0,
          initial_stack: 5000,
          type: "SnG",
          speed: "Regular",
        },
        players: [
          { id: "p1", seat: 1, name: "Alice", starting_stack: 5000 },
          { id: "p2", seat: 2, name: "Bob", starting_stack: 5000 },
        ],
        rounds: [
          {
            id: 0,
            street: "Preflop",
            actions: [
              {
                action_number: 1,
                player_id: "p1",
                action: "Post SB",
                amount: 50,
              },
              {
                action_number: 2,
                player_id: "p2",
                action: "Post BB",
                amount: 100,
              },
              {
                action_number: 3,
                player_id: "p1",
                action: "Raise",
                amount: 200,
              },
              { action_number: 4, player_id: "p2", action: "Fold" },
            ],
          },
        ],
        pots: [
          {
            number: 0,
            amount: 300,
            player_wins: [
              { player_id: "p1", win_amount: 300, contributed_rake: 0 },
            ],
          },
        ],
      },
    ]);

    await writeFile(
      `${TEST_DATA_DIR}/${gameId}.ots`,
      JSON.stringify(
        {
          ots: {
            tournament_number: gameId,
            buyin_amount: 10,
            initial_stack: 5000,
            start_date_utc: "2026-02-07T08:00:00.000Z",
            tournament_finishes_and_winnings: [
              { player_name: "Alice", finish_position: 1 },
              { player_name: "Bob", finish_position: 2 },
            ],
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const game = await recoverGameFromHistory(gameId);
    assert.ok(game);
    assert.ok(game.tournament);
    assert.equal(game.tournament.buyIn, 1000);
    assert.equal(game.tournament.initialStack, 500000);
    assert.equal(game.tournament.startTime, "2026-02-07T08:00:00.000Z");
    assert.equal(game.tournament.level, 2);
    assert.equal(game.tournament.winner, 0);
    assert.equal(game.button, 1);

    const seat1 =
      /** @type {import('../../../src/backend/poker/seat.js').OccupiedSeat} */ (
        game.seats[0]
      );
    const seat2 =
      /** @type {import('../../../src/backend/poker/seat.js').OccupiedSeat} */ (
        game.seats[1]
      );
    assert.equal(seat1.stack, 510000);
    assert.equal(seat2.stack, 490000);
    assert.equal(seat1.disconnected, true);
    assert.equal(seat2.disconnected, true);
  });

  it("returns null when no hand history exists", async () => {
    const game = await recoverGameFromHistory("doesnotexist");
    assert.equal(game, null);
  });
});
