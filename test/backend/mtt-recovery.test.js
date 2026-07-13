import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import * as Store from "../../src/backend/store.js";
import { createMttManager } from "../../src/backend/mtt.js";
import {
  writeHandToFile,
  writeTournamentSummary,
} from "../../src/backend/poker/hand-history/io.js";
import { createTempDataDir } from "./temp-data-dir.js";

let testDataDir;

describe("mtt recovery", () => {
  beforeEach(async () => {
    testDataDir = await createTempDataDir();
    process.env.DATA_DIR = testDataDir;
    Store._reset();
    Store.initialize();
  });

  afterEach(async () => {
    Store.close();
    if (existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true });
    }
    delete process.env.DATA_DIR;
  });

  it("rebuilds a finished tournament lobby from an OTS summary", async () => {
    Store.saveUser({
      id: "p1",
      name: "Winner",
      email: "winner@example.com",
      settings: { volume: 0.75, vibration: true },
    });
    Store.saveUser({
      id: "p2",
      name: "Runner Up",
      email: "runner@example.com",
      settings: { volume: 0.75, vibration: true },
    });

    const hand = {
      spec_version: "1.4.7",
      site_name: "Pluton Poker",
      game_number: "table123-7",
      start_date_utc: "2026-04-01T12:30:00.000Z",
      game_type: "Holdem",
      bet_limit: { bet_type: "NL" },
      table_name: "Final Table",
      table_size: 6,
      dealer_seat: 1,
      small_blind_amount: 0.25,
      big_blind_amount: 0.5,
      ante_amount: 0,
      players: [
        { id: "p1", seat: 1, name: "Winner", starting_stack: 50 },
        { id: "p2", seat: 2, name: "Runner Up", starting_stack: 50 },
      ],
      rounds: [{ id: 1, street: "Preflop", actions: [] }],
      pots: [],
      tournament: true,
      tournament_info: {
        tournament_number: "mtt123",
        name: "Recovered MTT",
        start_date_utc: "2026-04-01T12:00:00.000Z",
        currency: "USD",
        buyin_amount: 5,
        fee_amount: 0,
        initial_stack: 5000,
        type: "MTT",
        speed: "Regular",
      },
    };
    await writeHandToFile("table123", hand);
    Store.recordPlayerTableActivity(
      hand.players.map((player) => ({
        playerId: player.id,
        tableId: "table123",
        tournamentId: "mtt123",
        lastHandNumber: 7,
        lastPlayedAt: hand.start_date_utc,
      })),
    );

    await writeTournamentSummary("mtt123", {
      spec_version: "1.1.5",
      site_name: "Pluton Poker",
      tournament_number: "mtt123",
      tournament_name: "Recovered MTT",
      start_date_utc: "2026-04-01T12:00:00.000Z",
      end_date_utc: "2026-04-01T12:45:00.000Z",
      currency: "USD",
      buyin_amount: 5,
      fee_amount: 0,
      initial_stack: 5000,
      type: "MTT",
      flags: ["MTT"],
      speed: { type: "normal", round_time: 900 },
      prize_pool: 10,
      player_count: 2,
      tournament_finishes_and_winnings: [
        {
          player_name: "p1",
          finish_position: 1,
          still_playing: false,
          prize: 10,
        },
        {
          player_name: "p2",
          finish_position: 2,
          still_playing: false,
          prize: 0,
        },
      ],
    });

    const manager = createMttManager({ games: new Map() });
    assert.equal(manager.getTournament("mtt123"), null);

    const view = manager.getTournamentView("mtt123", "p2");

    assert.equal(view.status, "finished");
    assert.equal(view.name, "Recovered MTT");
    assert.equal(view.buyIn, 500);
    assert.equal(view.prizePool, 1000);
    assert.equal(view.currentPlayer.status, "eliminated");
    assert.equal(view.currentPlayer.tableId, "table123");
    assert.equal(view.currentPlayer.finishPosition, 2);
    assert.deepEqual(view.actions, {
      canRegister: false,
      canUnregister: false,
      canStart: false,
      canRename: false,
    });
    assert.deepEqual(view.tables, [
      {
        tableId: "table123",
        tableName: "Final Table",
        playerCount: 0,
        handNumber: 7,
        waiting: true,
        closed: true,
      },
    ]);
    assert.equal(view.standings[0].playerId, "p1");
    assert.equal(view.standings[0].tableId, "table123");
    assert.equal(view.standings[0].netWinnings, 500);
    assert.equal(view.standings[1].playerId, "p2");
    assert.equal(view.standings[1].tableId, "table123");
    assert.equal(view.standings[1].netWinnings, -500);
    const recoveredTournament = manager.getTournament("mtt123");
    assert.ok(recoveredTournament);
    assert.equal(recoveredTournament.maxRebuys, 0);
    assert.deepEqual(
      [...recoveredTournament.entrants.values()].map(
        (entrant) => entrant.rebuysUsed,
      ),
      [0, 0],
    );

    manager.close();
  });
});
