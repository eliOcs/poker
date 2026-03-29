import { beforeEach, afterEach, describe, it } from "node:test";
import assert from "node:assert";
import {
  createUser,
  countActivePlayers,
  countTournamentActivePlayers,
  getOpenFinalTable,
  FINAL_TABLE_NAME,
  createMttContext,
} from "./mtt-test-context.js";

describe("mtt-manager table collapse", () => {
  const ctx = createMttContext();
  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  it("breaks small tables, moves players deterministically, and detects the winner", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 2,
    });
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
    assert.equal(sourceTable.tournament?.redirects?.owner, finalTable.id);
    assert.equal(sourceTable.hand.phase, "waiting");
    assert.equal(sourceTable.hand.actingSeat, -1);
    assert.equal(sourceTable.countdown, null);
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
  });

  it("retries table collapse on tick when destination was mid-hand during handleHandFinalized", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 2,
    });
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

    assert.equal(tournament.tables[0].closedAt, null);
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

  it("matches sitngo disconnect behavior when only one contender remains", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 2,
    });
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
    const disconnected = tournament.entrants.get(disconnectedSeat.player.id);
    const busted = tournament.entrants.get(bustedSeat.player.id);
    assert.equal(tournament.status, "finished");
    assert.equal(winner?.status, "winner");
    assert.equal(winner?.finishPosition, 1);
    assert.equal(disconnected?.status, "eliminated");
    assert.equal(disconnected?.finishPosition, 2);
    assert.equal(disconnected?.stack, 0);
    assert.equal(busted?.finishPosition, 3);
    assert.equal(sideTable.tournament?.winner, null);
    assert.equal(mainTable.tournament?.winner, winner?.seatIndex);
  });

  it("empties busted MTT seats while preserving the player's finish position", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
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
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 2,
    });
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
    assert.equal(tableB.pendingHandHistory, null);
    assert.ok(tournament.tables[0].closedAt);
    assert.ok(tournament.tables[1].closedAt);
    const finalTable = getOpenFinalTable(tournament, ctx.games);
    assert.ok(finalTable);
    assert.equal(countActivePlayers(tableA), 0);
    assert.equal(countActivePlayers(tableB), 0);
    assert.equal(countActivePlayers(finalTable), 2);
  });

  it("suppresses countdowns on waiting tables until pending collapse completes", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
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
    assert.equal(tableA.countdown, null);
    assert.equal(tournament.tables[0].closedAt, null);
    assert.equal(tournament.tables[1].closedAt, null);

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
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
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
    tableA.countdown = null;
    tableB.hand.phase = "waiting";
    tableB.countdown = 2;

    ctx.manager.handleHandFinalized(tableA);

    assert.equal(tournament.pendingCollapse, true);
    assert.equal(tableB.countdown, null);

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
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
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

    assert.equal(tableA.pendingHandHistory, null);
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
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
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

    assert.equal(tableA.pendingHandHistory, null);
    assert.equal(countActivePlayers(tableA), 5);
    assert.equal(countActivePlayers(tableB), 5);
  });
});
