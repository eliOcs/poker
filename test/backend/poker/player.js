import { describe, it } from "node:test";
import assert from "assert";
import * as Player from "../../../src/backend/poker/player.js";

describe("player", function () {
  describe("fromUser", function () {
    it("creates a player from a user", function () {
      const user = {
        id: "user-123",
        name: "Alice",
        settings: { volume: 0.5 },
      };

      const player = Player.fromUser(user);

      assert.strictEqual(player.id, "user-123");
      assert.strictEqual(player.name, "Alice");
    });

    it("excludes settings from player", function () {
      const user = {
        id: "user-456",
        name: "Bob",
        settings: { volume: 1 },
      };

      const player = Player.fromUser(user);

      assert.strictEqual(Object.keys(player).length, 2);
      assert.ok("id" in player);
      assert.ok("name" in player);
      assert.ok(!("settings" in player));
    });

    it("handles null name", function () {
      const user = {
        id: "user-789",
        name: null,
        settings: { volume: 0.75 },
      };

      const player = Player.fromUser(user);

      assert.strictEqual(player.name, null);
    });
  });
});
