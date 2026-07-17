import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import {
  expireRebuyDecisions,
  finalizeRebuyDecision,
  hasUnresolvedRebuyDecisions,
  openRebuyDecision,
  resolveRebuyDecision,
} from "../../src/backend/mtt-rebuys.js";
import { calculatePrizePool } from "../../src/backend/mtt-rebuy-policy.js";
import { createMttContext, createUser } from "./mtt-test-context.js";

describe("mtt rebuy decisions", () => {
  const ctx = createMttContext();
  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  /**
   * @param {number} maxRebuys
   * @param {number} [playerCount]
   */
  function createStartedTournament(maxRebuys, playerCount = 5) {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser(`owner-${maxRebuys}-${ctx.tickCount}`),
      buyIn: 500,
      tableSize: 6,
      maxRebuys,
    });
    for (let index = 1; index < playerCount; index += 1) {
      const id = `p${index}-${maxRebuys}-${ctx.tickCount}`;
      ctx.manager.registerPlayer(tournamentId, createUser(id));
    }

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    ctx.manager.startTournament(tournamentId, tournament.ownerId);
    const game = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(game);
    return { tournament, game };
  }

  /**
   * @param {import('../../src/backend/poker/game.js').Game} game
   * @param {number[]} seatIndexes
   */
  function bustSeats(game, seatIndexes) {
    return seatIndexes.map((seatIndex) => {
      const seat = game.seats[seatIndex];
      assert.ok(!seat.empty);
      seat.stack = 0;
      seat.sittingOut = true;
      return seat.player.id;
    });
  }

  it("pre-resolves busts when rebuys are disabled, used up, or closed", () => {
    const cases = [
      { maxRebuys: 0, prepare() {} },
      {
        maxRebuys: 1,
        prepare(tournament, playerId) {
          const entrant = tournament.entrants.get(playerId);
          assert.ok(entrant);
          entrant.rebuysUsed = 1;
        },
      },
      {
        maxRebuys: 1,
        prepare(tournament) {
          tournament.entryPeriodOpen = false;
        },
      },
    ];

    for (const testCase of cases) {
      const { tournament, game } = createStartedTournament(testCase.maxRebuys);
      const [playerId] = bustSeats(game, [1]);
      testCase.prepare(tournament, playerId);

      const decision = openRebuyDecision(tournament, game);

      assert.deepEqual(decision?.entries, [
        { playerId, seatIndex: 1, resolution: "leave" },
      ]);
      assert.equal(hasUnresolvedRebuyDecisions(decision), false);
      assert.equal(
        resolveRebuyDecision(tournament, game, playerId, "rebuy"),
        false,
      );
    }
  });

  it("uses the same transitions for limits one and two", () => {
    for (const maxRebuys of [1, 2]) {
      const { tournament, game } = createStartedTournament(maxRebuys);
      const seat = game.seats[1];
      assert.ok(!seat.empty);
      const playerId = seat.player.id;
      const entrant = tournament.entrants.get(playerId);
      assert.ok(entrant);

      for (let use = 1; use <= maxRebuys; use += 1) {
        bustSeats(game, [1]);
        const decision = openRebuyDecision(tournament, game);
        assert.equal(hasUnresolvedRebuyDecisions(decision), true);
        assert.equal(
          resolveRebuyDecision(tournament, game, playerId, "rebuy"),
          true,
        );
        assert.equal(
          finalizeRebuyDecision(tournament, game, () => "now"),
          true,
        );
        assert.equal(entrant.rebuysUsed, use);
        assert.equal(entrant.stack, tournament.initialStack);
        assert.equal(seat.stack, tournament.initialStack);
        assert.equal(seat.sittingOut, false);
      }

      bustSeats(game, [1]);
      const exhaustedDecision = openRebuyDecision(tournament, game);
      assert.equal(hasUnresolvedRebuyDecisions(exhaustedDecision), false);
      assert.equal(exhaustedDecision?.entries[0].resolution, "leave");
    }
  });

  it("opens multiple decisions concurrently and waits for the whole batch", () => {
    const { tournament, game } = createStartedTournament(1);
    const [firstPlayerId, secondPlayerId] = bustSeats(game, [1, 3]);

    const decision = openRebuyDecision(tournament, game);
    assert.equal(openRebuyDecision(tournament, game), decision);

    assert.deepEqual(decision?.entries, [
      { playerId: firstPlayerId, seatIndex: 1 },
      { playerId: secondPlayerId, seatIndex: 3 },
    ]);
    tournament.onBreak = true;
    assert.equal(
      resolveRebuyDecision(tournament, game, firstPlayerId, "leave"),
      true,
    );
    assert.equal(
      finalizeRebuyDecision(tournament, game, () => "now"),
      false,
    );
    assert.equal(game.seats[1].empty, false);
    assert.equal(game.seats[3].empty, false);

    assert.equal(
      resolveRebuyDecision(tournament, game, secondPlayerId, "rebuy"),
      true,
    );
    assert.equal(
      finalizeRebuyDecision(tournament, game, () => "now"),
      true,
    );
    assert.equal(game.seats[1].empty, true);
    assert.equal(game.seats[3].empty, false);
  });

  it("preserves seat ordering while excluding rebuyers from positions", () => {
    const { tournament, game } = createStartedTournament(1);
    const [rebuyerId, ineligibleId, leaverId] = bustSeats(game, [1, 2, 4]);
    const ineligibleEntrant = tournament.entrants.get(ineligibleId);
    assert.ok(ineligibleEntrant);
    ineligibleEntrant.rebuysUsed = 1;

    const decision = openRebuyDecision(tournament, game);
    assert.deepEqual(decision?.entries, [
      { playerId: rebuyerId, seatIndex: 1 },
      { playerId: ineligibleId, seatIndex: 2, resolution: "leave" },
      { playerId: leaverId, seatIndex: 4 },
    ]);
    assert.equal(
      resolveRebuyDecision(tournament, game, rebuyerId, "rebuy"),
      true,
    );
    assert.equal(
      resolveRebuyDecision(tournament, game, leaverId, "leave"),
      true,
    );
    assert.equal(
      finalizeRebuyDecision(tournament, game, () => "now"),
      true,
    );

    assert.equal(tournament.entrants.get(rebuyerId)?.finishPosition, undefined);
    assert.equal(tournament.entrants.get(ineligibleId)?.finishPosition, 5);
    assert.equal(tournament.entrants.get(leaverId)?.finishPosition, 4);
    assert.equal(game.seats[1].empty, false);
    assert.equal(game.seats[2].empty, true);
    assert.equal(game.seats[4].empty, true);
  });

  it("applies duplicate, expired, and stale resolutions exactly once", () => {
    const { tournament, game } = createStartedTournament(1);
    const [rebuyerId, expiredId] = bustSeats(game, [1, 2]);
    const initialPool = calculatePrizePool(tournament);
    const decision = openRebuyDecision(tournament, game);

    assert.equal(
      resolveRebuyDecision(tournament, game, "another-player", "rebuy"),
      false,
    );
    assert.equal(
      resolveRebuyDecision(tournament, game, rebuyerId, "rebuy"),
      true,
    );
    assert.equal(
      resolveRebuyDecision(tournament, game, rebuyerId, "leave"),
      false,
    );
    assert.equal(expireRebuyDecisions(decision), 1);
    assert.equal(expireRebuyDecisions(decision), 0);
    assert.equal(
      resolveRebuyDecision(tournament, game, expiredId, "rebuy"),
      false,
    );
    assert.equal(
      finalizeRebuyDecision(tournament, game, () => "now"),
      true,
    );
    assert.equal(
      resolveRebuyDecision(tournament, game, rebuyerId, "rebuy"),
      false,
    );

    assert.equal(tournament.entrants.get(rebuyerId)?.rebuysUsed, 1);
    assert.equal(tournament.entrants.get(expiredId)?.rebuysUsed, 0);
    assert.equal(
      calculatePrizePool(tournament),
      initialPool + tournament.buyIn,
    );
  });
});
