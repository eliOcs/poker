import { describe, it, before } from "node:test";
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

  // Heads-up: button (seat 0) posts small blind
  it("should force small blind for button in heads-up", function () {
    b.next();
    assert.equal(g.seats[0].bet, 25);
    assert.equal(g.seats[0].stack, 50000 - 25); // Stack reduced
  });

  // Heads-up: player after button posts big blind
  it("should force big blind for player after button in heads-up", function () {
    b.next();
    assert.equal(g.seats[1].bet, 50);
    assert.equal(g.seats[1].stack, 50000 - 50); // Stack reduced
  });
});
