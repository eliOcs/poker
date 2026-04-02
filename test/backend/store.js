import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "assert";
import { rm } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import * as Store from "../../src/backend/store.js";
import { DEFAULT_SETTINGS } from "../../src/backend/user.js";
import { createTempDataDir } from "./temp-data-dir.js";

// Use unique directory per test to avoid parallel test conflicts
let testDataDir;

describe("store", function () {
  beforeEach(async function () {
    testDataDir = await createTempDataDir();
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

    it("migrates legacy users to always have joined and last seen dates", function () {
      mkdirSync(testDataDir, { recursive: true });
      const legacyDb = new DatabaseSync(`${testDataDir}/poker.db`);
      legacyDb.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          name TEXT,
          created_at TEXT,
          updated_at TEXT
        );
      `);
      legacyDb
        .prepare(
          "INSERT INTO users (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
        )
        .run("legacy-user", "Legacy", "", null);
      legacyDb.close();

      Store.initialize();

      const profile = Store.loadUserProfile("legacy-user");
      assert.ok(profile);
      assert.match(profile.createdAt, /^\d{4}-\d{2}-\d{2} /);
      assert.match(profile.updatedAt, /^\d{4}-\d{2}-\d{2} /);
    });

    it("backfills missing vibration settings for existing users", function () {
      mkdirSync(testDataDir, { recursive: true });
      const legacyDb = new DatabaseSync(`${testDataDir}/poker.db`);
      legacyDb.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          name TEXT,
          email TEXT,
          settings TEXT DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      legacyDb
        .prepare("INSERT INTO users (id, name, settings) VALUES (?, ?, ?)")
        .run("legacy-user", "Legacy", JSON.stringify({ volume: 0.5 }));
      legacyDb.close();

      Store.initialize();
      Store.close();

      const db = new DatabaseSync(`${testDataDir}/poker.db`);
      const row = db
        .prepare("SELECT settings FROM users WHERE id = ?")
        .get("legacy-user");
      const meta = db
        .prepare("SELECT value FROM store_meta WHERE key = ?")
        .get("user_settings_backfilled_at");
      db.close();

      assert.deepStrictEqual(JSON.parse(row.settings), {
        volume: 0.5,
        vibration: true,
      });
      assert.ok(meta?.value);
    });
  });

  describe("saveUser and loadUser", function () {
    it("persists a user", function () {
      Store.initialize();

      const user = {
        id: "abc123",
        name: "Alice",
        email: "alice@example.com",
        settings: { volume: 0.5, vibration: true },
      };
      Store.saveUser(user);

      const loaded = Store.loadUser("abc123");
      assert.strictEqual(loaded.id, "abc123");
      assert.strictEqual(loaded.name, "Alice");
      assert.strictEqual(loaded.email, "alice@example.com");
      assert.strictEqual(loaded.settings.volume, 0.5);
      assert.strictEqual(loaded.settings.vibration, DEFAULT_SETTINGS.vibration);
    });

    it("loads user profile with non-empty joined and last seen dates", function () {
      Store.initialize();

      Store.saveUser({
        id: "abc123",
        name: "Alice",
        settings: { volume: 0.5, vibration: true },
      });

      const loaded = Store.loadUserProfile("abc123");
      assert.ok(loaded);
      assert.match(loaded.createdAt, /^\d{4}-\d{2}-\d{2} /);
      assert.match(loaded.updatedAt, /^\d{4}-\d{2}-\d{2} /);
    });

    it("updates existing user", function () {
      Store.initialize();

      const user = {
        id: "abc123",
        name: "Alice",
        settings: { volume: 0.75, vibration: true },
      };
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

    it("loads a user by verified email", function () {
      Store.initialize();

      Store.saveUser({
        id: "abc123",
        name: "Alice",
        email: "alice@example.com",
        settings: { volume: 0.5, vibration: true },
      });

      const loaded = Store.loadUserByEmail("alice@example.com");
      assert.ok(loaded);
      assert.strictEqual(loaded.id, "abc123");
    });

    it("normalizes null name from DB to undefined", function () {
      Store.initialize();

      const db = new DatabaseSync(`${testDataDir}/poker.db`);
      db.prepare(
        "INSERT INTO users (id, name, email, settings, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
      ).run(
        "abc123",
        null,
        null,
        JSON.stringify({ volume: 0.75, vibration: true }),
      );
      db.close();

      const loaded = Store.loadUser("abc123");
      assert.strictEqual(loaded.name, undefined);
      assert.strictEqual(loaded.email, undefined);
    });

    it("persists user settings", function () {
      Store.initialize();

      const user = {
        id: "abc123",
        name: "Alice",
        settings: { volume: 0.5, vibration: true },
      };
      Store.saveUser(user);

      const loaded = Store.loadUser("abc123");
      assert.strictEqual(loaded.settings.volume, 0.5);
    });

    it("preserves custom settings when merging with defaults", function () {
      Store.initialize();

      const user = {
        id: "abc123",
        name: "Carol",
        settings: {
          volume: 0.25,
          vibration: true,
          customSetting: "test",
        },
      };
      Store.saveUser(user);

      const loaded = Store.loadUser("abc123");
      assert.strictEqual(loaded.settings.volume, 0.25);
      assert.strictEqual(loaded.settings.vibration, true);
      assert.strictEqual(loaded.settings.customSetting, "test");
    });

    it("preserves a saved vibration setting", function () {
      Store.initialize();

      Store.saveUser({
        id: "abc123",
        name: "Alice",
        settings: { volume: 0.75, vibration: false },
      });

      const loaded = Store.loadUser("abc123");
      assert.strictEqual(loaded.settings.vibration, false);
    });
  });

  describe("count", function () {
    it("returns correct count", function () {
      Store.initialize();

      assert.strictEqual(Store.count(), 0);

      Store.saveUser({
        id: "user1",
        name: "One",
        settings: { volume: 0.75, vibration: true },
      });
      assert.strictEqual(Store.count(), 1);

      Store.saveUser({
        id: "user2",
        name: "Two",
        settings: { volume: 0.75, vibration: true },
      });
      assert.strictEqual(Store.count(), 2);
    });
  });

  describe("player data migration", function () {
    it("migrates player table and tournament links between users", function () {
      Store.initialize();

      Store.recordPlayerTableActivity([
        {
          playerId: "guest",
          tableId: "t1",
          tournamentId: null,
          lastHandNumber: 1,
          lastPlayedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          playerId: "guest",
          tableId: "t2",
          tournamentId: null,
          lastHandNumber: 2,
          lastPlayedAt: "2026-01-02T00:00:00.000Z",
        },
      ]);

      Store.migratePlayerData("guest", "registered");

      assert.deepStrictEqual(Store.listPlayerTables("guest"), []);
      const tables = Store.listPlayerTables("registered");
      assert.strictEqual(tables.length, 2);
      assert.deepStrictEqual(tables.map((t) => t.tableId).sort(), ["t1", "t2"]);
    });

    it("throws when migrating player data to the same user id", function () {
      Store.initialize();

      assert.throws(
        () => Store.migratePlayerData("guest", "guest"),
        /same player id/,
      );
    });
  });

  describe("deleteUser", function () {
    it("removes an existing user", function () {
      Store.initialize();

      Store.saveUser({
        id: "abc123",
        name: "Alice",
        settings: { volume: 0.75, vibration: true },
      });
      Store.deleteUser("abc123");

      assert.strictEqual(Store.loadUser("abc123"), null);
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
            settings: { volume: 0.75, vibration: true },
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
        settings: { volume: 1, vibration: true },
      };
      Store.saveUser(user);

      const loaded = Store.loadUser("test-id");
      assert.strictEqual(loaded.name, "MemoryUser");
      assert.strictEqual(loaded.settings.volume, 1);
    });

    it("supports multiple save/load cycles", function () {
      Store.initialize(":memory:");

      const user = {
        id: "u1",
        name: "One",
        settings: { volume: 0.25, vibration: true },
      };
      Store.saveUser(user);

      user.settings.volume = 0.75;
      Store.saveUser(user);

      const loaded = Store.loadUser("u1");
      assert.strictEqual(loaded.settings.volume, 0.75);
    });
  });
});
