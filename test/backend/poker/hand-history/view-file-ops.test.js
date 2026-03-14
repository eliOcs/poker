import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "assert";
import { rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as HandHistory from "../../../../src/backend/poker/hand-history/index.js";
import { rewritePlayerIdInHandHistory } from "../../../../src/backend/poker/hand-history/io.js";
import * as Game from "../../../../src/backend/poker/game.js";
import * as User from "../../../../src/backend/user.js";
import * as Player from "../../../../src/backend/poker/player.js";
import * as Seat from "../../../../src/backend/poker/seat.js";
import { createTempDataDir } from "../../temp-data-dir.js";

let testDataDir;

function createPlayer() {
  return Player.fromUser(User.create());
}

function createGameWithPlayers() {
  const game = Game.create({ seats: 6 });
  const players = [createPlayer(), createPlayer(), createPlayer()];

  game.seats[0] = Seat.occupied(players[0], 1000);
  game.seats[1] = Seat.occupied(players[1], 1000);
  game.seats[2] = Seat.occupied(players[2], 1000);

  return { game, players };
}

describe("hand-history-view", function () {
  let testGame;

  beforeEach(function () {
    testGame = Game.create({ seats: 6 });
    HandHistory.clearCache();
    HandHistory.clearRecorder(testGame.id);
  });

  afterEach(async function () {
    if (existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true });
    }
    delete process.env.DATA_DIR;
  });
  describe("getAllHands", function () {
    it("returns empty array for non-existent game", async function () {
      testDataDir = await createTempDataDir();
      process.env.DATA_DIR = testDataDir;

      const hands = await HandHistory.getAllHands("nonexistent");
      assert.deepStrictEqual(hands, []);

      delete process.env.DATA_DIR;
    });

    it("returns all hands from file", async function () {
      const { game, players } = createGameWithPlayers();

      testDataDir = await createTempDataDir();
      process.env.DATA_DIR = testDataDir;

      // Create two hands
      game.handNumber++;
      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);
      await HandHistory.finalizeHand(game, []);

      game.handNumber++;
      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);
      await HandHistory.finalizeHand(game, []);

      const hands = await HandHistory.getAllHands(game.id);
      assert.strictEqual(hands.length, 2);
      assert.strictEqual(hands[0].game_number, `${game.id}-1`);
      assert.strictEqual(hands[1].game_number, `${game.id}-2`);

      delete process.env.DATA_DIR;
    });
  });

  describe("file operations", function () {
    it("writes hand to .ohh file", async function () {
      const { game, players } = createGameWithPlayers();

      testDataDir = await createTempDataDir();
      process.env.DATA_DIR = testDataDir;

      game.handNumber++;
      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);
      HandHistory.recordBlind(game.id, players[1].id, "bb", 50);

      await HandHistory.finalizeHand(game, []);

      // Verify file exists and contains valid JSON
      const filePath = `${testDataDir}/${game.id}.ohh`;
      assert.ok(existsSync(filePath));

      const content = await readFile(filePath, "utf8");
      const lines = content.split("\n\n").filter(Boolean);
      assert.strictEqual(lines.length, 1);

      const parsed = JSON.parse(lines[0]);
      assert.ok(parsed.ohh);
      assert.strictEqual(parsed.ohh.spec_version, "1.4.7");
      assert.strictEqual(parsed.ohh.site_name, "Pluton Poker");

      delete process.env.DATA_DIR;
    });

    it("appends multiple hands to same file", async function () {
      const { game, players } = createGameWithPlayers();

      testDataDir = await createTempDataDir();
      process.env.DATA_DIR = testDataDir;

      // First hand
      game.handNumber++;
      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);
      await HandHistory.finalizeHand(game, []);

      // Second hand
      game.handNumber++;
      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);
      await HandHistory.finalizeHand(game, []);

      const content = await readFile(`${testDataDir}/${game.id}.ohh`, "utf8");
      const lines = content.split("\n\n").filter(Boolean);
      assert.strictEqual(lines.length, 2);

      const hand1 = JSON.parse(lines[0]).ohh;
      const hand2 = JSON.parse(lines[1]).ohh;
      assert.strictEqual(hand1.game_number, `${game.id}-1`);
      assert.strictEqual(hand2.game_number, `${game.id}-2`);

      delete process.env.DATA_DIR;
    });

    it("rewrites player ids in persisted hand history", async function () {
      const { game, players } = createGameWithPlayers();

      testDataDir = await createTempDataDir();
      process.env.DATA_DIR = testDataDir;

      game.handNumber++;
      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);
      HandHistory.recordBlind(game.id, players[1].id, "bb", 50);
      HandHistory.recordAction(game.id, players[0].id, "call", 50);
      await HandHistory.finalizeHand(game, [
        {
          visibleSeats: [0, 1],
          potAmount: 100,
          winners: [0],
          winningHand: null,
          awards: [{ seat: 0, amount: 100 }],
        },
      ]);

      const changed = await rewritePlayerIdInHandHistory(
        game.id,
        players[0].id,
        "registered-player",
      );
      assert.equal(changed, true);

      const hands = await HandHistory.getAllHands(game.id);
      assert.equal(hands[0].players[0].id, "registered-player");
      assert.equal(
        hands[0].rounds[0].actions.some(
          (action) => action.player_id === "registered-player",
        ),
        true,
      );
      assert.equal(
        hands[0].pots[0].player_wins[0].player_id,
        "registered-player",
      );

      delete process.env.DATA_DIR;
    });

    it("throws when rewriting hand history to the same player id", async function () {
      const { game, players } = createGameWithPlayers();

      testDataDir = await createTempDataDir();
      process.env.DATA_DIR = testDataDir;

      game.handNumber++;
      HandHistory.startHand(game);
      await HandHistory.finalizeHand(game, []);

      await assert.rejects(
        () =>
          rewritePlayerIdInHandHistory(game.id, players[0].id, players[0].id),
        /same player id/,
      );

      delete process.env.DATA_DIR;
    });
  });
});
