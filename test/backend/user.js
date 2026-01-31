import { describe, it } from "node:test";
import assert from "assert";
import * as User from "../../src/backend/user.js";

describe("user", function () {
  describe("create", function () {
    it("creates a user with a unique id", function () {
      const u1 = User.create();
      const u2 = User.create();

      assert.ok(u1.id);
      assert.ok(u2.id);
      assert.notEqual(u1.id, u2.id);
    });

    it("creates a user with name set to null", function () {
      const u = User.create();

      assert.strictEqual(u.name, null);
    });

    it("user object has id, name, and settings properties", function () {
      const u = User.create();

      assert.ok("id" in u);
      assert.ok("name" in u);
      assert.ok("settings" in u);
      assert.strictEqual(Object.keys(u).length, 3);
    });

    it("creates a user with default settings", function () {
      const u = User.create();

      assert.deepStrictEqual(u.settings, User.DEFAULT_SETTINGS);
      assert.strictEqual(u.settings.volume, 0.75);
    });
  });
});
