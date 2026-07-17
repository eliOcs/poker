import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import * as ActionClock from "../../src/backend/poker/action-clock.js";
import playerView from "../../src/backend/poker/player-view.js";
import * as Tournament from "../../src/shared/tournament.js";
import { createMttContext, createUser } from "./mtt-test-context.js";

describe("mtt rebuy clocks", () => {
  const ctx = createMttContext();
  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  /**
   * @param {{ playerCount?: number, tableSize?: number }} [options]
   */
  function createStartedTournament({ playerCount = 4, tableSize = 6 } = {}) {
    const owner = createUser("owner", "Owner");
    const tournamentId = ctx.manager.createTournament({
      owner,
      buyIn: 500,
      tableSize,
      maxRebuys: 1,
    });
    for (let index = 2; index <= playerCount; index += 1) {
      ctx.manager.registerPlayer(
        tournamentId,
        createUser(`p${index}`, `Player ${index}`),
      );
    }
    ctx.manager.startTournament(tournamentId, owner.id);

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    return { tournamentId, tournament };
  }

  /**
   * @param {import('../../src/backend/poker/game.js').Game} game
   * @param {number} seatIndex
   */
  function bustSeat(game, seatIndex) {
    const seat = game.seats[seatIndex];
    assert.ok(!seat.empty);
    seat.stack = 0;
    seat.sittingOut = true;
    return seat;
  }

  /**
   * @param {string} tournamentId
   * @param {number} ticks
   */
  function tickTournament(tournamentId, ticks) {
    for (let tick = 0; tick < ticks; tick += 1) {
      ctx.manager.tickTournament(tournamentId);
    }
  }

  it("shares the betting clock timing across every unresolved decision", () => {
    const { tournamentId, tournament } = createStartedTournament();
    const game = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(game);
    const caller = game.seats[0];
    const rebuyer = bustSeat(game, 1);
    const expiringPlayer = bustSeat(game, 2);
    assert.ok(!caller.empty);

    ctx.manager.handleHandFinalized(game);
    const decision = game.pendingRebuyDecision;
    assert.ok(decision);
    assert.deepEqual(decision.clock, ActionClock.create());

    assert.throws(
      () => ctx.manager.handleTableAction(caller.player, game, "callClock"),
      /must wait 60 seconds/,
    );
    tickTournament(tournamentId, ActionClock.CLOCK_WAIT_TICKS - 1);
    assert.equal(
      playerView(game, caller.player).seats[0].actions.some(
        (action) => action.action === "callClock",
      ),
      false,
    );

    tickTournament(tournamentId, 1);
    assert.equal(decision.clock.waitTicks, ActionClock.CLOCK_WAIT_TICKS);
    assert.equal(
      playerView(game, caller.player).seats[0].actions.some(
        (action) => action.action === "callClock",
      ),
      true,
    );
    assert.equal(
      playerView(game, rebuyer.player).seats[1].actions.some(
        (action) => action.action === "callClock",
      ),
      false,
    );

    ctx.manager.handleTableAction(caller.player, game, "callClock");
    assert.equal(decision.clock.countdownTicks, 1);
    assert.equal(playerView(game, caller.player).hand.clockRemaining, 59);
    assert.throws(
      () => ctx.manager.handleTableAction(caller.player, game, "callClock"),
      /clock already called/,
    );

    ctx.manager.handleTableAction(rebuyer.player, game, "rebuy");
    expiringPlayer.disconnected = true;
    tickTournament(tournamentId, ActionClock.CLOCK_DURATION_TICKS - 2);
    assert.equal(decision.clock.countdownTicks, 59);
    assert.equal(playerView(game, caller.player).hand.clockRemaining, 1);

    expiringPlayer.disconnected = false;
    assert.equal(
      playerView(game, expiringPlayer.player).hand.clockRemaining,
      1,
    );
    tickTournament(tournamentId, 1);

    assert.equal(game.pendingRebuyDecision, undefined);
    assert.equal(game.seats[1], rebuyer);
    assert.equal(rebuyer.stack, tournament.initialStack);
    assert.equal(game.seats[2].empty, true);
    assert.equal(tournament.entrants.get(rebuyer.player.id)?.rebuysUsed, 1);
    assert.equal(
      tournament.entrants.get(expiringPlayer.player.id)?.rebuysUsed,
      0,
    );
  });

  it("starts an inactive clock at cutoff and advances the break concurrently", () => {
    const { tournamentId, tournament } = createStartedTournament();
    const game = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(game);
    const bustedSeat = bustSeat(game, 1);

    ctx.manager.handleHandFinalized(game);
    const decision = game.pendingRebuyDecision;
    assert.ok(decision);
    tournament.level = Tournament.BREAK_AFTER_LEVEL;
    tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;

    ctx.manager.tickTournament(tournamentId);

    assert.equal(tournament.onBreak, true);
    assert.equal(tournament.breakTicks, 0);
    assert.equal(decision.clock.countdownTicks, 1);
    assert.equal(playerView(game, bustedSeat.player).hand.clockRemaining, 59);

    ctx.manager.tickTournament(tournamentId);

    assert.equal(tournament.breakTicks, 1);
    assert.equal(decision.clock.countdownTicks, 2);
    assert.equal(
      ctx.manager.handleTableAction(bustedSeat.player, game, "rebuy"),
      true,
    );
    assert.equal(bustedSeat.stack, tournament.initialStack);
  });

  it("does not restart an active clock when the rebuy period closes", () => {
    const { tournamentId, tournament } = createStartedTournament();
    const game = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(game);
    const caller = game.seats[0];
    bustSeat(game, 1);
    assert.ok(!caller.empty);

    ctx.manager.handleHandFinalized(game);
    tickTournament(tournamentId, ActionClock.CLOCK_WAIT_TICKS);
    ctx.manager.handleTableAction(caller.player, game, "callClock");
    const decision = game.pendingRebuyDecision;
    assert.ok(decision);

    tournament.level = Tournament.BREAK_AFTER_LEVEL;
    tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;
    ctx.manager.tickTournament(tournamentId);

    assert.equal(tournament.onBreak, true);
    assert.equal(decision.clock.countdownTicks, 2);
  });

  it("forces earlier decisions but offers no decision for the cutoff hand", () => {
    const { tournamentId, tournament } = createStartedTournament({
      playerCount: 7,
      tableSize: 6,
    });
    const earlierGame = ctx.games.get(tournament.tables[0].tableId);
    const cutoffGame = ctx.games.get(tournament.tables[1].tableId);
    assert.ok(earlierGame);
    assert.ok(cutoffGame);
    const earlierBust = bustSeat(earlierGame, 1);
    const cutoffBust = bustSeat(cutoffGame, 1);

    cutoffGame.hand.phase = "turn";
    ctx.manager.handleHandFinalized(earlierGame);

    const earlierDecision = earlierGame.pendingRebuyDecision;
    assert.ok(earlierDecision);
    assert.equal(earlierDecision.clock.countdownTicks, 0);

    tournament.level = Tournament.BREAK_AFTER_LEVEL;
    tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;
    ctx.manager.tickTournament(tournamentId);
    assert.equal(tournament.pendingBreak, true);
    assert.equal(tournament.entryPeriodOpen, false);
    assert.equal(earlierDecision.clock.countdownTicks, 1);

    cutoffGame.hand.phase = "waiting";
    ctx.manager.handleHandFinalized(cutoffGame);

    assert.equal(tournament.onBreak, true);
    assert.equal(earlierDecision.clock.countdownTicks, 1);
    assert.equal(cutoffGame.pendingRebuyDecision, undefined);
    assert.equal(cutoffGame.seats[1].empty, true);
    assert.equal(
      tournament.entrants.get(cutoffBust.player.id)?.status,
      "eliminated",
    );
    assert.equal(
      tournament.entrants.get(earlierBust.player.id)?.status,
      "seated",
    );
  });

  it("expires decisions on a zero-chip table and then declares the winner", () => {
    const { tournamentId, tournament } = createStartedTournament({
      playerCount: 3,
      tableSize: 2,
    });
    const bustedGame = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(bustedGame);
    bustSeat(bustedGame, 0);
    bustSeat(bustedGame, 1);
    ctx.manager.handleHandFinalized(bustedGame);
    assert.ok(bustedGame.pendingRebuyDecision);

    tournament.level = Tournament.BREAK_AFTER_LEVEL;
    tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;
    ctx.manager.tickTournament(tournamentId);
    assert.equal(bustedGame.pendingRebuyDecision?.clock.countdownTicks, 1);

    tickTournament(tournamentId, ActionClock.CLOCK_DURATION_TICKS - 1);

    assert.equal(bustedGame.pendingRebuyDecision, undefined);
    assert.equal(tournament.status, "finished");
    assert.equal(
      [...tournament.entrants.values()].find(
        (entrant) => entrant.status === "winner",
      )?.finishPosition,
      1,
    );
  });

  it("fails visibly when an open managed table has no game state", () => {
    const { tournamentId, tournament } = createStartedTournament();
    ctx.games.delete(tournament.tables[0].tableId);

    assert.throws(() => ctx.manager.tickTournament(tournamentId), {
      message: "managed tournament table not found",
    });
  });
});
