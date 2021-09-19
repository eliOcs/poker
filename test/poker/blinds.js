import assert from "assert";
import * as game from "../../src/poker/game.js";
import * as player from "../../src/poker/player.js";
import { seat, buyIn, blinds } from "../../src/poker/actions.js";

describe("blinds", function () {
  let g;
  let b;
  before(function () {
    g = game.create({ blinds: { small: 25, big: 50 } });
    seat(g, { seat: 0, player: player.create() });
    buyIn(g, { seat: 0, amount: 1000 });
    seat(g, { seat: 1, player: player.create() });
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
