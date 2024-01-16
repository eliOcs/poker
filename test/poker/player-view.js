import { describe, it } from "node:test";
import * as assert from "assert";
import * as Game from "../../src/poker/game.js";
import * as Player from "../../src/poker/player.js";
import * as Actions from "../../src/poker/actions.js";
import playerView from "../../src/poker/player-view.js";

describe("Player View", function () {
  describe("Seat", function () {
    it("add sit action to empty seats", function () {
      const g = Game.create({ seats: 2 });
      const p1 = Player.create();
      const p2 = Player.create();
      Actions.sit(g, { seat: 0, player: p1 });
      const p2View = playerView(g, p2);
      assert.deepEqual(p2View.seats[0].actions, []);
      assert.deepEqual(p2View.seats[1].actions, [{ action: "sit", seat: 1 }]);
    });
  });
});
