import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "assert";
import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as HandHistory from "../../../../src/backend/poker/hand-history/index.js";
import * as Game from "../../../../src/backend/poker/game.js";
import * as User from "../../../../src/backend/user.js";
import * as Player from "../../../../src/backend/poker/player.js";
import * as Seat from "../../../../src/backend/poker/seat.js";

// Test data directory
const TEST_DATA_DIR = "test-data";

/** Helper to create a test player */
function createPlayer() {
  return Player.fromUser(User.create());
}

// Helper to create a game with players
function createGameWithPlayers() {
  const game = Game.create({ seats: 6 });
  const players = [createPlayer(), createPlayer(), createPlayer()];

  // Seat players
  game.seats[0] = Seat.occupied(players[0], 1000);
  game.seats[1] = Seat.occupied(players[1], 1000);
  game.seats[2] = Seat.occupied(players[2], 1000);

  return { game, players };
}

describe("hand-history", function () {
  let testGame;

  beforeEach(function () {
    // Create a fresh game for each test
    testGame = Game.create({ seats: 6 });
    // Clear cache and recorders before each test
    HandHistory.clearCache();
    HandHistory.clearRecorder(testGame.id);
  });

  afterEach(async function () {
    // Clean up test data directory
    if (existsSync(TEST_DATA_DIR)) {
      await rm(TEST_DATA_DIR, { recursive: true });
    }
  });

  describe("getRecorder", function () {
    it("creates a new recorder for a game", function () {
      const recorder = HandHistory.getRecorder(testGame.id);

      assert.strictEqual(recorder.gameId, testGame.id);
      assert.strictEqual(recorder.handNumber, 0);
      assert.deepStrictEqual(recorder.actions, []);
    });

    it("returns same recorder for same game", function () {
      const r1 = HandHistory.getRecorder(testGame.id);
      const r2 = HandHistory.getRecorder(testGame.id);

      assert.strictEqual(r1, r2);
    });
  });

  describe("startHand", function () {
    it("increments hand number", function () {
      const { game } = createGameWithPlayers();

      HandHistory.startHand(game);
      assert.strictEqual(HandHistory.getHandNumber(game.id), 1);

      HandHistory.startHand(game);
      assert.strictEqual(HandHistory.getHandNumber(game.id), 2);
    });

    it("captures players at hand start", function () {
      const { game, players } = createGameWithPlayers();

      HandHistory.startHand(game);
      const recorder = HandHistory.getRecorder(game.id);

      assert.strictEqual(recorder.players.length, 3);
      assert.strictEqual(recorder.players[0].id, players[0].id);
      assert.strictEqual(recorder.players[1].id, players[1].id);
      assert.strictEqual(recorder.players[2].id, players[2].id);
    });
  });

  describe("recordAction", function () {
    it("records betting actions with correct format", function () {
      const { game, players } = createGameWithPlayers();

      HandHistory.startHand(game);
      HandHistory.recordAction(game.id, players[0].id, "raise", 100, false);

      const recorder = HandHistory.getRecorder(game.id);
      assert.strictEqual(recorder.actions.length, 1);
      assert.strictEqual(recorder.actions[0].action, "Raise");
      assert.strictEqual(recorder.actions[0].amount, 100);
      assert.strictEqual(recorder.actions[0].is_allin, false);
    });

    it("increments action number", function () {
      const { game, players } = createGameWithPlayers();

      HandHistory.startHand(game);
      HandHistory.recordAction(game.id, players[0].id, "check");
      HandHistory.recordAction(game.id, players[1].id, "bet", 50);
      HandHistory.recordAction(game.id, players[0].id, "fold");

      const recorder = HandHistory.getRecorder(game.id);
      assert.strictEqual(recorder.actions[0].action_number, 1);
      assert.strictEqual(recorder.actions[1].action_number, 2);
      assert.strictEqual(recorder.actions[2].action_number, 3);
    });
  });

  describe("recordBlind", function () {
    it("records small blind", function () {
      const { game, players } = createGameWithPlayers();

      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);

      const recorder = HandHistory.getRecorder(game.id);
      assert.strictEqual(recorder.actions[0].action, "Post SB");
      assert.strictEqual(recorder.actions[0].amount, 25);
    });

    it("records big blind", function () {
      const { game, players } = createGameWithPlayers();

      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[1].id, "bb", 50);

      const recorder = HandHistory.getRecorder(game.id);
      assert.strictEqual(recorder.actions[0].action, "Post BB");
      assert.strictEqual(recorder.actions[0].amount, 50);
    });
  });

  describe("recordDealtCards", function () {
    it("records dealt cards in OHH format", function () {
      const { game, players } = createGameWithPlayers();

      HandHistory.startHand(game);
      HandHistory.recordDealtCards(game.id, players[0].id, ["Ah", "Ks"]);

      const recorder = HandHistory.getRecorder(game.id);
      assert.strictEqual(recorder.actions[0].action, "Dealt Cards");
      assert.deepStrictEqual(recorder.actions[0].cards, ["Ah", "Ks"]);
    });
  });

  describe("recordStreet", function () {
    it("records street with board cards", function () {
      const { game } = createGameWithPlayers();

      HandHistory.startHand(game);
      HandHistory.recordStreet(game.id, "flop", ["Qh", "Jc", "2d"]);

      const recorder = HandHistory.getRecorder(game.id);
      assert.strictEqual(recorder.currentStreet, "Flop");
      assert.deepStrictEqual(recorder.boardByStreet.get("Flop"), [
        "Qh",
        "Jc",
        "2d",
      ]);
    });

    it("stores a copy of board cards to prevent mutation", function () {
      const { game } = createGameWithPlayers();

      HandHistory.startHand(game);

      // Simulate how the game deals cards - using a mutable array
      const boardCards = ["Qh", "Jc", "2d"];
      HandHistory.recordStreet(game.id, "flop", boardCards);

      // Simulate turn and river being added to the same array
      boardCards.push("Tc");
      HandHistory.recordStreet(game.id, "turn", [boardCards[3]]);

      boardCards.push("3h");
      HandHistory.recordStreet(game.id, "river", [boardCards[4]]);

      // Verify flop still only has 3 cards (not 5)
      const recorder = HandHistory.getRecorder(game.id);
      assert.deepStrictEqual(recorder.boardByStreet.get("Flop"), [
        "Qh",
        "Jc",
        "2d",
      ]);
      assert.deepStrictEqual(recorder.boardByStreet.get("Turn"), ["Tc"]);
      assert.deepStrictEqual(recorder.boardByStreet.get("River"), ["3h"]);
    });

    it("groups actions by street correctly", async function () {
      const { game, players } = createGameWithPlayers();

      process.env.DATA_DIR = TEST_DATA_DIR;

      HandHistory.startHand(game);

      // Preflop: blinds and dealt cards
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);
      HandHistory.recordBlind(game.id, players[1].id, "bb", 50);
      HandHistory.recordDealtCards(game.id, players[0].id, ["Ah", "Kh"]);
      HandHistory.recordDealtCards(game.id, players[1].id, ["Qc", "Jc"]);
      HandHistory.recordAction(game.id, players[0].id, "call", 50);
      HandHistory.recordAction(game.id, players[1].id, "check");

      // Flop
      HandHistory.recordStreet(game.id, "flop", ["Qh", "Jd", "2s"]);
      HandHistory.recordAction(game.id, players[1].id, "check");
      HandHistory.recordAction(game.id, players[0].id, "bet", 50);
      HandHistory.recordAction(game.id, players[1].id, "call", 50);

      // Turn
      HandHistory.recordStreet(game.id, "turn", ["Tc"]);
      HandHistory.recordAction(game.id, players[1].id, "check");
      HandHistory.recordAction(game.id, players[0].id, "check");

      // River
      HandHistory.recordStreet(game.id, "river", ["3h"]);
      HandHistory.recordAction(game.id, players[1].id, "bet", 100);
      HandHistory.recordAction(game.id, players[0].id, "call", 100);

      // Showdown
      HandHistory.recordShowdown(game.id, players[0].id, ["Ah", "Kh"], true);
      HandHistory.recordShowdown(game.id, players[1].id, ["Qc", "Jc"], true);

      await HandHistory.finalizeHand(game, [
        {
          visibleSeats: [0, 1],
          potAmount: 400,
          winners: [1],
          winningHand: null,
          awards: [{ seat: 1, amount: 400 }],
        },
      ]);

      const hand = await HandHistory.getHand(game.id, 1);

      // Should have 5 rounds: Preflop, Flop, Turn, River, Showdown
      assert.strictEqual(hand.rounds.length, 5);
      assert.strictEqual(hand.rounds[0].street, "Preflop");
      assert.strictEqual(hand.rounds[1].street, "Flop");
      assert.strictEqual(hand.rounds[2].street, "Turn");
      assert.strictEqual(hand.rounds[3].street, "River");
      assert.strictEqual(hand.rounds[4].street, "Showdown");

      // Check board cards
      assert.deepStrictEqual(hand.rounds[1].cards, ["Qh", "Jd", "2s"]);
      assert.deepStrictEqual(hand.rounds[2].cards, ["Tc"]);
      assert.deepStrictEqual(hand.rounds[3].cards, ["3h"]);

      // Check flop actions
      const flopActions = hand.rounds[1].actions;
      assert.strictEqual(flopActions.length, 3);
      assert.strictEqual(flopActions[0].action, "Check");
      assert.strictEqual(flopActions[1].action, "Bet");
      assert.strictEqual(flopActions[2].action, "Call");

      // Check showdown actions
      const showdownActions = hand.rounds[4].actions;
      assert.strictEqual(showdownActions.length, 2);
      assert.strictEqual(showdownActions[0].action, "Shows Cards");
      assert.strictEqual(showdownActions[1].action, "Shows Cards");

      delete process.env.DATA_DIR;
    });

    it("records split pot win amounts correctly with remainder", async function () {
      const { game, players } = createGameWithPlayers();
      // Add a third player
      game.seats[2] = {
        empty: false,
        player: { id: "player3", name: "Player 3" },
        cards: [],
        stack: 4900,
        bet: 0,
        sittingOut: false,
      };
      players.push(game.seats[2].player);

      process.env.DATA_DIR = TEST_DATA_DIR;

      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);
      HandHistory.recordBlind(game.id, players[1].id, "bb", 50);
      HandHistory.recordDealtCards(game.id, players[0].id, ["Ah", "Kh"]);
      HandHistory.recordDealtCards(game.id, players[1].id, ["As", "Ks"]);
      HandHistory.recordDealtCards(game.id, players[2].id, ["Ad", "Kd"]);

      // 3-way split of 100 cents = 34 + 33 + 33
      await HandHistory.finalizeHand(game, [
        {
          potAmount: 100,
          winners: [0, 1, 2],
          winningHand: null,
          winningCards: null,
          awards: [
            { seat: 0, amount: 34 }, // First winner gets remainder
            { seat: 1, amount: 33 },
            { seat: 2, amount: 33 },
          ],
        },
      ]);

      const hand = await HandHistory.getHand(game.id, 1);
      assert.ok(hand);

      // Verify the win amounts are correct (in dollars)
      const wins = hand.pots[0].player_wins;
      assert.strictEqual(wins[0].win_amount, 0.34); // 34 cents
      assert.strictEqual(wins[1].win_amount, 0.33); // 33 cents
      assert.strictEqual(wins[2].win_amount, 0.33); // 33 cents

      delete process.env.DATA_DIR;
    });
  });

  describe("cache", function () {
    it("starts empty", function () {
      assert.strictEqual(HandHistory.getCacheSize(), 0);
    });

    it("adds hands to cache on finalize", async function () {
      const { game, players } = createGameWithPlayers();

      // Set test data directory
      process.env.DATA_DIR = TEST_DATA_DIR;

      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);

      await HandHistory.finalizeHand(game, []);

      assert.strictEqual(HandHistory.getCacheSize(), 1);

      // Restore
      delete process.env.DATA_DIR;
    });

    it("retrieves hand from cache", async function () {
      const { game, players } = createGameWithPlayers();

      process.env.DATA_DIR = TEST_DATA_DIR;

      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);

      await HandHistory.finalizeHand(game, []);

      const hand = await HandHistory.getHand(game.id, 1);
      assert.ok(hand);
      assert.strictEqual(hand.game_number, `${game.id}-1`);

      delete process.env.DATA_DIR;
    });
  });
});
