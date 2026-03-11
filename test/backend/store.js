import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "assert";
import { rm, writeFile } from "node:fs/promises";
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

    it("backfills player_games from existing hand histories when migration has not run yet", async function () {
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
      legacyDb.exec(`
        CREATE TABLE player_games (
          player_id TEXT NOT NULL,
          game_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (player_id, game_id)
        );
      `);
      legacyDb.close();

      await writeFile(
        `${testDataDir}/gameabc.ohh`,
        `${JSON.stringify({
          ohh: {
            spec_version: "1.4.6",
            site_name: "Pluton Poker",
            game_number: "gameabc-1",
            start_date_utc: "2026-03-07T12:00:00.000Z",
            game_type: "Hold'em",
            bet_limit: { bet_type: "NL" },
            table_size: 6,
            dealer_seat: 1,
            small_blind_amount: 0.25,
            big_blind_amount: 0.5,
            ante_amount: 0,
            players: [
              { id: "p1", seat: 1, name: "Alice", starting_stack: 10 },
              { id: "p2", seat: 2, name: "Bob", starting_stack: 10 },
            ],
            rounds: [],
            pots: [],
          },
        })}\n\n`,
      );

      Store.initialize();

      assert.deepStrictEqual(Store.listPlayerGameIds("p1"), ["gameabc"]);
      assert.deepStrictEqual(Store.listPlayerGameIds("p2"), ["gameabc"]);
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

    it("loads user profile with non-empty joined and last seen dates", function () {
      Store.initialize();

      Store.saveUser({
        id: "abc123",
        name: "Alice",
        settings: { volume: 0.5 },
      });

      const loaded = Store.loadUserProfile("abc123");
      assert.ok(loaded);
      assert.match(loaded.createdAt, /^\d{4}-\d{2}-\d{2} /);
      assert.match(loaded.updatedAt, /^\d{4}-\d{2}-\d{2} /);
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

    it("normalizes null name from DB to undefined", function () {
      Store.initialize();

      const user = { id: "abc123", name: null, settings: { volume: 0.75 } };
      Store.saveUser(user);

      const loaded = Store.loadUser("abc123");
      assert.strictEqual(loaded.name, undefined);
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

  describe("player game index", function () {
    it("records and lists unique game ids for a player", function () {
      Store.initialize();

      Store.recordPlayerGames([
        { playerId: "u1", gameId: "g1" },
        { playerId: "u1", gameId: "g2" },
        { playerId: "u1", gameId: "g1" },
        { playerId: "u2", gameId: "g3" },
      ]);

      assert.deepStrictEqual(Store.listPlayerGameIds("u1"), ["g1", "g2"]);
      assert.deepStrictEqual(Store.listPlayerGameIds("u2"), ["g3"]);
    });

    it("returns empty list for unknown player", function () {
      Store.initialize();
      assert.deepStrictEqual(Store.listPlayerGameIds("missing"), []);
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
