import { describe, it } from "node:test";
import assert from "assert";
import * as Player from "../../src/backend/poker/player.js";

describe("player", function () {
  describe("create", function () {
    it("creates a player with a unique id", function () {
      const p1 = Player.create();
      const p2 = Player.create();

      assert.ok(p1.id);
      assert.ok(p2.id);
      assert.notEqual(p1.id, p2.id);
    });

    it("creates a player with name set to null", function () {
      const p = Player.create();

      assert.strictEqual(p.name, null);
    });

    it("player object has id and name properties", function () {
      const p = Player.create();

      assert.ok("id" in p);
      assert.ok("name" in p);
      assert.strictEqual(Object.keys(p).length, 2);
    });
  });
});
