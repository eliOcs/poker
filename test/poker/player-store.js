import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "assert";
import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import crypto from "crypto";
import * as PlayerStore from "../../src/backend/player-store.js";

// Use unique directory per test to avoid parallel test conflicts
let testDataDir;

describe("player-store", function () {
  beforeEach(function () {
    testDataDir = `test-data-${crypto.randomBytes(4).toString("hex")}`;
    process.env.DATA_DIR = testDataDir;
    PlayerStore._reset();
  });

  afterEach(async function () {
    PlayerStore.close();
    if (existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true });
    }
    delete process.env.DATA_DIR;
  });

  describe("initialize", function () {
    it("creates database file and directory", function () {
      PlayerStore.initialize();
      assert.ok(existsSync(`${testDataDir}/players.db`));
    });

    it("can be called multiple times safely", function () {
      PlayerStore.initialize();
      PlayerStore.initialize();
      assert.ok(existsSync(`${testDataDir}/players.db`));
    });
  });

  describe("save and load", function () {
    it("persists a player", function () {
      PlayerStore.initialize();

      const player = { id: "abc123", name: "Alice" };
      PlayerStore.save(player);

      const loaded = PlayerStore.load("abc123");
      assert.deepStrictEqual(loaded, player);
    });

    it("updates existing player", function () {
      PlayerStore.initialize();

      const player = { id: "abc123", name: "Alice" };
      PlayerStore.save(player);

      player.name = "Alicia";
      PlayerStore.save(player);

      const loaded = PlayerStore.load("abc123");
      assert.strictEqual(loaded.name, "Alicia");
    });

    it("returns null for non-existent player", function () {
      PlayerStore.initialize();

      const loaded = PlayerStore.load("nonexistent");
      assert.strictEqual(loaded, null);
    });

    it("returns null for undefined/null id", function () {
      PlayerStore.initialize();

      assert.strictEqual(PlayerStore.load(undefined), null);
      assert.strictEqual(PlayerStore.load(null), null);
    });

    it("handles null name", function () {
      PlayerStore.initialize();

      const player = { id: "abc123", name: null };
      PlayerStore.save(player);

      const loaded = PlayerStore.load("abc123");
      assert.strictEqual(loaded.name, null);
    });
  });

  describe("count", function () {
    it("returns correct count", function () {
      PlayerStore.initialize();

      assert.strictEqual(PlayerStore.count(), 0);

      PlayerStore.save({ id: "player1", name: "One" });
      assert.strictEqual(PlayerStore.count(), 1);

      PlayerStore.save({ id: "player2", name: "Two" });
      assert.strictEqual(PlayerStore.count(), 2);
    });
  });

  describe("close", function () {
    it("can be called safely when not initialized", function () {
      PlayerStore.close();
    });

    it("prevents operations after close", function () {
      PlayerStore.initialize();
      PlayerStore.close();

      assert.throws(
        () => PlayerStore.save({ id: "abc123", name: "Alice" }),
        /not initialized/,
      );
    });
  });
});
