import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import * as HandHistory from "../../src/backend/poker/hand-history/index.js";
import {
  countActivePlayers,
  createMttContext,
  createUser,
  getOpenFinalTable,
} from "./mtt-test-context.js";

function startTournament(ctx, options = {}) {
  const tournamentId = ctx.manager.createTournament({
    owner: createUser("owner", "Owner"),
    buyIn: 500,
    tableSize: 6,
    maxRebuys: 0,
    ...options,
  });
  ctx.manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
  ctx.manager.startTournament(tournamentId, "owner");
  return tournamentId;
}

describe("mtt late registration", () => {
  const ctx = createMttContext();
  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  it("admits, accounts for, and immediately seats an entrant while open", () => {
    const tournamentId = startTournament(ctx);
    const observerView = ctx.manager.getTournamentView(tournamentId, "p3");
    assert.equal(observerView.actions.canRegister, true);

    ctx.tableBroadcasts = [];
    ctx.tournamentBroadcasts = [];
    ctx.playerMoves = [];
    const view = ctx.manager.registerPlayer(
      tournamentId,
      createUser("p3", "Carol"),
    );
    const tournament = ctx.manager.getTournament(tournamentId);
    const entrant = tournament?.entrants.get("p3");

    assert.equal(view.currentPlayer.status, "seated");
    assert.ok(view.currentPlayer.tableId);
    assert.equal(view.entrants.length, 3);
    assert.equal(view.prizePool, 1_500);
    assert.equal(
      view.standings.find((entry) => entry.playerId === "p3")?.netWinnings,
      -500,
    );
    assert.equal(entrant?.stack, tournament?.initialStack);
    assert.equal(entrant?.handsPlayed, 0);
    assert.equal(entrant?.rebuysUsed, 0);
    assert.equal(entrant?.registrationOrder, 2);
    assert.match(entrant?.registeredAt ?? "", /^2026-03-14T00:00:/);
    assert.deepEqual(ctx.tournamentBroadcasts, [tournamentId]);
    assert.deepEqual(
      ctx.playerMoves.map((move) => move.playerId),
      ["p3"],
    );
    assert.deepEqual(ctx.tableBroadcasts, [view.currentPlayer.tableId]);
  });

  it("queues an entrant while every table is mid-hand and seats them on retry", () => {
    const tournamentId = startTournament(ctx);
    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const table = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(table);
    table.hand.phase = "flop";

    ctx.tableBroadcasts = [];
    ctx.tournamentBroadcasts = [];
    ctx.playerMoves = [];
    const queuedView = ctx.manager.registerPlayer(
      tournamentId,
      createUser("p3", "Carol"),
    );

    assert.equal(queuedView.currentPlayer.status, "registered");
    assert.equal(queuedView.currentPlayer.tableId, undefined);
    assert.equal(tournament.pendingRebalance, true);
    assert.deepEqual(ctx.tableBroadcasts, []);
    assert.deepEqual(ctx.tournamentBroadcasts, [tournamentId]);
    assert.deepEqual(ctx.playerMoves, []);
    assert.throws(
      () => ctx.manager.unregisterPlayer(tournamentId, "p3", "p3"),
      /registration is closed/,
    );

    table.hand.phase = "waiting";
    ctx.manager.tickTournament(tournamentId);

    assert.equal(tournament.entrants.get("p3")?.status, "seated");
    assert.equal(tournament.pendingRebalance, false);
    assert.equal(countActivePlayers(table), 3);
    assert.ok(ctx.playerMoves.some((move) => move.playerId === "p3"));
  });

  it("uses stable validation order and never readmits an eliminated entrant", () => {
    const missingGuest = createUser("guest");
    delete missingGuest.email;
    assert.throws(
      () => ctx.manager.registerPlayer("missing", missingGuest),
      /tournament not found/,
    );

    const tournamentId = startTournament(ctx);
    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const unsignedDuplicate = createUser("p2");
    delete unsignedDuplicate.email;
    assert.throws(
      () => ctx.manager.registerPlayer(tournamentId, unsignedDuplicate),
      /sign up required to register/,
    );

    const eliminated = tournament.entrants.get("p2");
    assert.ok(eliminated);
    eliminated.status = "eliminated";
    assert.throws(
      () => ctx.manager.registerPlayer(tournamentId, createUser("p2")),
      /player already registered/,
    );

    tournament.entryPeriodOpen = false;
    assert.throws(
      () => ctx.manager.registerPlayer(tournamentId, createUser("p3")),
      /registration is closed/,
    );
    tournament.status = "finished";
    assert.throws(
      () => ctx.manager.registerPlayer(tournamentId, createUser("p4")),
      /registration is closed/,
    );
  });

  it("disables late registration when the configured entry period is zero", () => {
    const tournamentId = startTournament(ctx, { entryPeriodLevels: 0 });

    const view = ctx.manager.getTournamentView(tournamentId, "p3");
    assert.equal(view.entryPeriodOpen, false);
    assert.equal(view.actions.canRegister, false);
    assert.throws(
      () => ctx.manager.registerPlayer(tournamentId, createUser("p3")),
      /registration is closed/,
    );
  });

  it("renames and grows a live final table without changing active participants", () => {
    const tournamentId = startTournament(ctx, { tableSize: 2 });
    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const originalFinalTable = getOpenFinalTable(tournament, ctx.games);
    assert.ok(originalFinalTable);
    const originalId = originalFinalTable.id;
    const originalPlayers = originalFinalTable.seats
      .filter((seat) => !seat.empty)
      .map((seat) => seat.player.id);
    originalFinalTable.hand.phase = "turn";
    HandHistory.startHand(originalFinalTable);

    const view = ctx.manager.registerPlayer(
      tournamentId,
      createUser("p3", "Carol"),
    );

    assert.equal(
      tournament.tables.filter((table) => !table.closedAt).length,
      2,
    );
    assert.equal(tournament.tables[0].tableId, originalId);
    assert.equal(tournament.tables[0].tableName, "Table 1");
    assert.equal(originalFinalTable.tableName, "Table 1");
    assert.equal(
      HandHistory.captureHand(originalFinalTable).table_name,
      "Final Table",
    );
    HandHistory.startHand(originalFinalTable);
    assert.equal(
      HandHistory.captureHand(originalFinalTable).table_name,
      "Table 1",
    );
    assert.deepEqual(
      originalFinalTable.seats
        .filter((seat) => !seat.empty)
        .map((seat) => seat.player.id),
      originalPlayers,
    );
    assert.equal(view.currentPlayer.status, "seated");
    assert.notEqual(view.currentPlayer.tableId, originalId);
    assert.equal(tournament.pendingRebalance, false);

    originalFinalTable.hand.phase = "waiting";
    ctx.manager.tickTournament(tournamentId);
    assert.equal(tournament.pendingRebalance, false);
    assert.deepEqual(
      tournament.tables
        .filter((table) => !table.closedAt)
        .map((table) => {
          const game = ctx.games.get(table.tableId);
          assert.ok(game);
          return countActivePlayers(game);
        }),
      [2, 1],
    );

    const bustedSeat = originalFinalTable.seats.find(
      (seat) => !seat.empty && seat.player.id === "p2",
    );
    assert.ok(bustedSeat && !bustedSeat.empty);
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;
    ctx.manager.handleHandFinalized(originalFinalTable);

    const newFinalTable = getOpenFinalTable(tournament, ctx.games);
    assert.ok(newFinalTable);
    assert.notEqual(newFinalTable.id, originalId);
    assert.equal(countActivePlayers(newFinalTable), 2);
    assert.equal(
      tournament.tables.filter((table) => !table.closedAt).length,
      1,
    );
  });

  it("creates as many tables as the growing field requires", () => {
    const tournamentId = startTournament(ctx, { tableSize: 2 });
    for (const id of ["p3", "p4", "p5", "p6", "p7"]) {
      ctx.manager.registerPlayer(tournamentId, createUser(id));
    }
    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);

    assert.equal(tournament.entrants.size, 7);
    assert.equal(
      tournament.tables.filter((table) => !table.closedAt).length,
      4,
    );
    assert.equal(
      tournament.tables.reduce((total, table) => {
        const game = ctx.games.get(table.tableId);
        assert.ok(game);
        return total + countActivePlayers(game);
      }, 0),
      7,
    );
  });

  it("counts a queued entrant in finish positions and blocks winner detection", () => {
    const tournamentId = startTournament(ctx);
    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const table = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(table);
    table.hand.phase = "river";
    ctx.manager.registerPlayer(tournamentId, createUser("p3", "Carol"));

    const bustedSeat = table.seats.find(
      (seat) => !seat.empty && seat.player.id === "p2",
    );
    assert.ok(bustedSeat && !bustedSeat.empty);
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;
    ctx.manager.handleHandFinalized(table);

    assert.equal(tournament.entrants.get("p2")?.finishPosition, 3);
    assert.equal(tournament.entrants.get("p3")?.status, "registered");
    assert.equal(tournament.status, "running");
    assert.equal(tournament.entrants.get("owner")?.status, "seated");
  });
});
