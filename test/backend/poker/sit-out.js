import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as Seat from "../../../src/backend/poker/seat.js";
import * as Actions from "../../../src/backend/poker/actions.js";
import { createGameWithPlayers, drainGenerator } from "./test-helpers.js";

describe("sit out", () => {
  let game;

  beforeEach(() => {
    game = createGameWithPlayers();
    game.hand.phase = "waiting";
  });

  describe("sitOut action", () => {
    it("should set sittingOut to true", () => {
      Actions.sitOut(game, { seat: 0 });
      assert.equal(game.seats[0].sittingOut, true);
    });

    it("should throw if seat is empty", () => {
      assert.throws(() => Actions.sitOut(game, { seat: 1 }), /seat is empty/);
    });

    it("should throw if hand is in progress", () => {
      game.hand.phase = "preflop";
      assert.throws(
        () => Actions.sitOut(game, { seat: 0 }),
        /only sit out between hands/,
      );
    });

    it("should throw if already sitting out", () => {
      game.seats[0].sittingOut = true;
      assert.throws(
        () => Actions.sitOut(game, { seat: 0 }),
        /already sitting out/,
      );
    });
  });

  describe("sitIn action", () => {
    beforeEach(() => {
      game.seats[0].sittingOut = true;
    });

    it("should set sittingOut to false", () => {
      Actions.sitIn(game, { seat: 0 });
      assert.equal(game.seats[0].sittingOut, false);
    });

    it("should throw if seat is empty", () => {
      assert.throws(() => Actions.sitIn(game, { seat: 1 }), /seat is empty/);
    });

    it("should throw if hand is in progress", () => {
      game.hand.phase = "preflop";
      assert.throws(
        () => Actions.sitIn(game, { seat: 0 }),
        /only sit in between hands/,
      );
    });

    it("should throw if not sitting out", () => {
      game.seats[0].sittingOut = false;
      assert.throws(() => Actions.sitIn(game, { seat: 0 }), /not sitting out/);
    });

    it("should post big blind if missedBigBlind is true", () => {
      game.seats[0].missedBigBlind = true;
      const stackBefore = game.seats[0].stack;

      Actions.sitIn(game, { seat: 0 });

      assert.equal(game.seats[0].stack, stackBefore - game.blinds.big);
      assert.equal(game.seats[0].bet, game.blinds.big);
      assert.equal(game.seats[0].missedBigBlind, false);
    });

    it("should go all-in if not enough chips to post big blind", () => {
      game.seats[0].missedBigBlind = true;
      game.seats[0].stack = 25; // Less than big blind of 50

      Actions.sitIn(game, { seat: 0 });

      // Player goes all-in with what they have
      assert.equal(game.seats[0].stack, 0);
      assert.equal(game.seats[0].bet, 25);
      assert.equal(game.seats[0].sittingOut, false);
      assert.equal(game.seats[0].missedBigBlind, false);
    });

    it("should not post big blind if missedBigBlind is false", () => {
      game.seats[0].missedBigBlind = false;
      const stackBefore = game.seats[0].stack;

      Actions.sitIn(game, { seat: 0 });

      assert.equal(game.seats[0].stack, stackBefore);
      assert.equal(game.seats[0].bet, 0);
    });
  });

  describe("countPlayersWithChips", () => {
    it("should not count sitting out players", () => {
      assert.equal(Actions.countPlayersWithChips(game), 3);

      game.seats[0].sittingOut = true;
      assert.equal(Actions.countPlayersWithChips(game), 2);
    });

    it("should not count players with no chips", () => {
      game.seats[0].stack = 0;
      assert.equal(Actions.countPlayersWithChips(game), 2);
    });
  });

  describe("moveButton", () => {
    it("should skip sitting out players", () => {
      game.button = 0;
      game.seats[2].sittingOut = true;

      Actions.moveButton(game);

      assert.equal(game.button, 4); // Skipped seat 2
    });

    it("should skip empty seats", () => {
      game.button = 0;

      Actions.moveButton(game);

      assert.equal(game.button, 2); // Skipped seat 1 (empty)
    });
  });

  describe("dealPreflop", () => {
    beforeEach(() => {
      game.hand.phase = "preflop";
      game.deck = Game.create().deck;
    });

    it("should not deal to sitting out players", () => {
      game.seats[0].sittingOut = true;

      // Run the generator to completion
      drainGenerator(Actions.dealPreflop(game));

      // Sitting out player should have no cards
      assert.deepEqual(game.seats[0].cards, []);
      // Other players should have 2 cards each
      assert.equal(game.seats[2].cards.length, 2);
      assert.equal(game.seats[4].cards.length, 2);
    });
  });

  describe("resetForNewHand", () => {
    it("should set missedBigBlind to true if sitting out", () => {
      game.seats[0].sittingOut = true;
      game.seats[0].missedBigBlind = false;

      Seat.resetForNewHand(game.seats[0]);

      assert.equal(game.seats[0].missedBigBlind, true);
    });

    it("should not change missedBigBlind if not sitting out", () => {
      game.seats[0].sittingOut = false;
      game.seats[0].missedBigBlind = false;

      Seat.resetForNewHand(game.seats[0]);

      assert.equal(game.seats[0].missedBigBlind, false);
    });
  });

  describe("isActive", () => {
    it("should return false for sitting out players", () => {
      assert.equal(Seat.isActive(game.seats[0]), true);

      game.seats[0].sittingOut = true;
      assert.equal(Seat.isActive(game.seats[0]), false);
    });

    it("should return false for folded players", () => {
      game.seats[0].folded = true;
      assert.equal(Seat.isActive(game.seats[0]), false);
    });

    it("should return false for empty seats", () => {
      assert.equal(Seat.isActive(game.seats[1]), false);
    });
  });

  describe("auto sit-out on zero stack", () => {
    it("should automatically sit out player with 0 stack at end of hand", () => {
      // Player loses all-in and has 0 stack
      game.seats[0].stack = 0;

      Actions.endHand(game);

      assert.equal(
        game.seats[0].sittingOut,
        true,
        "Player with 0 stack should be sat out automatically",
      );
    });

    it("should not sit out player with chips remaining", () => {
      game.seats[0].stack = 500;

      Actions.endHand(game);

      assert.equal(game.seats[0].sittingOut, false);
    });
  });

  describe("leave action", () => {
    beforeEach(() => {
      game.seats[0].sittingOut = true;
    });

    it("should make seat empty when leaving", () => {
      Actions.leave(game, { seat: 0 });

      assert.equal(game.seats[0].empty, true);
    });

    it("should throw if seat is already empty", () => {
      assert.throws(() => Actions.leave(game, { seat: 1 }), /seat is empty/);
    });

    it("should throw if not sitting out", () => {
      game.seats[2].sittingOut = false;

      assert.throws(
        () => Actions.leave(game, { seat: 2 }),
        /must be sitting out to leave/,
      );
    });

    it("should allow player to sit again at any empty seat after leaving", () => {
      const player1 = game.seats[0].player;

      Actions.leave(game, { seat: 0 });

      // Player should be able to sit at any empty seat
      Actions.sit(game, { seat: 0, player: player1 });
      assert.equal(game.seats[0].empty, false);
      assert.equal(game.seats[0].player, player1);
    });
  });

  describe("leave action in tournaments", () => {
    let tournamentGame;

    beforeEach(() => {
      tournamentGame = Game.createTournament();
      tournamentGame.seats[0] = Seat.occupied({ id: "player1" }, 1000);
      tournamentGame.seats[2] = Seat.occupied({ id: "player2" }, 1000);
      tournamentGame.seats[4] = Seat.occupied({ id: "player3" }, 1000);
      tournamentGame.hand.phase = "waiting";
    });

    it("should allow leaving before tournament starts", () => {
      assert.equal(tournamentGame.handNumber, 0);

      tournamentGame.seats[0].sittingOut = true;
      Actions.leave(tournamentGame, { seat: 0 });

      assert.equal(tournamentGame.seats[0].empty, true);
    });

    it("should throw when leaving during an active tournament", () => {
      tournamentGame.handNumber = 5;
      tournamentGame.seats[0].sittingOut = true;

      assert.throws(
        () => Actions.leave(tournamentGame, { seat: 0 }),
        /cannot leave during a tournament/,
      );
    });
  });
});
