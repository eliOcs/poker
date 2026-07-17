import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import * as Tournament from "../../src/shared/tournament.js";
import {
  DEFAULT_ENTRY_PERIOD_LEVELS,
  isEntryPeriodOpen,
} from "../../src/backend/mtt-entry-policy.js";
import { createMttContext, createUser } from "./mtt-test-context.js";

describe("mtt entry policy", () => {
  const ctx = createMttContext();
  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  /**
   * @param {number|undefined} entryPeriodLevels
   */
  function createStartedTournament(entryPeriodLevels = undefined) {
    const owner = createUser(`owner-${ctx.tickCount}`);
    const tournamentId = ctx.manager.createTournament({
      owner,
      buyIn: 500,
      tableSize: 6,
      ...(entryPeriodLevels === undefined ? {} : { entryPeriodLevels }),
    });
    ctx.manager.registerPlayer(tournamentId, createUser(`p2-${ctx.tickCount}`));
    ctx.manager.startTournament(tournamentId, owner.id);
    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    return { tournamentId, tournament };
  }

  it("defaults configuration and exposes permanent state in every view", () => {
    const owner = createUser("owner");
    const tournamentId = ctx.manager.createTournament({
      owner,
      buyIn: 500,
      tableSize: 6,
    });
    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);

    assert.equal(tournament.entryPeriodLevels, DEFAULT_ENTRY_PERIOD_LEVELS);
    assert.equal(tournament.entryPeriodOpen, false);
    assert.equal(isEntryPeriodOpen(tournament), false);
    assert.equal(
      ctx.manager.getTournamentView(tournamentId, owner.id).entryPeriodLevels,
      DEFAULT_ENTRY_PERIOD_LEVELS,
    );
    assert.equal(
      ctx.manager.getTournamentView(tournamentId, owner.id).entryPeriodOpen,
      false,
    );

    ctx.manager.registerPlayer(tournamentId, createUser("p2"));
    const runningView = ctx.manager.startTournament(tournamentId, owner.id);
    assert.equal(runningView.entryPeriodLevels, DEFAULT_ENTRY_PERIOD_LEVELS);
    assert.equal(runningView.entryPeriodOpen, true);
    assert.equal(isEntryPeriodOpen(tournament), true);
  });

  it("accepts every entry-period boundary and rejects invalid values", () => {
    for (const entryPeriodLevels of [0, 1, Tournament.getMaxLevel()]) {
      const tournamentId = ctx.manager.createTournament({
        owner: createUser(`owner-${entryPeriodLevels}`),
        buyIn: 500,
        tableSize: 6,
        entryPeriodLevels,
      });
      assert.equal(
        ctx.manager.getTournament(tournamentId)?.entryPeriodLevels,
        entryPeriodLevels,
      );
    }

    for (const entryPeriodLevels of [
      -1,
      1.5,
      "4",
      null,
      Number.NaN,
      Tournament.getMaxLevel() + 1,
    ]) {
      assert.throws(
        () =>
          ctx.manager.createTournament({
            owner: createUser(`invalid-${String(entryPeriodLevels)}`),
            buyIn: 500,
            tableSize: 6,
            entryPeriodLevels,
          }),
        /invalid entry period levels/,
      );
    }
  });

  it("keeps a zero-level entry period closed when play starts", () => {
    const { tournament } = createStartedTournament(0);

    assert.equal(tournament.entryPeriodOpen, false);
    assert.equal(isEntryPeriodOpen(tournament), false);
  });

  it("closes at level four whether the break starts or remains pending", () => {
    for (const handPhase of ["waiting", "turn"]) {
      const { tournamentId, tournament } = createStartedTournament(4);
      const table = ctx.games.get(tournament.tables[0].tableId);
      assert.ok(table);
      tournament.level = 4;
      tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;
      table.hand.phase = handPhase;

      ctx.manager.tickTournament(tournamentId);

      assert.equal(tournament.entryPeriodOpen, false);
      assert.equal(tournament.onBreak, handPhase === "waiting");
      assert.equal(tournament.pendingBreak, handPhase === "turn");
    }
  });

  it("stays open through the level-four break and closes after level five", () => {
    const { tournamentId, tournament } = createStartedTournament(5);
    tournament.level = 4;
    tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;

    ctx.manager.tickTournament(tournamentId);
    assert.equal(tournament.onBreak, true);
    assert.equal(tournament.entryPeriodOpen, true);

    tournament.breakTicks = Tournament.BREAK_DURATION_TICKS - 1;
    ctx.manager.tickTournament(tournamentId);
    assert.equal(tournament.level, 5);
    assert.equal(tournament.entryPeriodOpen, true);

    tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;
    ctx.manager.tickTournament(tournamentId);
    assert.equal(tournament.level, 6);
    assert.equal(tournament.entryPeriodOpen, false);
  });

  it("observes completion of the maximum level and never reopens", () => {
    const maximumLevel = Tournament.getMaxLevel();
    const { tournamentId, tournament } = createStartedTournament(maximumLevel);
    tournament.level = maximumLevel;
    tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;

    ctx.manager.tickTournament(tournamentId);

    assert.equal(tournament.level, maximumLevel);
    assert.equal(tournament.entryPeriodOpen, false);

    tournament.level = 1;
    tournament.levelTicks = 0;
    ctx.manager.tickTournament(tournamentId);
    assert.equal(tournament.entryPeriodOpen, false);
  });
});
