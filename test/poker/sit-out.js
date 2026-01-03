import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../src/poker/game.js";
import * as Seat from "../../src/poker/seat.js";
import * as Actions from "../../src/poker/actions.js";

describe("sit out", () => {
  let game;

  beforeEach(() => {
    game = Game.create({ seats: 6, blinds: { ante: 0, small: 25, big: 50 } });
    // Set up 3 players at seats 0, 2, 4
    game.seats[0] = Seat.occupied({ id: "player1" }, 1000);
    game.seats[2] = Seat.occupied({ id: "player2" }, 1000);
    game.seats[4] = Seat.occupied({ id: "player3" }, 1000);
    game.button = 0;
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

    it("should throw if not enough chips to post big blind", () => {
      game.seats[0].missedBigBlind = true;
      game.seats[0].stack = 25; // Less than big blind

      assert.throws(
        () => Actions.sitIn(game, { seat: 0 }),
        /not enough chips to post big blind/,
      );
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
      const generator = Actions.dealPreflop(game);
      while (!generator.next().done) {
        // Continue until done
      }

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
});
