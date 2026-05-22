import { beforeEach, afterEach, describe, it } from "node:test";
import assert from "node:assert";
import * as Tournament from "../../src/shared/tournament.js";
import {
  FINAL_TABLE_NAME,
  createUser,
  countActivePlayers,
  createMttContext,
} from "./mtt-test-context.js";

describe("mtt-manager", () => {
  const ctx = createMttContext();
  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  it("auto-registers the owner and supports pre-start registration changes", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });

    let view = ctx.manager.getTournamentView(tournamentId, "owner");
    assert.equal(view.status, "registration");
    assert.equal(view.name, "Multi-Table Tournament");
    assert.equal(view.entrants.length, 1);
    assert.equal(view.currentPlayer.status, "registered");
    assert.equal(view.actions.canStart, false);

    ctx.manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    view = ctx.manager.getTournamentView(tournamentId, "owner");
    assert.equal(view.entrants.length, 2);
    assert.equal(view.actions.canStart, true);

    ctx.manager.unregisterPlayer(tournamentId, "p2", "p2");
    view = ctx.manager.getTournamentView(tournamentId, "owner");
    assert.equal(view.entrants.length, 1);
    assert.equal(view.actions.canStart, false);
  });

  it("requires sign up before tournament registration", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });

    const guest = createUser("guest", "Guest");
    delete guest.email;

    assert.throws(() => {
      ctx.manager.registerPlayer(tournamentId, guest);
    }, /sign up required to register/);
  });

  it("renames tournaments and propagates the name to table history metadata", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
    ctx.manager.registerPlayer(tournamentId, createUser("p2", "Bob"));

    let view = ctx.manager.renameTournament(
      tournamentId,
      "Renamed Championship",
      "owner",
    );
    assert.equal(view.name, "Renamed Championship");
    assert.equal(ctx.manager.getTournament(tournamentId).name, view.name);

    view = ctx.manager.startTournament(tournamentId, "owner");
    const tournament = ctx.manager.getTournament(tournamentId);
    const table = ctx.games.get(tournament.tables[0].tableId);

    assert.equal(view.name, "Renamed Championship");
    assert.equal(table.tournament.name, "Renamed Championship");
  });

  it("requires the owner to start and enforces the minimum player count", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });

    assert.throws(() => {
      ctx.manager.startTournament(tournamentId, "owner");
    }, /need at least 2 registered players/);

    ctx.manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    assert.throws(() => {
      ctx.manager.startTournament(tournamentId, "p2");
    }, /only the tournament owner can start/);
  });

  it("names a single starting table as the final table", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
    ctx.manager.registerPlayer(tournamentId, createUser("p2", "Bob"));

    const view = ctx.manager.startTournament(tournamentId, "owner");
    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const table = tournament.tables[0];
    const game = ctx.games.get(table.tableId);

    assert.equal(view.tables.length, 1);
    assert.equal(view.tables[0].tableName, FINAL_TABLE_NAME);
    assert.equal(table.tableName, FINAL_TABLE_NAME);
    assert.equal(game.tableName, FINAL_TABLE_NAME);
  });

  it("creates balanced tables and propagates global blind levels", () => {
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

    const view = ctx.manager.startTournament(tournamentId, "owner");
    assert.equal(view.status, "running");
    assert.equal(view.tables.length, 2);

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const firstTable = ctx.games.get(tournament.tables[0].tableId);
    const secondTable = ctx.games.get(tournament.tables[1].tableId);
    assert.ok(firstTable);
    assert.ok(secondTable);
    assert.equal(countActivePlayers(firstTable), 4);
    assert.equal(countActivePlayers(secondTable), 3);

    tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;
    ctx.manager.tickTournament(tournamentId);

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

    tournament.level = Tournament.BREAK_AFTER_LEVEL;
    tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;
    table.hand.phase = "turn";

    ctx.manager.tickTournament(tournamentId);
    assert.equal(tournament.pendingBreak, true);
    assert.equal(tournament.onBreak, false);

    table.hand.phase = "waiting";
    ctx.manager.handleHandFinalized(table);
    assert.equal(tournament.pendingBreak, false);
    assert.equal(tournament.onBreak, true);
  });

  it("starts pending breaks on tick for a single-table tournament", () => {
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

    tournament.level = Tournament.BREAK_AFTER_LEVEL;
    tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;
    table.hand.phase = "turn";

    ctx.manager.tickTournament(tournamentId);

    assert.equal(tournament.pendingBreak, true);
    assert.equal(tournament.onBreak, false);
    assert.equal(tournament.levelTicks, 0);

    table.hand.phase = "waiting";

    ctx.manager.tickTournament(tournamentId);

    assert.equal(tournament.pendingBreak, false);
    assert.equal(tournament.onBreak, true);
    assert.equal(tournament.levelTicks, 0);
    assert.equal(tournament.breakTicks, 0);
  });

  it("starts pending breaks on tick once all tables are between hands", () => {
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
    const firstTable = ctx.games.get(tournament.tables[0].tableId);
    const secondTable = ctx.games.get(tournament.tables[1].tableId);
    assert.ok(firstTable);
    assert.ok(secondTable);

    tournament.level = Tournament.BREAK_AFTER_LEVEL;
    tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;
    firstTable.hand.phase = "turn";
    secondTable.hand.phase = "waiting";

    ctx.manager.tickTournament(tournamentId);

    assert.equal(tournament.pendingBreak, true);
    assert.equal(tournament.onBreak, false);
    assert.equal(tournament.levelTicks, 0);

    firstTable.hand.phase = "waiting";

    ctx.manager.tickTournament(tournamentId);

    assert.equal(tournament.pendingBreak, false);
    assert.equal(tournament.onBreak, true);
    assert.equal(tournament.levelTicks, 0);
    assert.equal(tournament.breakTicks, 0);
  });

  it("restarts waiting-table countdowns when a break ends", () => {
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

    tournament.level = Tournament.BREAK_AFTER_LEVEL;
    tournament.onBreak = true;
    tournament.breakTicks = Tournament.BREAK_DURATION_TICKS - 1;
    table.hand.phase = "waiting";
    table.countdown = null;

    ctx.manager.tickTournament(tournamentId);

    assert.equal(tournament.onBreak, false);
    assert.equal(tournament.level, Tournament.BREAK_AFTER_LEVEL + 1);
    assert.equal(table.countdown, 5);
  });
});
