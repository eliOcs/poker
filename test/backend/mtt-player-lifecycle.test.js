import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import { createMttContext, createUser } from "./mtt-test-context.js";

describe("mtt player lifecycle", () => {
  const ctx = createMttContext();
  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  it("orders simultaneous eliminations by seat and cleans up their seats", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
      maxRebuys: 0,
    });
    for (const id of ["p2", "p3", "p4", "p5"]) {
      ctx.manager.registerPlayer(
        tournamentId,
        createUser(id, id.toUpperCase()),
      );
    }
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const table = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(table);

    const lowerSeatIndex = 1;
    const higherSeatIndex = 3;
    const lowerSeat =
      /** @type {import('../../src/backend/poker/seat.js').OccupiedSeat} */ (
        table.seats[lowerSeatIndex]
      );
    const higherSeat =
      /** @type {import('../../src/backend/poker/seat.js').OccupiedSeat} */ (
        table.seats[higherSeatIndex]
      );
    lowerSeat.stack = 0;
    lowerSeat.sittingOut = true;
    higherSeat.stack = 0;
    higherSeat.sittingOut = true;

    ctx.manager.handleHandFinalized(table);

    const lowerEntrant = tournament.entrants.get(lowerSeat.player.id);
    const higherEntrant = tournament.entrants.get(higherSeat.player.id);
    assert.deepEqual(
      [lowerEntrant?.finishPosition, higherEntrant?.finishPosition],
      [5, 4],
    );
    for (const entrant of [lowerEntrant, higherEntrant]) {
      assert.equal(entrant?.status, "eliminated");
      assert.equal(entrant?.stack, 0);
      assert.equal(entrant?.tableId, undefined);
      assert.equal(entrant?.seatIndex, undefined);
      assert.ok(entrant?.eliminatedAt);
    }
    assert.equal(table.seats[lowerSeatIndex].empty, true);
    assert.equal(table.seats[higherSeatIndex].empty, true);
  });

  it("keeps a chip-positive sitting-out player active and synchronized", () => {
    const tournamentId = ctx.manager.createTournament({
      owner: createUser("owner", "Owner"),
      buyIn: 500,
      tableSize: 6,
    });
    for (const id of ["p2", "p3", "p4"]) {
      ctx.manager.registerPlayer(
        tournamentId,
        createUser(id, id.toUpperCase()),
      );
    }
    ctx.manager.startTournament(tournamentId, "owner");

    const tournament = ctx.manager.getTournament(tournamentId);
    assert.ok(tournament);
    const table = ctx.games.get(tournament.tables[0].tableId);
    assert.ok(table);
    const sittingOutSeat =
      /** @type {import('../../src/backend/poker/seat.js').OccupiedSeat} */ (
        table.seats[1]
      );
    sittingOutSeat.sittingOut = true;
    sittingOutSeat.stack = 7_500;
    sittingOutSeat.handsPlayed = 12;

    ctx.manager.handleHandFinalized(table);

    const entrant = tournament.entrants.get(sittingOutSeat.player.id);
    assert.equal(entrant?.status, "seated");
    assert.equal(entrant?.stack, 7_500);
    assert.equal(entrant?.handsPlayed, 12);
    assert.equal(entrant?.tableId, table.id);
    assert.equal(entrant?.seatIndex, 1);
    assert.equal(entrant?.finishPosition, undefined);
    assert.equal(table.seats[1], sittingOutSeat);
  });
});
