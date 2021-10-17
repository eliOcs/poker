import assert from "assert";
import * as game from "../../src/poker/game.js";
import * as player from "../../src/poker/player.js";
import { seat } from "../../src/poker/actions.js";

describe("seat", function () {
  it("player occupies seat inmediately when no hand is ongoing", function () {
    const g = game.create();
    const p = player.create();
    seat(g, { seat: 0, player: p });
    assert.deepEqual(g.seats[0].player, p);
  });

  it("error if seat is already occupied", async function () {
    const g = game.create();
    const p1 = player.create();
    seat(g, { seat: 0, player: p1 });
    const p2 = player.create();
    assert.throws(
      () => seat(g, { seat: 0, player: p2 }),
      /seat is already occupied/
    );
  });

  it("should change seat if player is already seated", function () {
    const g = game.create();
    const p = player.create();
    seat(g, { seat: 0, player: p });
    seat(g, { seat: 1, player: p });
    assert.equal(g.seats[0], "empty");
    assert.deepEqual(g.seats[1].player, p);
  });

  it("player occupies seat before next hand starts");
});
