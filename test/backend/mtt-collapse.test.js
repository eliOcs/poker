import { beforeEach, afterEach, describe, it } from "node:test";
import assert from "node:assert";
import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { readTournamentSummary } from "../../src/backend/poker/hand-history/io.js";
import {
  createUser,
  countActivePlayers,
  countTournamentActivePlayers,
  getOpenFinalTable,
  FINAL_TABLE_NAME,
  createMttContext,
} from "./mtt-test-context.js";
import { createTempDataDir } from "./temp-data-dir.js";

async function waitForTournamentSummary(tournamentId) {
  for (let i = 0; i < 20; i += 1) {
    const summary = await readTournamentSummary(tournamentId);
    if (summary) return summary;
    await delay(5);
  }
  return null;
}

/**
 * @param {ReturnType<typeof createMttContext>} ctx
 * @param {number} tableSize
 */
function createNoRebuyTournament(ctx, tableSize) {
  return ctx.manager.createTournament({
    owner: createUser("owner", "Owner"),
    buyIn: 500,
    tableSize,
    maxRebuys: 0,
  });
}

describe("mtt-manager table collapse", () => {
  const ctx = createMttContext();
  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  it("breaks small tables, moves players deterministically, and detects the winner", () => {
    const tournamentId = createNoRebuyTournament(ctx, 2);
    ctx.manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    ctx.manager.registerPlayer(tournamentId, createUser("p3", "Carol"));
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const sourceTable = ctx.games.get(tournament.tables[0].tableId);
    const destinationTable = ctx.games.get(tournament.tables[1].tableId);
    assert.ok(sourceTable);
    assert.ok(destinationTable);
    assert.equal(countActivePlayers(sourceTable), 2);
    assert.equal(countActivePlayers(destinationTable), 1);

    const bustedSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        sourceTable.seats[1]
      );
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;

    ctx.manager.handleHandFinalized(sourceTable);

    const bustedEntrant = tournament.entrants.get(bustedSeat.player.id);
    assert.equal(bustedEntrant?.status, "eliminated");
    assert.equal(bustedEntrant?.finishPosition, 3);
    assert.ok(tournament.tables[0].closedAt);
    assert.ok(tournament.tables[1].closedAt);
    const finalTable = getOpenFinalTable(tournament, ctx.games);
    assert.ok(finalTable);
    assert.equal(finalTable.tableName, FINAL_TABLE_NAME);
    assert.ok(
      ctx.playerMoves.some(
        (move) => move.playerId === "owner" && move.tableId === finalTable.id,
      ),
    );
    assert.equal(sourceTable.hand.phase, "waiting");
    assert.equal(sourceTable.hand.actingSeat, -1);
    assert.equal(sourceTable.countdown, undefined);
    assert.equal(countActivePlayers(sourceTable), 0);
    assert.ok(sourceTable.seats.every((seat) => seat.empty));
    assert.equal(countActivePlayers(destinationTable), 0);
    assert.equal(countActivePlayers(finalTable), 2);

    ctx.tableBroadcasts = [];
    ctx.manager.tickTournament(tournamentId);
    assert.deepStrictEqual(ctx.tableBroadcasts, [finalTable.id]);

    const finalBustSeatIndex = finalTable.seats.findIndex(
      (seat) => !seat.empty && seat.player.id !== "owner",
    );
    assert.notEqual(finalBustSeatIndex, -1);
    const finalBustSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        finalTable.seats[finalBustSeatIndex]
      );
    finalBustSeat.stack = 0;
    finalBustSeat.sittingOut = true;
    finalTable.actionClock.waitTicks = 15;
    finalTable.actionClock.countdownTicks = 59;

    ctx.manager.handleHandFinalized(finalTable);

    const winner = tournament.entrants.get("owner");
    const runnerUp = tournament.entrants.get(finalBustSeat.player.id);
    assert.equal(tournament.status, "finished");
    assert.equal(winner?.status, "winner");
    assert.equal(winner?.finishPosition, 1);
    assert.equal(runnerUp?.finishPosition, 2);
    assert.equal(finalTable.tournament?.winner, winner?.seatIndex);
    assert.ok(tournament.tables[0].closedAt);
    assert.ok(tournament.tables[1].closedAt);
    assert.ok(tournament.tables[2].closedAt);
    assert.deepStrictEqual(finalTable.actionClock, {
      waitTicks: 0,
      countdownTicks: 0,
    });
  });

  it("writes a tournament summary when an MTT finishes", async () => {
    const dataDir = await createTempDataDir();
    process.env.DATA_DIR = dataDir;
    try {
      const tournamentId = createNoRebuyTournament(ctx, 6);
      ctx.manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
      ctx.manager.startTournament(tournamentId, "owner");

      const tournament = ctx.manager.getTournament(tournamentId);
      assert.ok(tournament);
      const table = ctx.games.get(tournament.tables[0].tableId);
      assert.ok(table);

      const bustedSeat =
        /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
          table.seats[1]
        );
      bustedSeat.stack = 0;
      bustedSeat.sittingOut = true;

      ctx.manager.handleHandFinalized(table);

      const summary = await waitForTournamentSummary(tournamentId);
      assert.ok(summary);
      assert.equal(summary.tournament_number, tournamentId);
      assert.equal(summary.tournament_name, "Multi-Table Tournament");
      assert.equal(summary.type, "MTT");
      assert.deepEqual(summary.flags, ["MTT"]);
      assert.equal(summary.buyin_amount, 5);
      assert.equal(summary.prize_pool, 10);
      assert.deepEqual(summary.tournament_finishes_and_winnings, [
        {
          player_name: "owner",
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
      ]);
    } finally {
      delete process.env.DATA_DIR;
      if (existsSync(dataDir)) {
        await rm(dataDir, { recursive: true });
      }
    }
  });

  it("retries table collapse on tick when destination was mid-hand during handleHandFinalized", () => {
    const tournamentId = createNoRebuyTournament(ctx, 2);
    ctx.manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    ctx.manager.registerPlayer(tournamentId, createUser("p3", "Carol"));
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const sourceTable = ctx.games.get(tournament.tables[0].tableId);
    const destTable = ctx.games.get(tournament.tables[1].tableId);
    assert.ok(sourceTable);
    assert.ok(destTable);
    assert.equal(countActivePlayers(sourceTable), 2);
    assert.equal(countActivePlayers(destTable), 1);

    const bustedSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        sourceTable.seats[1]
      );
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;

    // Destination table is mid-hand — collapse cannot happen yet
    destTable.hand.phase = "flop";
    ctx.manager.handleHandFinalized(sourceTable);

    assert.equal(tournament.tables[0].closedAt, undefined);
    assert.equal(countActivePlayers(sourceTable), 1);

    destTable.hand.phase = "waiting";
    ctx.manager.tickTournament(tournamentId);

    const finalTable = getOpenFinalTable(tournament, ctx.games);
    assert.ok(finalTable);
    assert.equal(finalTable.tableName, FINAL_TABLE_NAME);
    assert.ok(tournament.tables[0].closedAt);
    assert.ok(tournament.tables[1].closedAt);
    assert.equal(countActivePlayers(sourceTable), 0);
    assert.equal(countActivePlayers(destTable), 0);
    assert.equal(countActivePlayers(finalTable), 2);
  });

  it("keeps chip-positive MTT entrants alive even if their seat is sitting out", () => {
    const tournamentId = createNoRebuyTournament(ctx, 2);
    ctx.manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    ctx.manager.registerPlayer(tournamentId, createUser("p3", "Carol"));
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const mainTable = ctx.games.get(tournament.tables[0].tableId);
    const sideTable = ctx.games.get(tournament.tables[1].tableId);
    assert.ok(mainTable);
    assert.ok(sideTable);

    const disconnectedSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        sideTable.seats[0]
      );
    disconnectedSeat.sittingOut = true;

    const bustedSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        mainTable.seats[1]
      );
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;

    ctx.manager.handleHandFinalized(mainTable);

    const winner = tournament.entrants.get("owner");
    const disconnected = tournament.entrants.get("p3");
    const busted = tournament.entrants.get(bustedSeat.player.id);
    assert.equal(tournament.status, "running");
    assert.equal(winner?.status, "seated");
    assert.equal(winner?.finishPosition, undefined);
    assert.equal(disconnected?.status, "seated");
    assert.equal(disconnected?.finishPosition, undefined);
    assert.equal(disconnected?.stack, disconnectedSeat.stack);
    assert.equal(busted?.finishPosition, 3);
  });

  it("empties busted MTT seats while preserving the player's finish position", () => {
    const tournamentId = createNoRebuyTournament(ctx, 6);
    for (let i = 2; i <= 11; i++) {
      ctx.manager.registerPlayer(
        tournamentId,
        createUser(`p${i}`, `Player ${i}`),
      );
    }
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);

    const table = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(table);

    const bustedSeatIndex = table.seats.findIndex(
      (seat) => !seat.empty && seat.player.id !== "owner",
    );
    assert.notEqual(bustedSeatIndex, -1);

    const bustedSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        table.seats[bustedSeatIndex]
      );
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;

    ctx.manager.handleHandFinalized(table);

    assert.equal(table.seats[bustedSeatIndex].empty, true);

    const bustedView = ctx.manager.getTournamentView(
      tournamentId,
      bustedSeat.player.id,
    );
    assert.equal(bustedView.currentPlayer.status, "eliminated");
    assert.equal(bustedView.currentPlayer.finishPosition, 11);
  });

  it("finalizes waiting destination history before collapsing tables", () => {
    const tournamentId = createNoRebuyTournament(ctx, 2);
    ctx.manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    ctx.manager.registerPlayer(tournamentId, createUser("p3", "Carol"));
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const tableA = ctx.games.get(tournament.tables[0].tableId);
    const tableB = ctx.games.get(tournament.tables[1].tableId);
    assert.ok(tableA);
    assert.ok(tableB);
    assert.equal(countActivePlayers(tableA), 2);
    assert.equal(countActivePlayers(tableB), 1);

    const bustedSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        tableA.seats[1]
      );
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;

    tableB.pendingHandHistory = [
      { potAmount: 100, awards: [{ seat: 0, amount: 100 }] },
    ];
    tableB.hand.phase = "waiting";
    tableB.countdown = 4;

    ctx.manager.handleHandFinalized(tableA);

    assert.equal(tournament.pendingCollapse, false);
    assert.equal(tableB.pendingHandHistory, undefined);
    assert.ok(tournament.tables[0].closedAt);
    assert.ok(tournament.tables[1].closedAt);
    const finalTable = getOpenFinalTable(tournament, ctx.games);
    assert.ok(finalTable);
    assert.equal(countActivePlayers(tableA), 0);
    assert.equal(countActivePlayers(tableB), 0);
    assert.equal(countActivePlayers(finalTable), 2);
  });

  it("suppresses countdowns on waiting tables until pending collapse completes", () => {
    const tournamentId = createNoRebuyTournament(ctx, 6);
    for (let i = 2; i <= 7; i++) {
      ctx.manager.registerPlayer(
        tournamentId,
        createUser(`p${i}`, `Player ${i}`),
      );
    }
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    assert.equal(tournament.tables.length, 2);

    const tableA = ctx.games.get(tournament.tables[0].tableId);
    const tableB = ctx.games.get(tournament.tables[1].tableId);
    assert.ok(tableA);
    assert.ok(tableB);
    const tableAPlayers = countActivePlayers(tableA);
    const tableBPlayers = countActivePlayers(tableB);
    assert.equal(tableAPlayers + tableBPlayers, 7);

    let busted = 0;
    for (const seat of tableA.seats) {
      if (!seat.empty && seat.player.id !== "owner" && busted < 2) {
        seat.stack = 0;
        seat.sittingOut = true;
        busted++;
      }
    }
    assert.equal(busted, 2);
    assert.ok(countActivePlayers(tableA) >= 2, "table A still has 2+ players");

    tableB.hand.phase = "flop";
    ctx.manager.handleHandFinalized(tableA);

    assert.equal(tournament.pendingCollapse, true);
    assert.equal(tableA.countdown, undefined);
    assert.equal(tournament.tables[0].closedAt, undefined);
    assert.equal(tournament.tables[1].closedAt, undefined);

    tableB.hand.phase = "waiting";
    ctx.manager.handleHandFinalized(tableB);

    assert.equal(tournament.pendingCollapse, false);
    const finalTable = getOpenFinalTable(tournament, ctx.games);
    assert.ok(finalTable);
    const closedCount = tournament.tables.filter((t) => t.closedAt).length;
    assert.equal(closedCount, 2);
    assert.equal(countTournamentActivePlayers(tournament, ctx.games), 5);
    assert.equal(countActivePlayers(finalTable), 5);
  });

  it("freezes other waiting tables when hand finalization arrives after the busted table already restarted", () => {
    const tournamentId = createNoRebuyTournament(ctx, 6);
    for (let i = 2; i <= 7; i++) {
      ctx.manager.registerPlayer(
        tournamentId,
        createUser(`p${i}`, `Player ${i}`),
      );
    }
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);

    const tableA = ctx.games.get(tournament.tables[0].tableId);
    const tableB = ctx.games.get(tournament.tables[1].tableId);
    assert.ok(tableA);
    assert.ok(tableB);
    assert.equal(countActivePlayers(tableA), 4);
    assert.equal(countActivePlayers(tableB), 3);

    let busted = 0;
    for (const seat of tableA.seats) {
      if (!seat.empty && seat.player.id !== "owner" && busted < 1) {
        seat.stack = 0;
        seat.sittingOut = true;
        busted++;
      }
    }
    assert.equal(busted, 1);
    assert.equal(countActivePlayers(tableA) + countActivePlayers(tableB), 6);

    tableA.hand.phase = "preflop";
    delete tableA.countdown;
    tableB.hand.phase = "waiting";
    tableB.countdown = 2;

    ctx.manager.handleHandFinalized(tableA);

    assert.equal(tournament.pendingCollapse, true);
    assert.equal(tableB.countdown, undefined);

    tableA.hand.phase = "waiting";
    ctx.manager.tickTournament(tournamentId);

    assert.equal(tournament.pendingCollapse, false);
    const finalTable = getOpenFinalTable(tournament, ctx.games);
    assert.ok(finalTable);
    const closedCount = tournament.tables.filter((t) => t.closedAt).length;
    assert.equal(closedCount, 2);
    assert.equal(countTournamentActivePlayers(tournament, ctx.games), 6);
    assert.equal(countActivePlayers(finalTable), 6);
  });

  it("finalizes a busted table's waiting hand on tick so final-table collapse can happen before restart", () => {
    const tournamentId = createNoRebuyTournament(ctx, 6);
    for (let i = 2; i <= 7; i++) {
      ctx.manager.registerPlayer(
        tournamentId,
        createUser(`p${i}`, `Player ${i}`),
      );
    }
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);

    const tableA = ctx.games.get(tournament.tables[0].tableId);
    const tableB = ctx.games.get(tournament.tables[1].tableId);
    assert.ok(tableA);
    assert.ok(tableB);
    assert.equal(countActivePlayers(tableA), 4);
    assert.equal(countActivePlayers(tableB), 3);

    let busted = 0;
    for (const seat of tableA.seats) {
      if (!seat.empty && seat.player.id !== "owner" && busted < 1) {
        seat.stack = 0;
        seat.sittingOut = true;
        busted++;
      }
    }
    assert.equal(busted, 1);
    assert.equal(countActivePlayers(tableA) + countActivePlayers(tableB), 6);

    tableA.hand.phase = "waiting";
    tableA.countdown = 4;
    tableA.pendingHandHistory = [
      { potAmount: 100, awards: [{ seat: 0, amount: 100 }] },
    ];
    tableB.hand.phase = "waiting";
    tableB.countdown = 2;

    ctx.manager.tickTournament(tournamentId);

    assert.equal(tableA.pendingHandHistory, undefined);
    assert.equal(tournament.pendingCollapse, false);
    const finalTable = getOpenFinalTable(tournament, ctx.games);
    assert.ok(finalTable);
    const closedCount = tournament.tables.filter(
      (table) => table.closedAt,
    ).length;
    assert.equal(closedCount, 2);
    assert.equal(countTournamentActivePlayers(tournament, ctx.games), 6);
    assert.equal(countActivePlayers(finalTable), 6);
  });

  it("reuses newly-eliminated seats before balancing waiting tables", () => {
    const tournamentId = createNoRebuyTournament(ctx, 6);
    for (let i = 2; i <= 12; i++) {
      ctx.manager.registerPlayer(
        tournamentId,
        createUser(`p${i}`, `Player ${i}`),
      );
    }
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);

    const tableA = ctx.games.get(tournament.tables[0].tableId);
    const tableB = ctx.games.get(tournament.tables[1].tableId);
    assert.ok(tableA);
    assert.ok(tableB);
    assert.equal(countActivePlayers(tableA), 6);
    assert.equal(countActivePlayers(tableB), 6);

    let busted = 0;
    for (const seat of tableA.seats) {
      if (!seat.empty && seat.player.id !== "owner" && busted < 2) {
        seat.stack = 0;
        seat.sittingOut = true;
        busted++;
      }
    }
    assert.equal(busted, 2);

    tableA.hand.phase = "waiting";
    tableA.countdown = 4;
    tableA.pendingHandHistory = [
      { potAmount: 100, awards: [{ seat: 0, amount: 100 }] },
    ];
    tableB.hand.phase = "waiting";
    tableB.countdown = 2;

    ctx.manager.tickTournament(tournamentId);

    assert.equal(tableA.pendingHandHistory, undefined);
    assert.equal(countActivePlayers(tableA), 5);
    assert.equal(countActivePlayers(tableB), 5);
  });
});
