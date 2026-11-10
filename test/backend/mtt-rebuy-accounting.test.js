import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { createMttContext, createUser } from "./mtt-test-context.js";
import { createTempDataDir, restoreDataDir } from "./temp-data-dir.js";
import {
  readTournamentSummary,
  writeHandToFile,
} from "../../src/backend/poker/hand-history/io.js";
import * as Store from "../../src/backend/store.js";
import { getPlayerProfile } from "../../src/backend/player-profile.js";
import { finalizeManagedTournament } from "../../src/backend/poker/tournament-summary.js";

describe("mtt rebuy accounting", () => {
  const ctx = createMttContext();
  let testDataDir;

  beforeEach(async () => {
    testDataDir = await createTempDataDir();
    process.env.DATA_DIR = testDataDir;
    ctx.setup();
  });

  afterEach(async () => {
    ctx.teardown();
    if (existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true });
    }
    restoreDataDir();
  });

  /**
   * @param {number} maxRebuys
   */
  function createFinishedTournament(maxRebuys, speed = "normal") {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner"),
      buyIn: 500,
      tableSize: 6,
      ...(maxRebuys === undefined ? {} : { maxRebuys }),
      speed,
    });
    ctx.manager.registerPlayer(tournamentId, createUser("p2"));
    ctx.manager.registerPlayer(tournamentId, createUser("p3"));
    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    tournament.status = "finished";
    tournament.startedAt = "2026-03-14T00:00:10.000Z";
    tournament.endedAt = "2026-03-14T00:30:00.000Z";
    for (const [index, entrant] of [
      ...tournament.entrants.values(),
    ].entries()) {
      entrant.status = index === 0 ? "winner" : "eliminated";
      entrant.finishPosition = index + 1;
      entrant.stack = index === 0 ? tournament.initialStack * 3 : 0;
    }
    return tournament;
  }

  it("preserves the baseline OTS shape when rebuys are disabled", async () => {
    const tournament = createFinishedTournament(0);

    await finalizeManagedTournament(tournament);

    const summary = await readTournamentSummary(tournament.id);
    assert.ok(summary);
    assert.deepEqual(summary.flags, ["MTT"]);
    assert.equal(summary.prize_pool, 15);
    assert.equal("rebuy_cost" in summary, false);
    assert.equal("tournament_rebuys" in summary, false);
  });

  it("records accepted rebuys and enlarges MTT awards", async () => {
    const tournament = createFinishedTournament(2, "turbo");
    const owner = tournament.entrants.get("owner");
    const p3 = tournament.entrants.get("p3");
    assert.ok(owner);
    assert.ok(p3);
    owner.rebuysUsed = 1;
    p3.rebuysUsed = 2;

    await finalizeManagedTournament(tournament);

    const summary = await readTournamentSummary(tournament.id);
    assert.ok(summary);
    assert.deepEqual(summary.flags, ["MTT", "Re-Entry"]);
    assert.deepEqual(summary.speed, { type: "turbo", round_time: 600 });
    assert.equal(summary.rebuy_cost, 5);
    assert.equal(summary.prize_pool, 30);
    assert.deepEqual(summary.tournament_rebuys, [
      { player_name: "owner", rebuys: 1 },
      { player_name: "p3", rebuys: 2 },
    ]);
    assert.deepEqual(
      summary.tournament_finishes_and_winnings.map((finish) => finish.prize),
      [30, 0, 0],
    );
  });

  it("writes Re-Entry fields for a default tournament with no accepted rebuys", async () => {
    const tournament = createFinishedTournament(undefined);

    await finalizeManagedTournament(tournament);

    const summary = await readTournamentSummary(tournament.id);
    assert.ok(summary);
    assert.equal(tournament.maxRebuys, 1);
    assert.deepEqual(summary.flags, ["MTT", "Re-Entry"]);
    assert.equal(summary.rebuy_cost, 5);
    assert.deepEqual(summary.tournament_rebuys, []);
  });

  it("counts rebuys in a running tournament's net, in the lobby and on profiles", async () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner"),
      buyIn: 500,
      tableSize: 6,
      maxRebuys: 1,
    });
    ctx.manager.registerPlayer(tournamentId, createUser("p2"));
    ctx.manager.registerPlayer(tournamentId, createUser("p3"));
    ctx.manager.startTournament(tournamentId, "owner");
    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const tableId = tournament.tables[0].tableId;
    // p2 lost a stack to the owner and bought another.
    const owner = tournament.entrants.get("owner");
    const p2 = tournament.entrants.get("p2");
    assert.ok(owner && p2);
    owner.stack = tournament.initialStack * 2;
    p2.rebuysUsed = 1;

    // One hand at the table, so the profile lists the tournament.
    const startedAt = "2026-03-14T00:01:00.000Z";
    const players = ["owner", "p2", "p3"];
    await writeHandToFile(tableId, {
      spec_version: "1.4.6",
      site_name: "Pluton Poker",
      game_number: `${tableId}-1`,
      start_date_utc: startedAt,
      game_type: "Hold'em",
      bet_limit: { bet_type: "NL" },
      table_size: 6,
      dealer_seat: 1,
      small_blind_amount: 25,
      big_blind_amount: 50,
      ante_amount: 0,
      players: players.map((id, index) => ({
        id,
        seat: index + 1,
        name: id,
        starting_stack: 5000,
      })),
      rounds: [{ id: 1, street: "Preflop", actions: [] }],
      pots: [{ number: 1, amount: 0, winning_hand: null, player_wins: [] }],
      tournament: true,
      tournament_info: {
        tournament_number: tournamentId,
        name: "Multi-Table Tournament",
        start_date_utc: startedAt,
        currency: "USD",
        buyin_amount: 5,
        fee_amount: 0,
        initial_stack: 5000,
        type: "MTT",
        speed: { type: "Normal", round_time: 20 },
      },
    });
    const activity = { lastHandNumber: 1, lastPlayedAt: startedAt };
    Store.recordHandActivity(
      players.map((playerId) => ({
        playerId,
        tableId,
        tournamentId,
        ...activity,
      })),
      players.map((playerId) => ({
        playerId,
        tournamentId,
        lastTableId: tableId,
        ...activity,
      })),
    );

    // Four buy-ins make a $20 pool; the chip leader would take it all.
    const expected = { owner: 1_500, p2: -1_000, p3: -500 };
    const view = ctx.manager.getTournamentView(tournamentId, "owner");
    assert.deepEqual(
      Object.fromEntries(
        view.standings.map((entry) => [entry.playerId, entry.netWinnings]),
      ),
      expected,
    );
    for (const [playerId, net] of Object.entries(expected)) {
      const profile = await getPlayerProfile(
        ctx.games,
        playerId,
        ctx.manager.getTournament,
      );
      assert.equal(profile?.recentGames[0]?.netWinnings, net, playerId);
    }
  });
});
