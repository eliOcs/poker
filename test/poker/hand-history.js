import { describe, it, beforeEach, afterEach } from "node:test"
import assert from "assert"
import { rm, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import * as HandHistory from "../../src/backend/poker/hand-history.js"
import * as Game from "../../src/backend/poker/game.js"
import * as Player from "../../src/backend/poker/player.js"
import * as Seat from "../../src/backend/poker/seat.js"

// Test data directory
const TEST_DATA_DIR = "test-data"

// Helper to create a game with players
function createGameWithPlayers() {
  const game = Game.create({ seats: 6 })
  const players = [Player.create(), Player.create(), Player.create()]

  // Seat players
  game.seats[0] = Seat.occupied(players[0], 1000)
  game.seats[1] = Seat.occupied(players[1], 1000)
  game.seats[2] = Seat.occupied(players[2], 1000)

  return { game, players }
}

describe("hand-history", function () {
  beforeEach(function () {
    // Clear cache and recorders before each test
    HandHistory.clearCache()
    HandHistory.clearRecorder("test-game")
  })

  afterEach(async function () {
    // Clean up test data directory
    if (existsSync(TEST_DATA_DIR)) {
      await rm(TEST_DATA_DIR, { recursive: true })
    }
  })

  describe("getRecorder", function () {
    it("creates a new recorder for a game", function () {
      const recorder = HandHistory.getRecorder("test-game")

      assert.strictEqual(recorder.gameId, "test-game")
      assert.strictEqual(recorder.handNumber, 0)
      assert.deepStrictEqual(recorder.actions, [])
    })

    it("returns same recorder for same game", function () {
      const r1 = HandHistory.getRecorder("test-game")
      const r2 = HandHistory.getRecorder("test-game")

      assert.strictEqual(r1, r2)
    })
  })

  describe("startHand", function () {
    it("increments hand number", function () {
      const { game } = createGameWithPlayers()

      HandHistory.startHand("test-game", game)
      assert.strictEqual(HandHistory.getHandNumber("test-game"), 1)

      HandHistory.startHand("test-game", game)
      assert.strictEqual(HandHistory.getHandNumber("test-game"), 2)
    })

    it("captures players at hand start", function () {
      const { game, players } = createGameWithPlayers()

      HandHistory.startHand("test-game", game)
      const recorder = HandHistory.getRecorder("test-game")

      assert.strictEqual(recorder.players.length, 3)
      assert.strictEqual(recorder.players[0].id, players[0].id)
      assert.strictEqual(recorder.players[1].id, players[1].id)
      assert.strictEqual(recorder.players[2].id, players[2].id)
    })
  })

  describe("recordAction", function () {
    it("records betting actions with correct format", function () {
      const { game, players } = createGameWithPlayers()

      HandHistory.startHand("test-game", game)
      HandHistory.recordAction("test-game", players[0].id, "raise", 100, false)

      const recorder = HandHistory.getRecorder("test-game")
      assert.strictEqual(recorder.actions.length, 1)
      assert.strictEqual(recorder.actions[0].action, "Raise")
      assert.strictEqual(recorder.actions[0].amount, 100)
      assert.strictEqual(recorder.actions[0].is_allin, false)
    })

    it("increments action number", function () {
      const { game, players } = createGameWithPlayers()

      HandHistory.startHand("test-game", game)
      HandHistory.recordAction("test-game", players[0].id, "check")
      HandHistory.recordAction("test-game", players[1].id, "bet", 50)
      HandHistory.recordAction("test-game", players[0].id, "fold")

      const recorder = HandHistory.getRecorder("test-game")
      assert.strictEqual(recorder.actions[0].action_number, 1)
      assert.strictEqual(recorder.actions[1].action_number, 2)
      assert.strictEqual(recorder.actions[2].action_number, 3)
    })
  })

  describe("recordBlind", function () {
    it("records small blind", function () {
      const { game, players } = createGameWithPlayers()

      HandHistory.startHand("test-game", game)
      HandHistory.recordBlind("test-game", players[0].id, "sb", 25)

      const recorder = HandHistory.getRecorder("test-game")
      assert.strictEqual(recorder.actions[0].action, "Post SB")
      assert.strictEqual(recorder.actions[0].amount, 25)
    })

    it("records big blind", function () {
      const { game, players } = createGameWithPlayers()

      HandHistory.startHand("test-game", game)
      HandHistory.recordBlind("test-game", players[1].id, "bb", 50)

      const recorder = HandHistory.getRecorder("test-game")
      assert.strictEqual(recorder.actions[0].action, "Post BB")
      assert.strictEqual(recorder.actions[0].amount, 50)
    })
  })

  describe("recordDealtCards", function () {
    it("records dealt cards in OHH format", function () {
      const { game, players } = createGameWithPlayers()

      HandHistory.startHand("test-game", game)
      HandHistory.recordDealtCards("test-game", players[0].id, [
        { rank: "ace", suit: "hearts" },
        { rank: "king", suit: "spades" },
      ])

      const recorder = HandHistory.getRecorder("test-game")
      assert.strictEqual(recorder.actions[0].action, "Dealt Cards")
      assert.deepStrictEqual(recorder.actions[0].cards, ["Ah", "Ks"])
    })
  })

  describe("recordStreet", function () {
    it("records street with board cards", function () {
      const { game } = createGameWithPlayers()

      HandHistory.startHand("test-game", game)
      HandHistory.recordStreet("test-game", "flop", [
        { rank: "queen", suit: "hearts" },
        { rank: "jack", suit: "clubs" },
        { rank: "2", suit: "diamonds" },
      ])

      const recorder = HandHistory.getRecorder("test-game")
      assert.strictEqual(recorder.currentStreet, "Flop")
      assert.deepStrictEqual(recorder.boardByStreet.get("Flop"), [
        "Qh",
        "Jc",
        "2d",
      ])
    })
  })

  describe("cache", function () {
    it("starts empty", function () {
      assert.strictEqual(HandHistory.getCacheSize(), 0)
    })

    it("adds hands to cache on finalize", async function () {
      const { game, players } = createGameWithPlayers()

      // Set test data directory
      process.env.DATA_DIR = TEST_DATA_DIR

      HandHistory.startHand("test-game", game)
      HandHistory.recordBlind("test-game", players[0].id, "sb", 25)

      await HandHistory.finalizeHand("test-game", game, [])

      assert.strictEqual(HandHistory.getCacheSize(), 1)

      // Restore
      delete process.env.DATA_DIR
    })

    it("retrieves hand from cache", async function () {
      const { game, players } = createGameWithPlayers()

      process.env.DATA_DIR = TEST_DATA_DIR

      HandHistory.startHand("test-game", game)
      HandHistory.recordBlind("test-game", players[0].id, "sb", 25)

      await HandHistory.finalizeHand("test-game", game, [])

      const hand = await HandHistory.getHand("test-game", 1)
      assert.ok(hand)
      assert.strictEqual(hand.game_number, "test-game-1")

      delete process.env.DATA_DIR
    })
  })

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
      }

      const filtered = HandHistory.filterHandForPlayer(hand, "player1")

      // Own cards visible
      assert.deepStrictEqual(
        filtered.rounds[0].actions[0].cards,
        ["Ah", "Kh"]
      )
      // Opponent cards hidden
      assert.deepStrictEqual(
        filtered.rounds[0].actions[1].cards,
        ["??", "??"]
      )
    })

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
      }

      const filtered = HandHistory.filterHandForPlayer(hand, "player1")

      // Opponent cards visible because they showed
      assert.deepStrictEqual(
        filtered.rounds[0].actions[1].cards,
        ["Qc", "Jc"]
      )
    })
  })

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
      }

      const summary = HandHistory.getHandSummary(hand, "player1")

      assert.strictEqual(summary.game_number, "abc123-5")
      assert.strictEqual(summary.hand_number, 5)
      assert.deepStrictEqual(summary.hole_cards, ["Ah", "Kh"])
      assert.strictEqual(summary.winner_name, "Alice")
      assert.strictEqual(summary.winner_id, "player1")
      assert.strictEqual(summary.pot, 200)
      assert.strictEqual(summary.is_winner, true)
    })

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
      }

      const summary = HandHistory.getHandSummary(hand, "player1")

      assert.strictEqual(summary.is_winner, false)
      assert.strictEqual(summary.winner_name, "Bob")
    })
  })

  describe("getAllHands", function () {
    it("returns empty array for non-existent game", async function () {
      process.env.DATA_DIR = TEST_DATA_DIR

      const hands = await HandHistory.getAllHands("nonexistent")
      assert.deepStrictEqual(hands, [])

      delete process.env.DATA_DIR
    })

    it("returns all hands from file", async function () {
      const { game, players } = createGameWithPlayers()

      process.env.DATA_DIR = TEST_DATA_DIR

      // Create two hands
      HandHistory.startHand("test-game", game)
      HandHistory.recordBlind("test-game", players[0].id, "sb", 25)
      await HandHistory.finalizeHand("test-game", game, [])

      HandHistory.startHand("test-game", game)
      HandHistory.recordBlind("test-game", players[0].id, "sb", 25)
      await HandHistory.finalizeHand("test-game", game, [])

      const hands = await HandHistory.getAllHands("test-game")
      assert.strictEqual(hands.length, 2)
      assert.strictEqual(hands[0].game_number, "test-game-1")
      assert.strictEqual(hands[1].game_number, "test-game-2")

      delete process.env.DATA_DIR
    })
  })

  describe("file operations", function () {
    it("writes hand to .ohh file", async function () {
      const { game, players } = createGameWithPlayers()

      process.env.DATA_DIR = TEST_DATA_DIR

      HandHistory.startHand("test-game", game)
      HandHistory.recordBlind("test-game", players[0].id, "sb", 25)
      HandHistory.recordBlind("test-game", players[1].id, "bb", 50)

      await HandHistory.finalizeHand("test-game", game, [])

      // Verify file exists and contains valid JSON
      const filePath = `${TEST_DATA_DIR}/test-game.ohh`
      assert.ok(existsSync(filePath))

      const content = await readFile(filePath, "utf8")
      const lines = content.split("\n\n").filter(Boolean)
      assert.strictEqual(lines.length, 1)

      const parsed = JSON.parse(lines[0])
      assert.ok(parsed.ohh)
      assert.strictEqual(parsed.ohh.spec_version, "1.4.6")
      assert.strictEqual(parsed.ohh.site_name, "Pluton Poker")

      delete process.env.DATA_DIR
    })

    it("appends multiple hands to same file", async function () {
      const { game, players } = createGameWithPlayers()

      process.env.DATA_DIR = TEST_DATA_DIR

      // First hand
      HandHistory.startHand("test-game", game)
      HandHistory.recordBlind("test-game", players[0].id, "sb", 25)
      await HandHistory.finalizeHand("test-game", game, [])

      // Second hand
      HandHistory.startHand("test-game", game)
      HandHistory.recordBlind("test-game", players[0].id, "sb", 25)
      await HandHistory.finalizeHand("test-game", game, [])

      const content = await readFile(`${TEST_DATA_DIR}/test-game.ohh`, "utf8")
      const lines = content.split("\n\n").filter(Boolean)
      assert.strictEqual(lines.length, 2)

      const hand1 = JSON.parse(lines[0]).ohh
      const hand2 = JSON.parse(lines[1]).ohh
      assert.strictEqual(hand1.game_number, "test-game-1")
      assert.strictEqual(hand2.game_number, "test-game-2")

      delete process.env.DATA_DIR
    })
  })
})
