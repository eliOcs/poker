import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "assert";
import { rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as HandHistory from "../../../../src/backend/poker/hand-history/index.js";
import * as Game from "../../../../src/backend/poker/game.js";
import * as Player from "../../../../src/backend/poker/player.js";
import * as Seat from "../../../../src/backend/poker/seat.js";

// Test data directory (unique to avoid conflicts with hand-history.js tests)
const TEST_DATA_DIR = "test-data-view";

// Helper to create a game with players
function createGameWithPlayers() {
  const game = Game.create({ seats: 6 });
  const players = [Player.create(), Player.create(), Player.create()];

  // Seat players
  game.seats[0] = Seat.occupied(players[0], 1000);
  game.seats[1] = Seat.occupied(players[1], 1000);
  game.seats[2] = Seat.occupied(players[2], 1000);

  return { game, players };
}

describe("hand-history-view", function () {
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

  describe("filterHandForPlayer", function () {
    it("shows own cards", function () {
      const hand = {
        spec_version: "1.4.6",
        site_name: "Pluton Poker",
        game_number: "test-1",
        start_date_utc: "2024-01-01T00:00:00Z",
        game_type: "Holdem",
        bet_limit: { bet_type: "NL" },
        table_size: 6,
        dealer_seat: 1,
        small_blind_amount: 25,
        big_blind_amount: 50,
        ante_amount: 0,
        players: [
          { id: "player1", seat: 1, name: "Alice", starting_stack: 1000 },
          { id: "player2", seat: 2, name: "Bob", starting_stack: 1000 },
        ],
        rounds: [
          {
            id: 0,
            street: "Preflop",
            actions: [
              {
                action_number: 1,
                player_id: "player1",
                action: "Dealt Cards",
                cards: ["Ah", "Kh"],
              },
              {
                action_number: 2,
                player_id: "player2",
                action: "Dealt Cards",
                cards: ["Qc", "Jc"],
              },
            ],
          },
        ],
        pots: [],
      };

      const filtered = HandHistory.filterHandForPlayer(hand, "player1");

      // Own cards visible
      assert.deepStrictEqual(filtered.rounds[0].actions[0].cards, ["Ah", "Kh"]);
      // Opponent cards hidden
      assert.deepStrictEqual(filtered.rounds[0].actions[1].cards, ["??", "??"]);
    });

    it("shows opponent cards if they showed at showdown", function () {
      const hand = {
        spec_version: "1.4.6",
        site_name: "Pluton Poker",
        game_number: "test-1",
        start_date_utc: "2024-01-01T00:00:00Z",
        game_type: "Holdem",
        bet_limit: { bet_type: "NL" },
        table_size: 6,
        dealer_seat: 1,
        small_blind_amount: 25,
        big_blind_amount: 50,
        ante_amount: 0,
        players: [
          { id: "player1", seat: 1, name: "Alice", starting_stack: 1000 },
          { id: "player2", seat: 2, name: "Bob", starting_stack: 1000 },
        ],
        rounds: [
          {
            id: 0,
            street: "Preflop",
            actions: [
              {
                action_number: 1,
                player_id: "player1",
                action: "Dealt Cards",
                cards: ["Ah", "Kh"],
              },
              {
                action_number: 2,
                player_id: "player2",
                action: "Dealt Cards",
                cards: ["Qc", "Jc"],
              },
            ],
          },
          {
            id: 1,
            street: "Showdown",
            actions: [
              {
                action_number: 3,
                player_id: "player2",
                action: "Shows Cards",
                cards: ["Qc", "Jc"],
              },
            ],
          },
        ],
        pots: [],
      };

      const filtered = HandHistory.filterHandForPlayer(hand, "player1");

      // Opponent cards visible because they showed
      assert.deepStrictEqual(filtered.rounds[0].actions[1].cards, ["Qc", "Jc"]);
    });
  });

  describe("getHandSummary", function () {
    it("returns correct summary", function () {
      const hand = {
        spec_version: "1.4.6",
        site_name: "Pluton Poker",
        game_number: "abc123-5",
        start_date_utc: "2024-01-01T00:00:00Z",
        game_type: "Holdem",
        bet_limit: { bet_type: "NL" },
        table_size: 6,
        dealer_seat: 1,
        small_blind_amount: 25,
        big_blind_amount: 50,
        ante_amount: 0,
        players: [
          { id: "player1", seat: 1, name: "Alice", starting_stack: 1000 },
          { id: "player2", seat: 2, name: "Bob", starting_stack: 1000 },
        ],
        rounds: [
          {
            id: 0,
            street: "Preflop",
            actions: [
              {
                action_number: 1,
                player_id: "player1",
                action: "Dealt Cards",
                cards: ["Ah", "Kh"],
              },
              {
                action_number: 2,
                player_id: "player2",
                action: "Dealt Cards",
                cards: ["Qc", "Jc"],
              },
            ],
          },
        ],
        pots: [
          {
            number: 0,
            amount: 200,
            player_wins: [
              { player_id: "player1", win_amount: 200, contributed_rake: 0 },
            ],
          },
        ],
      };

      const summary = HandHistory.getHandSummary(hand, "player1");

      assert.strictEqual(summary.game_number, "abc123-5");
      assert.strictEqual(summary.hand_number, 5);
      assert.deepStrictEqual(summary.hole_cards, ["Ah", "Kh"]);
      assert.strictEqual(summary.winner_name, "Alice");
      assert.strictEqual(summary.winner_id, "player1");
      assert.strictEqual(summary.pot, 20000); // 200 dollars → 20000 cents
      assert.strictEqual(summary.is_winner, true);
    });

    it("marks is_winner false for non-winners", function () {
      const hand = {
        spec_version: "1.4.6",
        site_name: "Pluton Poker",
        game_number: "abc123-5",
        start_date_utc: "2024-01-01T00:00:00Z",
        game_type: "Holdem",
        bet_limit: { bet_type: "NL" },
        table_size: 6,
        dealer_seat: 1,
        small_blind_amount: 25,
        big_blind_amount: 50,
        ante_amount: 0,
        players: [
          { id: "player1", seat: 1, name: "Alice", starting_stack: 1000 },
          { id: "player2", seat: 2, name: "Bob", starting_stack: 1000 },
        ],
        rounds: [
          {
            id: 0,
            street: "Preflop",
            actions: [
              {
                action_number: 1,
                player_id: "player1",
                action: "Dealt Cards",
                cards: ["Ah", "Kh"],
              },
            ],
          },
        ],
        pots: [
          {
            number: 0,
            amount: 200,
            player_wins: [
              { player_id: "player2", win_amount: 200, contributed_rake: 0 },
            ],
          },
        ],
      };

      const summary = HandHistory.getHandSummary(hand, "player1");

      assert.strictEqual(summary.is_winner, false);
      assert.strictEqual(summary.winner_name, "Bob");
    });
  });

  describe("getHandView", function () {
    it("maps 1-indexed OHH seats to correct view positions", function () {
      const hand = {
        spec_version: "1.4.6",
        site_name: "Pluton Poker",
        game_number: "test-1",
        start_date_utc: "2024-01-01T00:00:00Z",
        game_type: "Holdem",
        bet_limit: { bet_type: "NL" },
        table_size: 6,
        dealer_seat: 1,
        small_blind_amount: 25,
        big_blind_amount: 50,
        ante_amount: 0,
        players: [
          { id: "player1", seat: 1, name: "Alice", starting_stack: 1000 },
          { id: "player2", seat: 3, name: "Bob", starting_stack: 500 },
        ],
        rounds: [
          {
            id: 0,
            street: "Preflop",
            actions: [
              {
                action_number: 1,
                player_id: "player1",
                action: "Dealt Cards",
                cards: ["Ah", "Kh"],
              },
              {
                action_number: 2,
                player_id: "player2",
                action: "Dealt Cards",
                cards: ["Qc", "Jc"],
              },
            ],
          },
        ],
        pots: [],
      };

      const view = HandHistory.getHandView(hand, "player1");

      // Seat 1 in OHH should be at index 0 in view
      // Stack is converted from OHH dollars to cents for frontend
      assert.strictEqual(view.seats[0].empty, false);
      assert.strictEqual(view.seats[0].player.name, "Alice (you)");
      assert.strictEqual(view.seats[0].stack, 100000); // 1000 dollars → 100000 cents

      // Seat 2 should be empty (no player)
      assert.strictEqual(view.seats[1].empty, true);

      // Seat 3 in OHH should be at index 2 in view
      assert.strictEqual(view.seats[2].empty, false);
      assert.strictEqual(view.seats[2].player.name, "Bob");
      assert.strictEqual(view.seats[2].stack, 50000); // 500 dollars → 50000 cents
    });

    it("handles null player names gracefully", function () {
      const hand = {
        spec_version: "1.4.6",
        site_name: "Pluton Poker",
        game_number: "test-1",
        start_date_utc: "2024-01-01T00:00:00Z",
        game_type: "Holdem",
        bet_limit: { bet_type: "NL" },
        table_size: 6,
        dealer_seat: 1,
        small_blind_amount: 25,
        big_blind_amount: 50,
        ante_amount: 0,
        players: [
          { id: "player1", seat: 1, name: null, starting_stack: 1000 },
          { id: "player2", seat: 2, name: null, starting_stack: 500 },
        ],
        rounds: [
          {
            id: 0,
            street: "Preflop",
            actions: [],
          },
        ],
        pots: [],
      };

      const view = HandHistory.getHandView(hand, "player1");

      // Null name for current player should show "Seat N (you)", not "null (you)"
      assert.strictEqual(view.seats[0].player.name, "Seat 1 (you)");
      assert.ok(!view.seats[0].player.name.includes("null"));

      // Null name for other player should show "Seat N", not "null"
      assert.strictEqual(view.seats[1].player.name, "Seat 2");
      assert.ok(!view.seats[1].player.name.includes("null"));
    });

    it("includes winner information in seat data", function () {
      const hand = {
        spec_version: "1.4.6",
        site_name: "Pluton Poker",
        game_number: "test-1",
        start_date_utc: "2024-01-01T00:00:00Z",
        game_type: "Holdem",
        bet_limit: { bet_type: "NL" },
        table_size: 6,
        dealer_seat: 1,
        small_blind_amount: 25,
        big_blind_amount: 50,
        ante_amount: 0,
        players: [
          { id: "player1", seat: 1, name: "Alice", starting_stack: 1000 },
          { id: "player2", seat: 2, name: "Bob", starting_stack: 500 },
        ],
        rounds: [
          {
            id: 0,
            street: "Preflop",
            actions: [],
          },
        ],
        pots: [
          {
            number: 0,
            amount: 200,
            winning_hand: "Two Pair, Aces and Kings",
            winning_cards: ["Ah", "Ad", "Kh", "Kd", "Qc"],
            player_wins: [
              { player_id: "player1", win_amount: 200, contributed_rake: 0 },
            ],
          },
        ],
      };

      const view = HandHistory.getHandView(hand, "player1");

      // Winner should have handResult (converted to cents) and handRank
      assert.strictEqual(view.seats[0].handResult, 20000); // 200 dollars → 20000 cents
      assert.strictEqual(view.seats[0].handRank, "Two Pair, Aces and Kings");
      assert.deepStrictEqual(view.seats[0].winningCards, [
        "Ah",
        "Ad",
        "Kh",
        "Kd",
        "Qc",
      ]);

      // Non-winner should not have handResult
      assert.strictEqual(view.seats[1].handResult, null);
      assert.strictEqual(view.seats[1].handRank, null);
    });
  });

  describe("getAllHands", function () {
    it("returns empty array for non-existent game", async function () {
      process.env.DATA_DIR = TEST_DATA_DIR;

      const hands = await HandHistory.getAllHands("nonexistent");
      assert.deepStrictEqual(hands, []);

      delete process.env.DATA_DIR;
    });

    it("returns all hands from file", async function () {
      const { game, players } = createGameWithPlayers();

      process.env.DATA_DIR = TEST_DATA_DIR;

      // Create two hands
      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);
      await HandHistory.finalizeHand(game, []);

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

      process.env.DATA_DIR = TEST_DATA_DIR;

      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);
      HandHistory.recordBlind(game.id, players[1].id, "bb", 50);

      await HandHistory.finalizeHand(game, []);

      // Verify file exists and contains valid JSON
      const filePath = `${TEST_DATA_DIR}/${game.id}.ohh`;
      assert.ok(existsSync(filePath));

      const content = await readFile(filePath, "utf8");
      const lines = content.split("\n\n").filter(Boolean);
      assert.strictEqual(lines.length, 1);

      const parsed = JSON.parse(lines[0]);
      assert.ok(parsed.ohh);
      assert.strictEqual(parsed.ohh.spec_version, "1.4.6");
      assert.strictEqual(parsed.ohh.site_name, "Pluton Poker");

      delete process.env.DATA_DIR;
    });

    it("appends multiple hands to same file", async function () {
      const { game, players } = createGameWithPlayers();

      process.env.DATA_DIR = TEST_DATA_DIR;

      // First hand
      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);
      await HandHistory.finalizeHand(game, []);

      // Second hand
      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, players[0].id, "sb", 25);
      await HandHistory.finalizeHand(game, []);

      const content = await readFile(`${TEST_DATA_DIR}/${game.id}.ohh`, "utf8");
      const lines = content.split("\n\n").filter(Boolean);
      assert.strictEqual(lines.length, 2);

      const hand1 = JSON.parse(lines[0]).ohh;
      const hand2 = JSON.parse(lines[1]).ohh;
      assert.strictEqual(hand1.game_number, `${game.id}-1`);
      assert.strictEqual(hand2.game_number, `${game.id}-2`);

      delete process.env.DATA_DIR;
    });
  });
});
