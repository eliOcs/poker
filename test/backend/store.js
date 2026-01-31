import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "assert";
import { rm } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import crypto from "crypto";
import { DatabaseSync } from "node:sqlite";
import * as Store from "../../src/backend/store.js";
import { DEFAULT_SETTINGS } from "../../src/backend/user.js";

// Use unique directory per test to avoid parallel test conflicts
let testDataDir;

describe("store", function () {
  beforeEach(function () {
    testDataDir = `test-data-${crypto.randomBytes(4).toString("hex")}`;
    process.env.DATA_DIR = testDataDir;
    Store._reset();
  });

  afterEach(async function () {
    Store.close();
    if (existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true });
    }
    delete process.env.DATA_DIR;
  });

  describe("initialize", function () {
    it("creates database file and directory", function () {
      Store.initialize();
      assert.ok(existsSync(`${testDataDir}/poker.db`));
    });

    it("can be called multiple times safely", function () {
      Store.initialize();
      Store.initialize();
      assert.ok(existsSync(`${testDataDir}/poker.db`));
    });

    it("migrates from old players.db if poker.db does not exist", function () {
      // Create old players.db
      mkdirSync(testDataDir, { recursive: true });
      const oldDb = new DatabaseSync(`${testDataDir}/players.db`);
      oldDb.exec(`
        CREATE TABLE players (
          id TEXT PRIMARY KEY,
          name TEXT,
          settings TEXT DEFAULT '{}',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      oldDb
        .prepare("INSERT INTO players (id, name, settings) VALUES (?, ?, ?)")
        .run("test-id", "OldPlayer", JSON.stringify({ volume: 0.5 }));
      oldDb.close();

      // Initialize store - should migrate
      Store.initialize();

      // Old file should be renamed
      assert.ok(!existsSync(`${testDataDir}/players.db`));
      assert.ok(existsSync(`${testDataDir}/poker.db`));

      // Data should be accessible
      const user = Store.loadUser("test-id");
      assert.strictEqual(user.name, "OldPlayer");
      assert.strictEqual(user.settings.volume, 0.5);
    });
  });

  describe("saveUser and loadUser", function () {
    it("persists a user", function () {
      Store.initialize();

      const user = { id: "abc123", name: "Alice", settings: { volume: 0.5 } };
      Store.saveUser(user);

      const loaded = Store.loadUser("abc123");
      assert.strictEqual(loaded.id, "abc123");
      assert.strictEqual(loaded.name, "Alice");
      assert.strictEqual(loaded.settings.volume, 0.5);
    });

    it("updates existing user", function () {
      Store.initialize();

      const user = { id: "abc123", name: "Alice", settings: { volume: 0.75 } };
      Store.saveUser(user);

      user.name = "Alicia";
      Store.saveUser(user);

      const loaded = Store.loadUser("abc123");
      assert.strictEqual(loaded.name, "Alicia");
    });

    it("returns null for non-existent user", function () {
      Store.initialize();

      const loaded = Store.loadUser("nonexistent");
      assert.strictEqual(loaded, null);
    });

    it("returns null for undefined/null id", function () {
      Store.initialize();

      assert.strictEqual(Store.loadUser(undefined), null);
      assert.strictEqual(Store.loadUser(null), null);
    });

    it("handles null name", function () {
      Store.initialize();

      const user = { id: "abc123", name: null, settings: { volume: 0.75 } };
      Store.saveUser(user);

      const loaded = Store.loadUser("abc123");
      assert.strictEqual(loaded.name, null);
    });

    it("persists user settings", function () {
      Store.initialize();

      const user = { id: "abc123", name: "Alice", settings: { volume: 0.5 } };
      Store.saveUser(user);

      const loaded = Store.loadUser("abc123");
      assert.strictEqual(loaded.settings.volume, 0.5);
    });

    it("merges loaded settings with defaults", function () {
      Store.initialize();

      // Save user with partial settings (simulates old user or partial save)
      const user = { id: "abc123", name: "Bob", settings: {} };
      Store.saveUser(user);

      const loaded = Store.loadUser("abc123");
      // Should have default volume merged in
      assert.strictEqual(loaded.settings.volume, DEFAULT_SETTINGS.volume);
    });

    it("preserves custom settings when merging with defaults", function () {
      Store.initialize();

      const user = {
        id: "abc123",
        name: "Carol",
        settings: { volume: 0.25, customSetting: "test" },
      };
      Store.saveUser(user);

      const loaded = Store.loadUser("abc123");
      assert.strictEqual(loaded.settings.volume, 0.25);
      assert.strictEqual(loaded.settings.customSetting, "test");
    });

    it("handles user without settings field", function () {
      Store.initialize();

      // Save user without settings (simulates legacy user)
      const user = { id: "abc123", name: "Dave" };
      Store.saveUser(user);

      const loaded = Store.loadUser("abc123");
      // Should have defaults applied
      assert.deepStrictEqual(loaded.settings, DEFAULT_SETTINGS);
    });
  });

  describe("count", function () {
    it("returns correct count", function () {
      Store.initialize();

      assert.strictEqual(Store.count(), 0);

      Store.saveUser({ id: "user1", name: "One", settings: { volume: 0.75 } });
      assert.strictEqual(Store.count(), 1);

      Store.saveUser({ id: "user2", name: "Two", settings: { volume: 0.75 } });
      assert.strictEqual(Store.count(), 2);
    });
  });

  describe("close", function () {
    it("can be called safely when not initialized", function () {
      Store.close();
    });

    it("prevents operations after close", function () {
      Store.initialize();
      Store.close();

      assert.throws(
        () =>
          Store.saveUser({
            id: "abc123",
            name: "Alice",
            settings: { volume: 0.75 },
          }),
        /not initialized/,
      );
    });
  });

  describe("in-memory database", function () {
    beforeEach(function () {
      Store._reset();
    });

    afterEach(function () {
      Store.close();
    });

    it("works with :memory: path", function () {
      Store.initialize(":memory:");

      const user = {
        id: "test-id",
        name: "MemoryUser",
        settings: { volume: 1 },
      };
      Store.saveUser(user);

      const loaded = Store.loadUser("test-id");
      assert.strictEqual(loaded.name, "MemoryUser");
      assert.strictEqual(loaded.settings.volume, 1);
    });

    it("supports multiple save/load cycles", function () {
      Store.initialize(":memory:");

      const user = { id: "u1", name: "One", settings: { volume: 0.25 } };
      Store.saveUser(user);

      user.settings.volume = 0.75;
      Store.saveUser(user);

      const loaded = Store.loadUser("u1");
      assert.strictEqual(loaded.settings.volume, 0.75);
    });
  });
});
