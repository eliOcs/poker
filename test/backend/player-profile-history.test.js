import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "assert";
import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as Store from "../../src/backend/store.js";
import { getPlayerProfile } from "../../src/backend/player-profile.js";
import {
  writeHandToFile,
  writeTournamentSummary,
} from "../../src/backend/poker/hand-history/io.js";
import { createTempDataDir } from "./temp-data-dir.js";
import {
  createHand,
  recordHandPlayers,
} from "./player-profile-test-helpers.js";

let testDataDir;

describe("player-profile history", function () {
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

  it("uses final tournament payout from summary when available", async function () {
    const tournamentHand = {
      spec_version: "1.4.6",
      site_name: "Pluton Poker",
      game_number: "tour456-1",
      start_date_utc: "2026-03-07T12:00:00.000Z",
      game_type: "Hold'em",
      bet_limit: { bet_type: "NL" },
      table_size: 6,
      dealer_seat: 1,
      small_blind_amount: 0.25,
      big_blind_amount: 0.5,
      ante_amount: 0,
      players: [
        { id: "player1", seat: 1, name: null, starting_stack: 50 },
        { id: "player2", seat: 2, name: null, starting_stack: 50 },
      ],
      rounds: [{ id: 1, street: "Preflop", actions: [] }],
      pots: [
        {
          number: 1,
          amount: 0,
          winning_hand: null,
          player_wins: [],
        },
      ],
      tournament: true,
      tournament_info: {
        tournament_number: "tour456",
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
    await writeHandToFile("tour456", tournamentHand);
    recordHandPlayers(tournamentHand, "tour456");

    await writeTournamentSummary("tour456", {
      spec_version: "1.1.3",
      site_name: "Pluton Poker",
      tournament_number: "tour456",
      tournament_name: "Sit & Go",
      start_date_utc: "2026-03-07T12:00:00.000Z",
      end_date_utc: "2026-03-07T12:30:00.000Z",
      currency: "USD",
      buyin_amount: 5,
      fee_amount: 0,
      initial_stack: 50,
      type: "STT",
      flags: ["SNG"],
      speed: { type: "normal", round_time: 900 },
      prize_pool: 30,
      player_count: 6,
      tournament_finishes_and_winnings: [
        {
          player_name: "player2",
          finish_position: 1,
          still_playing: false,
          prize: 24,
        },
        {
          player_name: "player1",
          finish_position: 2,
          still_playing: false,
          prize: 6,
        },
      ],
    });

    const profile = await getPlayerProfile(new Map(), "player1");

    assert.ok(profile);
    assert.strictEqual(profile.totalNetWinnings, 100);
    assert.deepStrictEqual(profile.recentGames, [
      {
        gameId: "tour456",
        tableId: "tour456",
        tournamentId: null,
        gameType: "sitngo",
        netWinnings: 100,
        handsPlayed: 1,
        lastPlayedAt: "2026-03-07T12:00:00.000Z",
        lastHandNumber: 1,
      },
    ]);
  });

  it("links recent games to the player's latest played hand in that game", async function () {
    const hand1 = createHand(
      "gamec789",
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
      ],
      [{ player_id: "player1", win_amount: 1, contributed_rake: 0 }],
    );
    hand1.start_date_utc = "2026-03-01T12:00:00.000Z";

    const hand3 = createHand(
      "gamec789",
      3,
      0.75,
      [
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
        { action_number: 3, player_id: "player2", action: "Fold" },
      ],
      [{ player_id: "player1", win_amount: 0.75, contributed_rake: 0 }],
    );
    hand3.start_date_utc = "2026-03-03T12:00:00.000Z";

    const hand4 = createHand(
      "gamec789",
      4,
      0.75,
      [
        {
          action_number: 1,
          player_id: "player2",
          action: "Post SB",
          amount: 0.25,
        },
        {
          action_number: 2,
          player_id: "player3",
          action: "Post BB",
          amount: 0.5,
        },
      ],
      [{ player_id: "player2", win_amount: 0.75, contributed_rake: 0 }],
    );
    hand4.players = [
      { id: "player2", seat: 1, name: "Bob", starting_stack: 10 },
      { id: "player3", seat: 2, name: "Carol", starting_stack: 10 },
    ];
    hand4.start_date_utc = "2026-03-04T12:00:00.000Z";

    await writeHandToFile("gamec789", hand1);
    await writeHandToFile("gamec789", hand3);
    await writeHandToFile("gamec789", hand4);
    recordHandPlayers(hand1, "gamec789");
    recordHandPlayers(hand3, "gamec789");

    const profile = await getPlayerProfile(new Map(), "player1");

    assert.ok(profile);
    assert.deepStrictEqual(profile.recentGames, [
      {
        gameId: "gamec789",
        tableId: "gamec789",
        tournamentId: null,
        gameType: "cash",
        netWinnings: 75,
        handsPlayed: 2,
        lastPlayedAt: "2026-03-03T12:00:00.000Z",
        lastHandNumber: 3,
      },
    ]);
  });

  it("groups multi-table tournament history by tournament id and links to the latest table", async function () {
    const tableOneHand = createHand(
      "mtttable1",
      1,
      1,
      [
        {
          action_number: 1,
          player_id: "player1",
          action: "Post SB",
          amount: 0.25,
        },
      ],
      [{ player_id: "player2", win_amount: 1, contributed_rake: 0 }],
    );
    tableOneHand.tournament = true;
    tableOneHand.tournament_info = {
      tournament_number: "mtt999",
      name: "Multi-Table Tournament",
      start_date_utc: "2026-03-10T12:00:00.000Z",
      currency: "USD",
      buyin_amount: 5,
      fee_amount: 0,
      initial_stack: 50,
      type: "MTT",
      speed: "Regular",
    };
    tableOneHand.start_date_utc = "2026-03-10T12:00:00.000Z";

    const tableTwoHand = createHand(
      "mtttable2",
      2,
      1,
      [
        {
          action_number: 1,
          player_id: "player1",
          action: "Post BB",
          amount: 0.5,
        },
      ],
      [{ player_id: "player1", win_amount: 1, contributed_rake: 0 }],
    );
    tableTwoHand.players = [
      { id: "player1", seat: 1, name: "Alice", starting_stack: 10 },
      { id: "player3", seat: 2, name: "Carol", starting_stack: 10 },
    ];
    tableTwoHand.tournament = true;
    tableTwoHand.tournament_info = {
      ...tableOneHand.tournament_info,
      tournament_number: "mtt999",
    };
    tableTwoHand.start_date_utc = "2026-03-11T12:00:00.000Z";

    await writeHandToFile("mtttable1", tableOneHand);
    await writeHandToFile("mtttable2", tableTwoHand);

    Store.recordPlayerTableActivity([
      {
        playerId: "player1",
        tableId: "mtttable1",
        tournamentId: "mtt999",
        lastHandNumber: 1,
        lastPlayedAt: tableOneHand.start_date_utc,
      },
      {
        playerId: "player1",
        tableId: "mtttable2",
        tournamentId: "mtt999",
        lastHandNumber: 2,
        lastPlayedAt: tableTwoHand.start_date_utc,
      },
    ]);
    Store.recordPlayerTournamentActivity([
      {
        playerId: "player1",
        tournamentId: "mtt999",
        lastTableId: "mtttable2",
        lastHandNumber: 2,
        lastPlayedAt: tableTwoHand.start_date_utc,
      },
    ]);

    const profile = await getPlayerProfile(new Map(), "player1");

    assert.ok(profile);
    assert.equal(profile.totalHands, 2);
    assert.equal(profile.totalNetWinnings, 0);
    assert.deepStrictEqual(profile.recentGames, [
      {
        gameId: "mtttable2",
        tableId: "mtttable2",
        tournamentId: "mtt999",
        gameType: "mtt",
        netWinnings: 0,
        handsPlayed: 2,
        lastPlayedAt: "2026-03-11T12:00:00.000Z",
        lastHandNumber: 2,
      },
    ]);
  });
});
