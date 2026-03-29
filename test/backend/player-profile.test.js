import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "assert";
import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as Store from "../../src/backend/store.js";
import { getPlayerProfile } from "../../src/backend/player-profile.js";
import { writeHandToFile } from "../../src/backend/poker/hand-history/io.js";
import * as Game from "../../src/backend/poker/game.js";
import * as Seat from "../../src/backend/poker/seat.js";
import { createTempDataDir } from "./temp-data-dir.js";
import {
  createHand,
  recordHandPlayers,
} from "./player-profile-test-helpers.js";

let testDataDir;

describe("player-profile", function () {
  beforeEach(async function () {
    testDataDir = await createTempDataDir();
    process.env.DATA_DIR = testDataDir;
    Store._reset();
    Store.initialize();
  });

  afterEach(async function () {
    Store.close();
    if (existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true });
    }
    delete process.env.DATA_DIR;
  });

  it("aggregates hand totals and online status", async function () {
    Store.saveUser({
      id: "player1",
      name: "Alice",
      settings: { volume: 0.75 },
    });

    const hand1 = createHand(
      "gamea123",
      1,
      1,
      [
        {
          action_number: 1,
          player_id: "player1",
          action: "Post SB",
          amount: 0.25,
        },
        {
          action_number: 2,
          player_id: "player2",
          action: "Post BB",
          amount: 0.5,
        },
        {
          action_number: 3,
          player_id: "player1",
          action: "Call",
          amount: 0.5,
        },
        { action_number: 4, player_id: "player2", action: "Check" },
      ],
      [{ player_id: "player1", win_amount: 1, contributed_rake: 0 }],
    );
    await writeHandToFile("gamea123", hand1);
    recordHandPlayers(hand1, "gamea123");

    const hand2 = createHand(
      "gameb456",
      2,
      0.75,
      [
        {
          action_number: 1,
          player_id: "player1",
          action: "Post SB",
          amount: 0.25,
        },
        {
          action_number: 2,
          player_id: "player2",
          action: "Post BB",
          amount: 0.5,
        },
        { action_number: 3, player_id: "player1", action: "Fold" },
      ],
      [{ player_id: "player2", win_amount: 0.75, contributed_rake: 0 }],
    );
    await writeHandToFile("gameb456", hand2);
    recordHandPlayers(hand2, "gameb456");

    const game = Game.create({ seats: 6 });
    game.seats[0] = Seat.occupied({ id: "player1", name: "Alice" }, 1000);
    const games = new Map([[game.id, game]]);

    const profile = await getPlayerProfile(games, "player1");

    assert.ok(profile);
    assert.strictEqual(profile.name, "Alice");
    assert.strictEqual(profile.online, true);
    assert.strictEqual(profile.totalHands, 2);
    assert.strictEqual(profile.totalNetWinnings, 25);
    assert.deepStrictEqual(profile.recentGames, [
      {
        gameId: "gameb456",
        tableId: "gameb456",
        tournamentId: null,
        gameType: "cash",
        netWinnings: -25,
        handsPlayed: 1,
        lastPlayedAt: "2026-03-02T12:00:00.000Z",
        lastHandNumber: 2,
      },
      {
        gameId: "gamea123",
        tableId: "gamea123",
        tournamentId: null,
        gameType: "cash",
        netWinnings: 50,
        handsPlayed: 1,
        lastPlayedAt: "2026-03-01T12:00:00.000Z",
        lastHandNumber: 1,
      },
    ]);
    assert.match(profile.joinedAt, /^\d{4}-\d{2}-\d{2} /);
    assert.match(profile.lastSeenAt, /^\d{4}-\d{2}-\d{2} /);
  });

  it("returns null when player does not exist", async function () {
    const profile = await getPlayerProfile(new Map(), "missing");
    assert.strictEqual(profile, null);
  });

  it("uses tournament ranking values instead of tournament chip swings", async function () {
    const tournamentHand = {
      spec_version: "1.4.6",
      site_name: "Pluton Poker",
      game_number: "tour123-1",
      start_date_utc: "2026-03-07T12:00:00.000Z",
      game_type: "Hold'em",
      bet_limit: { bet_type: "NL" },
      table_size: 3,
      dealer_seat: 1,
      small_blind_amount: 0.25,
      big_blind_amount: 0.5,
      ante_amount: 0,
      players: [
        { id: "player1", seat: 1, name: null, starting_stack: 50 },
        { id: "player2", seat: 2, name: null, starting_stack: 50 },
        { id: "player3", seat: 3, name: null, starting_stack: 50 },
      ],
      rounds: [
        {
          id: 1,
          street: "Preflop",
          actions: [
            {
              action_number: 1,
              player_id: "player2",
              action: "Post SB",
              amount: 0.25,
            },
            {
              action_number: 2,
              player_id: "player1",
              action: "Post BB",
              amount: 0.5,
            },
            { action_number: 3, player_id: "player3", action: "Fold" },
            {
              action_number: 4,
              player_id: "player2",
              action: "Call",
              amount: 0.5,
            },
            { action_number: 5, player_id: "player1", action: "Check" },
          ],
        },
        {
          id: 2,
          street: "Flop",
          actions: [
            {
              action_number: 6,
              player_id: "player2",
              action: "Bet",
              amount: 0.5,
            },
            { action_number: 7, player_id: "player1", action: "Fold" },
          ],
        },
      ],
      pots: [
        {
          number: 1,
          amount: 1.75,
          winning_hand: null,
          player_wins: [
            { player_id: "player2", win_amount: 1.75, contributed_rake: 0 },
          ],
        },
      ],
      tournament: true,
      tournament_info: {
        tournament_number: "tour123",
        name: "Sit & Go",
        start_date_utc: "2026-03-07T12:00:00.000Z",
        currency: "USD",
        buyin_amount: 5,
        fee_amount: 0,
        initial_stack: 50,
        type: "SnG",
        speed: "Regular",
      },
    };
    await writeHandToFile("tour123", tournamentHand);
    recordHandPlayers(tournamentHand, "tour123");

    const profile = await getPlayerProfile(new Map(), "player1");

    assert.ok(profile);
    assert.strictEqual(profile.totalHands, 1);
    assert.strictEqual(profile.totalNetWinnings, -500);
    assert.deepStrictEqual(profile.recentGames, [
      {
        gameId: "tour123",
        tableId: "tour123",
        tournamentId: null,
        gameType: "sitngo",
        netWinnings: -500,
        handsPlayed: 1,
        lastPlayedAt: "2026-03-07T12:00:00.000Z",
        lastHandNumber: 1,
      },
    ]);
  });
});
