import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import { BREAK_AFTER_LEVEL } from "../../src/shared/tournament.js";
import {
  calculatePrizePool,
  getRemainingRebuys,
  getTotalAcceptedRebuys,
  isRebuyEligibleByCount,
  isRebuyPeriodOpen,
} from "../../src/backend/mtt-rebuy-policy.js";
import { createMttContext, createUser } from "./mtt-test-context.js";

describe("mtt rebuy policy", () => {
  const ctx = createMttContext();
  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  it("defaults to one rebuy and initializes every entrant's usage", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner"),
      buyIn: 500,
      tableSize: 6,
    });
    ctx.manager.registerPlayer(tournamentId, createUser("p2"));

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    assert.equal(tournament.maxRebuys, 1);
    assert.deepEqual(
      [...tournament.entrants.values()].map((entrant) => entrant.rebuysUsed),
      [0, 0],
    );
    assert.equal(getTotalAcceptedRebuys(tournament), 0);
    assert.equal(calculatePrizePool(tournament), 1_000);
  });

  it("uses the same count policy for zero, one, and multiple rebuys", () => {
    for (const maxRebuys of [0, 1, 2]) {
      const owner = createUser(`owner-${maxRebuys}`);
      const tournamentId = ctx.manager.createTournament({
        owner,
        buyIn: 500,
        tableSize: 6,
        maxRebuys,
      });
      const tournament = ctx.manager.getTournament(tournamentId);
      assert.ok(tournament);
      const entrant = tournament.entrants.get(owner.id);
      assert.ok(entrant);

      for (let rebuysUsed = 0; rebuysUsed <= maxRebuys; rebuysUsed += 1) {
        entrant.rebuysUsed = rebuysUsed;
        assert.equal(
          getRemainingRebuys(tournament, entrant),
          maxRebuys - rebuysUsed,
        );
        assert.equal(
          isRebuyEligibleByCount(tournament, entrant),
          rebuysUsed < maxRebuys,
        );
      }
    }
  });

  it("rejects invalid rebuy limits at internal tournament creation", () => {
    for (const maxRebuys of [-1, 1.5, "1", null, Number.NaN]) {
      assert.throws(
        () =>
          ctx.manager.createTournament({
            owner: createUser("owner"),
            buyIn: 500,
            tableSize: 6,
            maxRebuys,
          }),
        /invalid maximum rebuys/,
      );
    }
  });

  it("derives accepted rebuys and the enlarged pool from entrant usage", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner"),
      buyIn: 500,
      tableSize: 6,
      maxRebuys: 2,
    });
    ctx.manager.registerPlayer(tournamentId, createUser("p2"));
    ctx.manager.registerPlayer(tournamentId, createUser("p3"));

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const p2 = tournament.entrants.get("p2");
    const p3 = tournament.entrants.get("p3");
    assert.ok(p2);
    assert.ok(p3);
    p2.rebuysUsed = 1;
    p3.rebuysUsed = 2;

    assert.equal(getTotalAcceptedRebuys(tournament), 3);
    assert.equal(calculatePrizePool(tournament), 3_000);
  });

  it("uses accepted rebuys in live payouts and entrant net winnings", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner"),
      buyIn: 500,
      tableSize: 6,
      maxRebuys: 2,
    });
    ctx.manager.registerPlayer(tournamentId, createUser("p2"));
    ctx.manager.registerPlayer(tournamentId, createUser("p3"));
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const owner = tournament.entrants.get("owner");
    const p2 = tournament.entrants.get("p2");
    assert.ok(owner);
    assert.ok(p2);
    owner.rebuysUsed = 1;
    p2.rebuysUsed = 2;

    const view = ctx.manager.getTournamentView(tournamentId, "owner");
    const standings = new Map(
      view.standings.map((entrant) => [entrant.playerId, entrant]),
    );

    assert.equal(view.prizePool, 3_000);
    assert.equal(standings.get("owner")?.netWinnings, 2_000);
    assert.equal(standings.get("p2")?.netWinnings, -1_500);
    assert.equal(standings.get("p3")?.netWinnings, -500);
  });

  it("keeps the rebuy cutoff fixed to the first break", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner"),
      buyIn: 500,
      tableSize: 6,
      maxRebuys: 1,
    });
    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);

    assert.equal(isRebuyPeriodOpen(tournament), true);

    tournament.level = BREAK_AFTER_LEVEL;
    tournament.pendingBreak = true;
    assert.equal(isRebuyPeriodOpen(tournament), true);

    tournament.pendingBreak = false;
    tournament.onBreak = true;
    assert.equal(isRebuyPeriodOpen(tournament), false);

    tournament.onBreak = false;
    tournament.level = BREAK_AFTER_LEVEL + 1;
    assert.equal(isRebuyPeriodOpen(tournament), false);
  });

  it("preserves entrant usage through seating and table movement", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner"),
      buyIn: 500,
      tableSize: 2,
      maxRebuys: 1,
    });
    ctx.manager.registerPlayer(tournamentId, createUser("p2"));
    ctx.manager.registerPlayer(tournamentId, createUser("p3"));

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const owner = tournament.entrants.get("owner");
    assert.ok(owner);
    owner.rebuysUsed = 1;

    ctx.manager.startTournament(tournamentId, "owner");
    assert.equal(owner.rebuysUsed, 1);
    const sourceTableId = owner.tableId;
    assert.ok(sourceTableId);
    const sourceTable = ctx.games.get(sourceTableId);
    assert.ok(sourceTable);
    const bustedSeat = sourceTable.seats.find(
      (seat) => !seat.empty && seat.player.id !== owner.playerId,
    );
    assert.ok(bustedSeat && !bustedSeat.empty);
    bustedSeat.stack = 0;
    bustedSeat.sittingOut = true;

    ctx.manager.handleHandFinalized(sourceTable);
    ctx.manager.handleTableAction(bustedSeat.player, sourceTable, "leave");

    assert.equal(owner.rebuysUsed, 1);
    assert.notEqual(owner.tableId, sourceTableId);
  });
});
