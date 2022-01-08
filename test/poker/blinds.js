import assert from "assert";
import * as Game from "../../src/poker/game.js";
import * as Player from "../../src/poker/player.js";
import { sit, buyIn, blinds } from "../../src/poker/actions.js";

describe("blinds", function () {
  let g;
  let b;
  before(function () {
    g = Game.create({ blinds: { small: 25, big: 50 } });
    sit(g, { seat: 0, player: Player.create() });
    buyIn(g, { seat: 0, amount: 1000 });
    sit(g, { seat: 1, player: Player.create() });
    buyIn(g, { seat: 1, amount: 1000 });
    b = blinds(g);
  });

  it("should force small blind for player left to the button", function () {
    b.next();
    assert.equal(g.seats[1].bet, 25);
  });

  it("should force big blind for player left to small blind", function () {
    b.next();
    assert.equal(g.seats[0].bet, 50);
  });
});
