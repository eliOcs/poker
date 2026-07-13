import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import {
  createMttContext,
  createUser,
  getOpenFinalTable,
} from "./mtt-test-context.js";

/**
 * @param {ReturnType<typeof createMttContext>} ctx
 */
function startThreePlayerTournament(ctx) {
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

  return { tournamentId, tournament, sourceTable, destinationTable };
}

/**
 * @param {ReturnType<typeof createMttContext>} ctx
 */
function resetBroadcasts(ctx) {
  ctx.tableBroadcasts = [];
  ctx.tournamentBroadcasts = [];
  ctx.playerMoves = [];
}

describe("mtt-manager reconciliation", () => {
  const ctx = createMttContext();
  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  it("broadcasts each reconciliation entry path exactly once", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
    for (const id of ["p2", "p3", "p4", "p5", "p6", "p7"]) {
      ctx.manager.registerPlayer(
        tournamentId,
        createUser(id, id.toUpperCase()),
      );
    }
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const tableIds = tournament.tables.map((table) => table.tableId);
    const firstTable = ctx.games.get(tableIds[0]);
    assert.ok(firstTable);

    resetBroadcasts(ctx);
    ctx.manager.handleHandFinalized(firstTable);

    assert.deepEqual(ctx.tableBroadcasts, [firstTable.id]);
    assert.deepEqual(ctx.tournamentBroadcasts, [tournamentId]);
    assert.deepEqual(ctx.playerMoves, []);

    resetBroadcasts(ctx);
    ctx.manager.tickTournament(tournamentId);

    assert.deepEqual(ctx.tableBroadcasts, tableIds);
    assert.deepEqual(ctx.tournamentBroadcasts, [tournamentId]);
    assert.deepEqual(ctx.playerMoves, []);
  });

  it("does not detect a winner from transient mid-hand stacks on a tick", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
    ctx.manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const table = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(table);
    const allInSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        table.seats[1]
      );
    allInSeat.stack = 0;
    table.hand.phase = "turn";

    ctx.manager.tickTournament(tournamentId);

    assert.equal(tournament.status, "running");
    assert.equal(table.tournament?.winner, undefined);
  });

  it("forwards final-table moves once after hand finalization", () => {
    const { tournamentId, tournament, sourceTable, destinationTable } =
      startThreePlayerTournament(ctx);
    const bustedSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        sourceTable.seats[1]
      );
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;

    resetBroadcasts(ctx);
    ctx.manager.handleHandFinalized(sourceTable);

    const finalTable = getOpenFinalTable(tournament, ctx.games);
    assert.ok(finalTable);
    assert.deepEqual(ctx.tableBroadcasts, [
      sourceTable.id,
      finalTable.id,
      destinationTable.id,
    ]);
    assert.deepEqual(ctx.tournamentBroadcasts, [tournamentId]);
    assert.equal(ctx.playerMoves.length, 2);
    assert.ok(ctx.playerMoves.every((move) => move.tableId === finalTable.id));
    assert.equal(
      new Set(ctx.playerMoves.map((move) => move.playerId)).size,
      ctx.playerMoves.length,
    );
  });

  it("forwards deferred final-table moves while refreshing only the open table", () => {
    const { tournamentId, tournament, sourceTable, destinationTable } =
      startThreePlayerTournament(ctx);
    const bustedSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        sourceTable.seats[1]
      );
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;

    destinationTable.hand.phase = "flop";
    ctx.manager.handleHandFinalized(sourceTable);
    destinationTable.hand.phase = "waiting";

    resetBroadcasts(ctx);
    ctx.manager.tickTournament(tournamentId);

    const finalTable = getOpenFinalTable(tournament, ctx.games);
    assert.ok(finalTable);
    assert.deepEqual(ctx.tableBroadcasts, [finalTable.id]);
    assert.deepEqual(ctx.tournamentBroadcasts, [tournamentId]);
    assert.equal(ctx.playerMoves.length, 2);
    assert.ok(ctx.playerMoves.every((move) => move.tableId === finalTable.id));
  });
});
