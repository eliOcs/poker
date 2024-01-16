import { describe, it } from "node:test";
import assert from "assert";
import * as Game from "../../src/poker/game.js";
import * as Seat from "../../src/poker/seat.js";
import * as Player from "../../src/poker/player.js";
import { sit } from "../../src/poker/actions.js";

describe("sit", function () {
  it("player occupies seat inmediately when no hand is ongoing", function () {
    const g = Game.create();
    const p = Player.create();
    sit(g, { seat: 0, player: p });
    assert.deepEqual(g.seats[0].player, p);
  });

  it("error if seat is already occupied", async function () {
    const g = Game.create();
    const p1 = Player.create();
    sit(g, { seat: 0, player: p1 });
    const p2 = Player.create();
    assert.throws(
      () => sit(g, { seat: 0, player: p2 }),
      /seat is already occupied/
    );
  });

  it("should change seat if player is already seated", function () {
    const g = Game.create();
    const p = Player.create();
    sit(g, { seat: 0, player: p });
    sit(g, { seat: 1, player: p });
    assert.deepEqual(g.seats[0], Seat.empty());
    assert.deepEqual(g.seats[1].player, p);
  });

  it("player occupies seat before next hand starts");
});
