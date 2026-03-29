/* eslint-disable max-lines */
import { beforeEach, afterEach, describe, it } from "node:test";
import assert from "node:assert";
import * as Store from "../../src/backend/store.js";
import { createMttManager } from "../../src/backend/mtt.js";
import * as Tournament from "../../src/shared/tournament.js";

const FINAL_TABLE_NAME = "Final Table";

/**
 * @param {string} id
 * @param {string} [name]
 * @returns {import("../../src/backend/user.js").User}
 */
function createUser(id, name = id) {
  return {
    id,
    name,
    settings: { volume: 0.75 },
  };
}

/**
 * @param {import("../../src/backend/poker/game.js").Game} game
 * @returns {number}
 */
function countActivePlayers(game) {
  return game.seats.filter((seat) => !seat.empty && seat.stack > 0).length;
}

/**
 * @param {{ tables: Array<{ tableId: string, tableName: string, closedAt: string|null }> }} tournament
 * @param {Map<string, import("../../src/backend/poker/game.js").Game>} games
 * @returns {number}
 */
function countTournamentActivePlayers(tournament, games) {
  return tournament.tables.reduce((count, table) => {
    const game = games.get(table.tableId);
    return count + (game ? countActivePlayers(game) : 0);
  }, 0);
}

/**
 * @param {{ tables: Array<{ tableId: string, tableName: string, closedAt: string|null }> }} tournament
 * @param {Map<string, import("../../src/backend/poker/game.js").Game>} games
 * @returns {import("../../src/backend/poker/game.js").Game|null}
 */
function getOpenFinalTable(tournament, games) {
  const finalTable = tournament.tables.find(
    (table) => table.tableName === FINAL_TABLE_NAME && table.closedAt === null,
  );
  return finalTable ? games.get(finalTable.tableId) || null : null;
}

describe("mtt-manager", () => {
  /** @type {Map<string, import("../../src/backend/poker/game.js").Game>} */
  let games;
  /** @type {ReturnType<typeof createMttManager>} */
  let manager;
  /** @type {string[]} */
  let tableBroadcasts;
  /** @type {string[]} */
  let tournamentBroadcasts;
  let tickCount;

  beforeEach(() => {
    Store._reset();
    Store.initialize(":memory:");
    games = new Map();
    tableBroadcasts = [];
    tournamentBroadcasts = [];
    tickCount = 0;
    manager = createMttManager({
      games,
      broadcastTableState: (tableId) => {
        tableBroadcasts.push(tableId);
      },
      broadcastTournamentState: (tournamentId) => {
        tournamentBroadcasts.push(tournamentId);
      },
      ensureTableTick: () => {},
      finalizePendingTableHand: (game) => {
        if (!game.pendingHandHistory) {
          return false;
        }
        game.pendingHandHistory = null;
        return true;
      },
      now: () =>
        `2026-03-14T00:00:${String(tickCount++).padStart(2, "0")}.000Z`,
      setIntervalFn: () => ({ unref() {} }),
      clearIntervalFn: () => {},
    });
  });

  afterEach(() => {
    manager.close();
    Store.close();
  });

  it("auto-registers the owner and supports pre-start registration changes", () => {
    const tournamentId = manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });

    let view = manager.getTournamentView(tournamentId, "owner");
    assert.equal(view.status, "registration");
    assert.equal(view.entrants.length, 1);
    assert.equal(view.currentPlayer.status, "registered");
    assert.equal(view.actions.canStart, false);

    manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    view = manager.getTournamentView(tournamentId, "owner");
    assert.equal(view.entrants.length, 2);
    assert.equal(view.actions.canStart, true);

    manager.unregisterPlayer(tournamentId, "p2", "p2");
    view = manager.getTournamentView(tournamentId, "owner");
    assert.equal(view.entrants.length, 1);
    assert.equal(view.actions.canStart, false);
  });

  it("requires the owner to start and enforces the minimum player count", () => {
    const tournamentId = manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });

    assert.throws(() => {
      manager.startTournament(tournamentId, "owner");
    }, /need at least 2 registered players/);

    manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    assert.throws(() => {
      manager.startTournament(tournamentId, "p2");
    }, /only the tournament owner can start/);
  });

  it("creates balanced tables and propagates global blind levels", () => {
    const tournamentId = manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
    for (const id of ["p2", "p3", "p4", "p5", "p6", "p7"]) {
      manager.registerPlayer(tournamentId, createUser(id, id.toUpperCase()));
    }

    const view = manager.startTournament(tournamentId, "owner");
    assert.equal(view.status, "running");
    assert.equal(view.tables.length, 2);

    const tournament = manager.getTournament(tournamentId);
    assert.ok(tournament);
    const firstTable = games.get(tournament.tables[0].tableId);
    const secondTable = games.get(tournament.tables[1].tableId);
    assert.ok(firstTable);
    assert.ok(secondTable);
    assert.equal(countActivePlayers(firstTable), 4);
    assert.equal(countActivePlayers(secondTable), 3);

    tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;
    manager.tickTournament(tournamentId);

    const levelTwoBlinds = Tournament.getBlindsForLevel(2);
    assert.equal(tournament.level, 2);
    assert.deepStrictEqual(firstTable.blinds, {
      ante: levelTwoBlinds.ante,
      small: levelTwoBlinds.small,
      big: levelTwoBlinds.big,
    });
    assert.deepStrictEqual(secondTable.blinds, {
      ante: levelTwoBlinds.ante,
      small: levelTwoBlinds.small,
      big: levelTwoBlinds.big,
    });
  });

  it("starts tournament breaks only between hands", () => {
    const tournamentId = manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
    manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    manager.startTournament(tournamentId, "owner");

    const tournament = manager.getTournament(tournamentId);
    assert.ok(tournament);
    const table = games.get(tournament.tables[0].tableId);
    assert.ok(table);

    tournament.level = Tournament.BREAK_AFTER_LEVEL;
    tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;
    table.hand.phase = "turn";

    manager.tickTournament(tournamentId);
    assert.equal(tournament.pendingBreak, true);
    assert.equal(tournament.onBreak, false);

    table.hand.phase = "waiting";
    manager.handleHandFinalized(table);
    assert.equal(tournament.pendingBreak, false);
    assert.equal(tournament.onBreak, true);
  });

  it("restarts waiting-table countdowns when a break ends", () => {
    const tournamentId = manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
    manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    manager.startTournament(tournamentId, "owner");

    const tournament = manager.getTournament(tournamentId);
    assert.ok(tournament);
    const table = games.get(tournament.tables[0].tableId);
    assert.ok(table);

    tournament.level = Tournament.BREAK_AFTER_LEVEL;
    tournament.onBreak = true;
    tournament.breakTicks = Tournament.BREAK_DURATION_TICKS - 1;
    table.hand.phase = "waiting";
    table.countdown = null;

    manager.tickTournament(tournamentId);

    assert.equal(tournament.onBreak, false);
    assert.equal(tournament.level, Tournament.BREAK_AFTER_LEVEL + 1);
    assert.equal(table.countdown, 5);
  });

  it("breaks small tables, moves players deterministically, and detects the winner", () => {
    const tournamentId = manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 2,
    });
    manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    manager.registerPlayer(tournamentId, createUser("p3", "Carol"));
    manager.startTournament(tournamentId, "owner");

    const tournament = manager.getTournament(tournamentId);
    assert.ok(tournament);
    const sourceTable = games.get(tournament.tables[0].tableId);
    const destinationTable = games.get(tournament.tables[1].tableId);
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

    manager.handleHandFinalized(sourceTable);

    const bustedEntrant = tournament.entrants.get(bustedSeat.player.id);
    assert.equal(bustedEntrant?.status, "eliminated");
    assert.equal(bustedEntrant?.finishPosition, 3);
    assert.ok(tournament.tables[0].closedAt);
    assert.ok(tournament.tables[1].closedAt);
    const finalTable = getOpenFinalTable(tournament, games);
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

    tableBroadcasts = [];
    manager.tickTournament(tournamentId);
    assert.deepStrictEqual(tableBroadcasts, [finalTable.id]);

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

    manager.handleHandFinalized(finalTable);

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
    const tournamentId = manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 2,
    });
    manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    manager.registerPlayer(tournamentId, createUser("p3", "Carol"));
    manager.startTournament(tournamentId, "owner");

    const tournament = manager.getTournament(tournamentId);
    assert.ok(tournament);
    // Table 1: owner + p2, Table 2: p3
    const sourceTable = games.get(tournament.tables[0].tableId);
    const destTable = games.get(tournament.tables[1].tableId);
    assert.ok(sourceTable);
    assert.ok(destTable);
    assert.equal(countActivePlayers(sourceTable), 2);
    assert.equal(countActivePlayers(destTable), 1);

    // Bust p2 on source table
    const bustedSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        sourceTable.seats[1]
      );
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;

    // Destination table is mid-hand — collapse cannot happen yet
    destTable.hand.phase = "flop";
    manager.handleHandFinalized(sourceTable);

    // Source table should NOT be collapsed because destination is mid-hand
    assert.equal(tournament.tables[0].closedAt, null);
    assert.equal(countActivePlayers(sourceTable), 1);

    // Destination finishes its hand
    destTable.hand.phase = "waiting";

    // Tournament tick should now retry the collapse
    manager.tickTournament(tournamentId);

    const finalTable = getOpenFinalTable(tournament, games);
    assert.ok(finalTable);
    assert.equal(finalTable.tableName, FINAL_TABLE_NAME);
    // Both original tables are now collapsed, player moved to the new final table
    assert.ok(tournament.tables[0].closedAt);
    assert.ok(tournament.tables[1].closedAt);
    assert.equal(countActivePlayers(sourceTable), 0);
    assert.equal(countActivePlayers(destTable), 0);
    assert.equal(countActivePlayers(finalTable), 2);
  });

  it("matches sitngo disconnect behavior when only one contender remains", () => {
    const tournamentId = manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 2,
    });
    manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    manager.registerPlayer(tournamentId, createUser("p3", "Carol"));
    manager.startTournament(tournamentId, "owner");

    const tournament = manager.getTournament(tournamentId);
    assert.ok(tournament);
    const mainTable = games.get(tournament.tables[0].tableId);
    const sideTable = games.get(tournament.tables[1].tableId);
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

    manager.handleHandFinalized(mainTable);

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
    const tournamentId = manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
    for (let i = 2; i <= 11; i++) {
      manager.registerPlayer(tournamentId, createUser(`p${i}`, `Player ${i}`));
    }
    manager.startTournament(tournamentId, "owner");

    const tournament = manager.getTournament(tournamentId);
    assert.ok(tournament);

    const table = games.get(tournament.tables[0].tableId);
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

    manager.handleHandFinalized(table);

    assert.equal(table.seats[bustedSeatIndex].empty, true);

    const bustedView = manager.getTournamentView(
      tournamentId,
      bustedSeat.player.id,
    );
    assert.equal(bustedView.currentPlayer.status, "eliminated");
    assert.equal(bustedView.currentPlayer.finishPosition, 11);
  });

  it("finalizes waiting destination history before collapsing tables", () => {
    const tournamentId = manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 2,
    });
    manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    manager.registerPlayer(tournamentId, createUser("p3", "Carol"));
    manager.startTournament(tournamentId, "owner");

    const tournament = manager.getTournament(tournamentId);
    assert.ok(tournament);
    // Table A: owner + p2, Table B: p3
    const tableA = games.get(tournament.tables[0].tableId);
    const tableB = games.get(tournament.tables[1].tableId);
    assert.ok(tableA);
    assert.ok(tableB);
    assert.equal(countActivePlayers(tableA), 2);
    assert.equal(countActivePlayers(tableB), 1);

    // Bust p2 on table A — should create the final table
    const bustedSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        tableA.seats[1]
      );
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;

    // Table B has a finished hand that is waiting to be flushed.
    // The rebalancer should finalize it first, then collapse immediately.
    tableB.pendingHandHistory = [
      { potAmount: 100, awards: [{ seat: 0, amount: 100 }] },
    ];
    tableB.hand.phase = "waiting";
    tableB.countdown = 4;

    manager.handleHandFinalized(tableA);

    assert.equal(tournament.pendingCollapse, false);
    assert.equal(tableB.pendingHandHistory, null);
    assert.ok(tournament.tables[0].closedAt);
    assert.ok(tournament.tables[1].closedAt);
    const finalTable = getOpenFinalTable(tournament, games);
    assert.ok(finalTable);
    assert.equal(countActivePlayers(tableA), 0);
    assert.equal(countActivePlayers(tableB), 0);
    assert.equal(countActivePlayers(finalTable), 2);
  });

  it("suppresses countdowns on waiting tables until pending collapse completes", () => {
    // 6-max with 7 players → 2 tables (4 + 3). Bust 2 from table A → 5 left
    // → fits on 1 table (ceil(5/6) = 1). Table B mid-hand blocks collapse.
    // Table A (now 2 players, both waiting) must NOT start a new hand.
    const tournamentId = manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
    for (let i = 2; i <= 7; i++) {
      manager.registerPlayer(tournamentId, createUser(`p${i}`, `Player ${i}`));
    }
    manager.startTournament(tournamentId, "owner");

    const tournament = manager.getTournament(tournamentId);
    assert.ok(tournament);
    assert.equal(tournament.tables.length, 2);

    const tableA = games.get(tournament.tables[0].tableId);
    const tableB = games.get(tournament.tables[1].tableId);
    assert.ok(tableA);
    assert.ok(tableB);
    const tableAPlayers = countActivePlayers(tableA);
    const tableBPlayers = countActivePlayers(tableB);
    assert.equal(tableAPlayers + tableBPlayers, 7);

    // Bust 2 players on table A so remaining 5 fit on one 6-max table
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

    // Table B is mid-hand — collapse is blocked
    tableB.hand.phase = "flop";
    manager.handleHandFinalized(tableA);

    assert.equal(tournament.pendingCollapse, true);
    // Table A is waiting with >= 2 active players — countdown must be
    // suppressed so it doesn't start a new hand while collapse is pending
    assert.equal(tableA.countdown, null);
    assert.equal(tournament.tables[0].closedAt, null);
    assert.equal(tournament.tables[1].closedAt, null);

    // Table B finishes its hand
    tableB.hand.phase = "waiting";
    manager.handleHandFinalized(tableB);

    // Now the collapse should have completed
    assert.equal(tournament.pendingCollapse, false);
    const finalTable = getOpenFinalTable(tournament, games);
    assert.ok(finalTable);
    // Both original tables should be closed, with all remaining players on the final table
    const closedCount = tournament.tables.filter((t) => t.closedAt).length;
    assert.equal(closedCount, 2);
    assert.equal(countTournamentActivePlayers(tournament, games), 5);
    assert.equal(countActivePlayers(finalTable), 5);
  });

  it("freezes other waiting tables when hand finalization arrives after the busted table already restarted", () => {
    const tournamentId = manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
    for (let i = 2; i <= 7; i++) {
      manager.registerPlayer(tournamentId, createUser(`p${i}`, `Player ${i}`));
    }
    manager.startTournament(tournamentId, "owner");

    const tournament = manager.getTournament(tournamentId);
    assert.ok(tournament);

    const tableA = games.get(tournament.tables[0].tableId);
    const tableB = games.get(tournament.tables[1].tableId);
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

    // Simulate the real async path: the busted table has already restarted,
    // while the other table is still waiting and must be frozen immediately.
    tableA.hand.phase = "preflop";
    tableA.countdown = null;
    tableB.hand.phase = "waiting";
    tableB.countdown = 2;

    manager.handleHandFinalized(tableA);

    assert.equal(tournament.pendingCollapse, true);
    assert.equal(tableB.countdown, null);

    tableA.hand.phase = "waiting";
    manager.tickTournament(tournamentId);

    assert.equal(tournament.pendingCollapse, false);
    const finalTable = getOpenFinalTable(tournament, games);
    assert.ok(finalTable);
    const closedCount = tournament.tables.filter((t) => t.closedAt).length;
    assert.equal(closedCount, 2);
    assert.equal(countTournamentActivePlayers(tournament, games), 6);
    assert.equal(countActivePlayers(finalTable), 6);
  });

  it("finalizes a busted table's waiting hand on tick so final-table collapse can happen before restart", () => {
    const tournamentId = manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
    for (let i = 2; i <= 7; i++) {
      manager.registerPlayer(tournamentId, createUser(`p${i}`, `Player ${i}`));
    }
    manager.startTournament(tournamentId, "owner");

    const tournament = manager.getTournament(tournamentId);
    assert.ok(tournament);

    const tableA = games.get(tournament.tables[0].tableId);
    const tableB = games.get(tournament.tables[1].tableId);
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

    manager.tickTournament(tournamentId);

    assert.equal(tableA.pendingHandHistory, null);
    assert.equal(tournament.pendingCollapse, false);
    const finalTable = getOpenFinalTable(tournament, games);
    assert.ok(finalTable);
    const closedCount = tournament.tables.filter(
      (table) => table.closedAt,
    ).length;
    assert.equal(closedCount, 2);
    assert.equal(countTournamentActivePlayers(tournament, games), 6);
    assert.equal(countActivePlayers(finalTable), 6);
  });

  it("reuses newly-eliminated seats before balancing waiting tables", () => {
    const tournamentId = manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
    for (let i = 2; i <= 12; i++) {
      manager.registerPlayer(tournamentId, createUser(`p${i}`, `Player ${i}`));
    }
    manager.startTournament(tournamentId, "owner");

    const tournament = manager.getTournament(tournamentId);
    assert.ok(tournament);

    const tableA = games.get(tournament.tables[0].tableId);
    const tableB = games.get(tournament.tables[1].tableId);
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

    manager.tickTournament(tournamentId);

    assert.equal(tableA.pendingHandHistory, null);
    assert.equal(countActivePlayers(tableA), 5);
    assert.equal(countActivePlayers(tableB), 5);
  });
});
