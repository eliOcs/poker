import { beforeEach, afterEach, describe, it } from "node:test";
import assert from "node:assert";
import * as Tournament from "../../src/shared/tournament.js";
import * as PokerGame from "../../src/backend/poker/game.js";
import * as HandHistory from "../../src/backend/poker/hand-history/index.js";
import { processPokerAction } from "../../src/backend/websocket-handler.js";
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
    assert.equal(view.prizePool, 500);
    assert.equal(view.maxRebuys, 1);
    assert.equal(view.speed, "normal");
    assert.equal(view.currentPlayer.status, "registered");
    assert.equal(view.actions.canStart, false);

    ctx.manager.registerPlayer(tournamentId, createUser("p2", "Bob"));
    view = ctx.manager.getTournamentView(tournamentId, "owner");
    assert.equal(view.entrants.length, 2);
    assert.equal(view.prizePool, 1000);
    assert.equal(view.actions.canStart, true);

    ctx.manager.unregisterPlayer(tournamentId, "p2", "p2");
    view = ctx.manager.getTournamentView(tournamentId, "owner");
    assert.equal(view.entrants.length, 1);
    assert.equal(view.prizePool, 500);
    assert.equal(view.actions.canStart, false);
  });

  it("rebuilds and broadcasts the full pre-start schedule as entrants change", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner"),
      buyIn: 500,
      tableSize: 6,
    });
    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const onePlayerLevels = tournament.blindLevels;
    assert.equal(tournament.durationMinutes, 140);

    ctx.tournamentBroadcasts = [];
    ctx.manager.registerPlayer(tournamentId, createUser("p2"));
    assert.notStrictEqual(tournament.blindLevels, onePlayerLevels);
    assert.equal(tournament.durationMinutes, 180);
    assert.deepEqual(ctx.tournamentBroadcasts, [tournamentId]);

    ctx.tournamentBroadcasts = [];
    ctx.manager.unregisterPlayer(tournamentId, "p2", "p2");
    assert.equal(tournament.durationMinutes, 140);
    assert.deepEqual(ctx.tournamentBroadcasts, [tournamentId]);
  });

  it("uses the selected speed in the tournament, lobby, and table state", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner"),
      buyIn: 500,
      tableSize: 6,
      speed: "turbo",
    });
    ctx.manager.registerPlayer(tournamentId, createUser("p2"));
    const view = ctx.manager.startTournament(tournamentId, "owner");
    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const game = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(game?.tournament?.kind === "mtt");

    assert.equal(tournament.speed, "turbo");
    assert.equal(tournament.levelDurationTicks, 600);
    assert.equal(tournament.durationMinutes, 90);
    assert.equal(view.speed, "turbo");
    assert.equal(game.tournament.speed, "turbo");
  });

  it("rejects unsupported speeds at the manager boundary", () => {
    assert.throws(
      () =>
        ctx.manager.createTournament({
          owner: createUser("owner"),
          buyIn: 500,
          tableSize: 6,
          speed: "hyper",
        }),
      /invalid tournament speed/,
    );
  });

  it("syncs owner and entrant names in memory", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner At Registration"),
      buyIn: 500,
      tableSize: 6,
    });
    ctx.manager.registerPlayer(
      tournamentId,
      createUser("p2", "Bob At Registration"),
    );

    ctx.manager.syncUser(createUser("owner", "Owner From Sync"));
    ctx.manager.syncUser(createUser("p2", "Bob From Sync"));

    const view = ctx.manager.getTournamentView(tournamentId, "owner");

    assert.deepEqual(view.owner, {
      id: "owner",
      name: "Owner From Sync",
    });
    assert.deepEqual(
      view.entrants.map((entrant) => ({
        playerId: entrant.playerId,
        name: entrant.name,
      })),
      [
        { playerId: "owner", name: "Owner From Sync" },
        { playerId: "p2", name: "Bob From Sync" },
      ],
    );
  });

  it("keeps unset owner and entrant names undefined", () => {
    const owner = createUser("owner");
    const player = createUser("p2");
    owner.name = undefined;
    player.name = undefined;
    const tournamentId = ctx.manager.createTournament({
      owner,
      buyIn: 500,
      tableSize: 6,
    });
    ctx.manager.registerPlayer(tournamentId, player);

    const view = ctx.manager.getTournamentView(tournamentId, owner.id);

    assert.deepEqual(view.owner, { id: owner.id, name: undefined });
    assert.deepEqual(
      view.entrants.map((entrant) => ({
        playerId: entrant.playerId,
        name: entrant.name,
      })),
      [
        { playerId: owner.id, name: undefined },
        { playerId: player.id, name: undefined },
      ],
    );
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
    assert.equal(tournament.speed, "normal");
    assert.equal(tournament.blindLevels.length, 16);
    assert.deepStrictEqual(tournament.blindLevels[0], {
      level: 1,
      small: 2500,
      big: 5000,
      ante: 0,
    });
    assert.equal(
      tournament.levelDurationTicks,
      Tournament.LEVEL_DURATION_TICKS,
    );
    assert.deepStrictEqual(tournament.breakAfterLevels, [4, 8, 12]);
    assert.equal(tournament.durationMinutes, 260);
    assert.equal(view.speed, "normal");
    assert.deepStrictEqual(
      firstTable.tournament?.blindLevels,
      tournament.blindLevels,
    );
    assert.notStrictEqual(
      firstTable.tournament?.blindLevels,
      tournament.blindLevels,
    );
    assert.deepStrictEqual(view.blindLevels, tournament.blindLevels);
    assert.notStrictEqual(view.blindLevels, tournament.blindLevels);

    tournament.levelTicks = tournament.levelDurationTicks - 1;
    ctx.manager.tickTournament(tournamentId);

    const levelTwoBlinds = tournament.blindLevels[1];
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

    tournament.level = Tournament.BREAK_AFTER_LEVELS[0];
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

    tournament.level = Tournament.BREAK_AFTER_LEVELS[0];
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

  it("keeps hand history open for shows until the next hand starts", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Elio"),
      buyIn: 500,
      tableSize: 6,
    });
    ctx.manager.registerPlayer(tournamentId, createUser("p2", "Clei"));
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const table = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(table);
    const elioSeatIndex = table.seats.findIndex(
      (seat) => !seat.empty && seat.player.id === "owner",
    );
    const cleiSeatIndex = table.seats.findIndex(
      (seat) => !seat.empty && seat.player.id === "p2",
    );
    assert.notEqual(elioSeatIndex, -1);
    assert.notEqual(cleiSeatIndex, -1);
    const elioSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        table.seats[elioSeatIndex]
      );
    const cleiSeat =
      /** @type {import("../../src/backend/poker/seat.js").OccupiedSeat} */ (
        table.seats[cleiSeatIndex]
      );
    elioSeat.cards = ["As", "Kh"];
    elioSeat.totalInvested = 50;
    elioSeat.folded = true;
    elioSeat.muckDecision = { remainingTicks: 5 };
    cleiSeat.cards = ["Qd", "Jd"];
    cleiSeat.totalInvested = 50;
    table.handNumber = 18;

    HandHistory.clearRecorder(table.id);
    HandHistory.startHand(table);
    HandHistory.recordDealtCards(table.id, elioSeat.player.id, elioSeat.cards);
    HandHistory.recordDealtCards(table.id, cleiSeat.player.id, cleiSeat.cards);

    const pendingHandHistory = [
      {
        potAmount: 100,
        winners: [cleiSeatIndex],
        winningHand: undefined,
        winningCards: undefined,
        awards: [{ seat: cleiSeatIndex, amount: 100 }],
      },
    ];
    table.hand.phase = "waiting";
    table.pendingHandHistory = pendingHandHistory;
    table.countdown = 4;

    ctx.manager.tickTournament(tournamentId);

    assert.strictEqual(table.pendingHandHistory, pendingHandHistory);
    assert.equal(table.countdown, 4);

    processPokerAction(table, elioSeat.player, "showBothCards", {
      seat: elioSeatIndex,
    });
    processPokerAction(table, cleiSeat.player, "showBothCards", {
      seat: cleiSeatIndex,
    });

    /** @type {import("../../src/backend/poker/hand-history/index.js").OHHHand|undefined} */
    let storedHand;
    delete table.countdown;
    PokerGame.startHandAfterCountdown(table, (message) => {
      if (message.type === "handEnded") {
        storedHand = message.historyHand;
        ctx.manager.handleHandFinalized(table);
      }
      return { recipients: 0, maxPayloadBytes: 0 };
    });

    const showActions = storedHand?.rounds.flatMap((round) =>
      round.actions.filter((action) => action.action === "Shows Cards"),
    );
    assert.deepEqual(showActions, [
      {
        action_number: 3,
        player_id: "owner",
        action: "Shows Cards",
        cards: ["As", "Kh"],
      },
      {
        action_number: 4,
        player_id: "p2",
        action: "Shows Cards",
        cards: ["Qd", "Jd"],
      },
    ]);
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

    tournament.level = Tournament.BREAK_AFTER_LEVELS[0];
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

    tournament.level = Tournament.BREAK_AFTER_LEVELS[0];
    tournament.onBreak = true;
    tournament.breakTicks = Tournament.BREAK_DURATION_TICKS - 1;
    table.hand.phase = "waiting";
    delete table.countdown;

    ctx.manager.tickTournament(tournamentId);

    assert.equal(tournament.onBreak, false);
    assert.equal(tournament.level, Tournament.BREAK_AFTER_LEVELS[0] + 1);
    assert.equal(table.countdown, 5);
  });
});
