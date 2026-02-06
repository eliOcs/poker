import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import * as HandHistory from "../../../src/backend/poker/hand-history/index.js";
import { toDollars } from "../../../src/backend/poker/hand-history/io.js";
import * as Game from "../../../src/backend/poker/game.js";
import * as Seat from "../../../src/backend/poker/seat.js";
import * as Actions from "../../../src/backend/poker/actions.js";
import * as Tournament from "../../../src/shared/tournament.js";
import { drainGenerator } from "./test-helpers.js";

describe("hand-history", () => {
  let game;

  beforeEach(() => {
    game = Game.create({ seats: 6, blinds: { ante: 0, small: 50, big: 100 } });
    game.seats[0] = Seat.occupied({ id: "player1", name: "Alice" }, 10000);
    game.seats[1] = Seat.occupied({ id: "player2", name: "Bob" }, 5000);
    game.seats[2] = Seat.occupied({ id: "player3", name: "Charlie" }, 20000);
    game.button = 0;
  });

  afterEach(() => {
    HandHistory.clearRecorder(game.id);
  });

  describe("river round recording when all-in", () => {
    it("should record river round even when no actions on river (all-in scenario)", async () => {
      // This reproduces the bug from production hand ml1c1ixx2027-26
      // When everyone is all-in, the river is dealt but not recorded in OHH
      // because buildRounds only creates rounds for streets that have actions

      // Start the hand
      game.handNumber++;
      HandHistory.startHand(game);
      Actions.startHand(game);
      drainGenerator(Actions.blinds(game));
      drainGenerator(Actions.dealPreflop(game));

      // Record blinds
      HandHistory.recordBlind(game.id, "player3", "sb", 50);
      HandHistory.recordBlind(game.id, "player1", "bb", 100);

      // Record dealt cards
      HandHistory.recordDealtCards(game.id, "player1", game.seats[0].cards);
      HandHistory.recordDealtCards(game.id, "player2", game.seats[1].cards);
      HandHistory.recordDealtCards(game.id, "player3", game.seats[2].cards);

      // Preflop: Alice folds, Bob and Charlie continue
      game.seats[0].folded = true;
      HandHistory.recordAction(game.id, "player1", "fold");

      // Skip to turn with Bob having a short stack
      game.hand.phase = "turn";
      game.seats[1].stack = 1000; // Bob has 1000 left
      game.seats[1].bet = 0;
      game.seats[1].allIn = false;
      game.seats[1].totalInvested = 2000;

      game.seats[2].stack = 15000;
      game.seats[2].bet = 0;
      game.seats[2].allIn = false;
      game.seats[2].totalInvested = 2000;

      // Deal flop and turn
      game.board.cards = [];
      drainGenerator(Actions.dealFlop(game));
      HandHistory.recordStreet(game.id, "flop", game.board.cards);

      drainGenerator(Actions.dealTurn(game));
      HandHistory.recordStreet(game.id, "turn", [game.board.cards[3]]);

      // Charlie bets 2000, Bob calls all-in for 1000
      game.seats[2].bet = 2000;
      game.seats[2].stack -= 2000;
      game.seats[2].totalInvested += 2000;
      game.hand.currentBet = 2000;
      game.hand.lastRaiser = 2;
      HandHistory.recordAction(game.id, "player3", "bet", 2000, false);

      // Bob goes all-in (calls for less)
      game.seats[1].bet = 1000;
      game.seats[1].stack = 0;
      game.seats[1].allIn = true;
      game.seats[1].totalInvested += 1000;
      HandHistory.recordAction(game.id, "player2", "call", 1000, true);

      // Deal river (this happens in processGameFlow when everyone is all-in)
      drainGenerator(Actions.dealRiver(game));
      HandHistory.recordStreet(game.id, "river", [game.board.cards[4]]);

      // Record showdown
      HandHistory.recordShowdown(game.id, "player2", game.seats[1].cards, true);
      HandHistory.recordShowdown(game.id, "player3", game.seats[2].cards, true);

      // Finalize the hand with pot results
      const potResults = [
        {
          potAmount: 2000,
          winners: [1],
          winningHand: { name: "pair", of: "A" },
          winningCards: game.board.cards,
          awards: [{ seat: 1, amount: 2000 }],
        },
      ];

      await HandHistory.finalizeHand(game, potResults);

      // Retrieve the hand from cache
      const hand = await HandHistory.getHand(game.id, game.handNumber);

      // Find the River round
      const riverRound = hand.rounds.find((r) => r.street === "River");

      assert.ok(riverRound, "OHH should include a River round");
      assert.ok(riverRound.cards, "River round should have cards");
      assert.equal(
        riverRound.cards.length,
        1,
        "River round should have 1 card",
      );
    });

    it("should include all 5 board cards across rounds when all-in on turn", async () => {
      game.handNumber++;
      HandHistory.startHand(game);
      Actions.startHand(game);
      drainGenerator(Actions.blinds(game));
      drainGenerator(Actions.dealPreflop(game));

      // Record minimal history
      HandHistory.recordBlind(game.id, "player3", "sb", 50);
      HandHistory.recordBlind(game.id, "player1", "bb", 100);

      // Skip preflop betting, Alice folds
      game.seats[0].folded = true;
      game.seats[0].totalInvested = 100;
      HandHistory.recordAction(game.id, "player1", "fold");

      game.seats[1].totalInvested = 100;
      game.seats[2].totalInvested = 100;

      // Deal flop
      game.board.cards = [];
      drainGenerator(Actions.dealFlop(game));
      HandHistory.recordStreet(game.id, "flop", game.board.cards);
      HandHistory.recordAction(game.id, "player2", "check");
      HandHistory.recordAction(game.id, "player3", "check");

      // Deal turn
      drainGenerator(Actions.dealTurn(game));
      HandHistory.recordStreet(game.id, "turn", [game.board.cards[3]]);

      // All-in on turn
      game.seats[1].allIn = true;
      game.seats[1].totalInvested += 1000;
      game.seats[2].allIn = true;
      game.seats[2].totalInvested += 1000;
      HandHistory.recordAction(game.id, "player3", "bet", 1000, true);
      HandHistory.recordAction(game.id, "player2", "call", 1000, true);

      // River dealt with no actions (everyone all-in)
      drainGenerator(Actions.dealRiver(game));
      HandHistory.recordStreet(game.id, "river", [game.board.cards[4]]);

      // Showdown
      HandHistory.recordShowdown(game.id, "player2", game.seats[1].cards, true);
      HandHistory.recordShowdown(game.id, "player3", game.seats[2].cards, true);

      const potResults = [
        {
          potAmount: 2200,
          winners: [1],
          winningHand: { name: "pair", of: "K" },
          winningCards: game.board.cards,
          awards: [{ seat: 1, amount: 2200 }],
        },
      ];

      await HandHistory.finalizeHand(game, potResults);

      const hand = await HandHistory.getHand(game.id, game.handNumber);

      // Count total board cards across all rounds
      let totalBoardCards = 0;
      for (const round of hand.rounds) {
        if (round.cards) {
          totalBoardCards += round.cards.length;
        }
      }

      assert.equal(
        totalBoardCards,
        5,
        "OHH should include all 5 board cards (3 flop + 1 turn + 1 river)",
      );

      // Verify River round exists
      const riverRound = hand.rounds.find((r) => r.street === "River");
      assert.ok(riverRound, "River round should exist");
      assert.deepEqual(
        riverRound.actions,
        [],
        "River round should have no actions",
      );
    });
  });

  describe("tournament hand history buy-in", () => {
    let tournamentGame;

    beforeEach(() => {
      tournamentGame = Game.createTournament({ buyIn: 1000 });
      tournamentGame.seats[0] = Seat.occupied(
        { id: "p1", name: "Alice" },
        Tournament.INITIAL_STACK,
      );
      tournamentGame.seats[1] = Seat.occupied(
        { id: "p2", name: "Bob" },
        Tournament.INITIAL_STACK,
      );
      tournamentGame.tournament.startTime = "2024-01-01T10:00:00.000Z";
      tournamentGame.button = 0;
    });

    afterEach(() => {
      HandHistory.clearRecorder(tournamentGame.id);
    });

    it("should record buyin_amount in OHH tournament_info", async () => {
      tournamentGame.handNumber++;
      HandHistory.startHand(tournamentGame);
      Actions.startHand(tournamentGame);
      drainGenerator(Actions.blinds(tournamentGame));
      drainGenerator(Actions.dealPreflop(tournamentGame));

      HandHistory.recordBlind(tournamentGame.id, "p2", "sb", 2500);
      HandHistory.recordBlind(tournamentGame.id, "p1", "bb", 5000);

      // Player 2 folds
      tournamentGame.seats[1].folded = true;
      HandHistory.recordAction(tournamentGame.id, "p2", "fold");

      const potResults = [
        {
          potAmount: 7500,
          winners: [0],
          winningHand: null,
          winningCards: null,
          awards: [{ seat: 0, amount: 7500 }],
        },
      ];

      await HandHistory.finalizeHand(tournamentGame, potResults);

      const hand = await HandHistory.getHand(
        tournamentGame.id,
        tournamentGame.handNumber,
      );

      assert.ok(hand.tournament, "should be marked as tournament hand");
      assert.ok(hand.tournament_info, "should have tournament_info");
      assert.equal(
        hand.tournament_info.buyin_amount,
        toDollars(1000),
        "buyin_amount should match tournament buy-in",
      );
    });
  });
});
