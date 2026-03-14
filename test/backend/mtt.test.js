import { beforeEach, afterEach, describe, it } from "node:test";
import assert from "node:assert";
import * as Store from "../../src/backend/store.js";
import { createMttManager } from "../../src/backend/mtt.js";
import * as Tournament from "../../src/shared/tournament.js";

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

    const savedFirstTable = Store.loadTable(tournament.tables[0].tableId);
    assert.equal(savedFirstTable?.tournamentId, tournamentId);
    assert.equal(savedFirstTable?.kind, "mtt");

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

  // eslint-disable-next-line complexity
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
    assert.equal(sourceTable.tournament?.redirects?.owner, destinationTable.id);
    assert.equal(countActivePlayers(destinationTable), 2);

    const finalBustSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        destinationTable.seats[0]
      );
    finalBustSeat.stack = 0;
    finalBustSeat.sittingOut = true;

    manager.handleHandFinalized(destinationTable);

    const winner = tournament.entrants.get("owner");
    const runnerUp = tournament.entrants.get(finalBustSeat.player.id);
    assert.equal(tournament.status, "finished");
    assert.equal(winner?.status, "winner");
    assert.equal(winner?.finishPosition, 1);
    assert.equal(runnerUp?.finishPosition, 2);
    assert.equal(destinationTable.tournament?.winner, winner?.seatIndex);
    assert.ok(Store.loadTable(tournament.tables[0].tableId)?.closedAt);
    assert.ok(Store.loadTable(tournament.tables[1].tableId)?.closedAt);
  });
});
