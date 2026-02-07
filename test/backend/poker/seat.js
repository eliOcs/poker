import { describe, it } from "node:test";
import assert from "assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as Seat from "../../../src/backend/poker/seat.js";
import * as User from "../../../src/backend/user.js";
import * as Player from "../../../src/backend/poker/player.js";
import { sit } from "../../../src/backend/poker/actions.js";

describe("sit", function () {
  it("player occupies seat inmediately when no hand is ongoing", function () {
    const g = Game.create();
    const p = Player.fromUser(User.create());
    sit(g, { seat: 0, player: p });
    assert.deepEqual(g.seats[0].player, p);
  });

  it("error if seat is already occupied", async function () {
    const g = Game.create();
    const p1 = Player.fromUser(User.create());
    sit(g, { seat: 0, player: p1 });
    const p2 = Player.fromUser(User.create());
    assert.throws(
      () => sit(g, { seat: 0, player: p2 }),
      /seat is already occupied/,
    );
  });

  it("should change seat if player is already seated", function () {
    const g = Game.create();
    const p = Player.fromUser(User.create());
    sit(g, { seat: 0, player: p });
    sit(g, { seat: 1, player: p });
    assert.deepEqual(g.seats[0], Seat.empty());
    assert.deepEqual(g.seats[1].player, p);
  });

  it("player occupies seat before next hand starts");

  it("allows sitting in tournament during level 1", function () {
    const g = Game.createTournament();
    const p = Player.fromUser(User.create());
    sit(g, { seat: 0, player: p });
    assert.deepEqual(g.seats[0].player, p);
  });

  it("rejects sitting in tournament after level 1", function () {
    const g = Game.createTournament();
    g.tournament.level = 2;
    const p = Player.fromUser(User.create());
    assert.throws(() => sit(g, { seat: 0, player: p }), /registration closed/);
  });
});
