import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as TournamentTick from "../../../src/backend/poker/tournament-tick.js";
import * as Tournament from "../../../src/shared/tournament.js";
import * as Seat from "../../../src/backend/poker/seat.js";

describe("tournament-tick", () => {
  let game;

  beforeEach(() => {
    game = Game.createTournament();
    // Add players
    game.seats[0] = Seat.occupied({ id: "player1" }, Tournament.INITIAL_STACK);
    game.seats[1] = Seat.occupied({ id: "player2" }, Tournament.INITIAL_STACK);
    // Simulate tournament started (first hand dealt)
    game.tournament.startTime = new Date().toISOString();
  });

  describe("tick", () => {
    it("should increment levelTicks during waiting phase", () => {
      game.hand.phase = "waiting";
      const initialTicks = game.tournament.levelTicks;

      TournamentTick.tick(game);

      assert.equal(game.tournament.levelTicks, initialTicks + 1);
    });

    it("should increment levelTicks during active hand (preflop)", () => {
      game.hand.phase = "preflop";
      const initialTicks = game.tournament.levelTicks;

      TournamentTick.tick(game);

      assert.equal(
        game.tournament.levelTicks,
        initialTicks + 1,
        "level timer should advance during preflop",
      );
    });

    it("should increment levelTicks during active hand (flop)", () => {
      game.hand.phase = "flop";
      const initialTicks = game.tournament.levelTicks;

      TournamentTick.tick(game);

      assert.equal(
        game.tournament.levelTicks,
        initialTicks + 1,
        "level timer should advance during flop",
      );
    });

    it("should increment levelTicks during active hand (turn)", () => {
      game.hand.phase = "turn";
      const initialTicks = game.tournament.levelTicks;

      TournamentTick.tick(game);

      assert.equal(
        game.tournament.levelTicks,
        initialTicks + 1,
        "level timer should advance during turn",
      );
    });

    it("should increment levelTicks during active hand (river)", () => {
      game.hand.phase = "river";
      const initialTicks = game.tournament.levelTicks;

      TournamentTick.tick(game);

      assert.equal(
        game.tournament.levelTicks,
        initialTicks + 1,
        "level timer should advance during river",
      );
    });

    it("should increment levelTicks during showdown", () => {
      game.hand.phase = "showdown";
      const initialTicks = game.tournament.levelTicks;

      TournamentTick.tick(game);

      assert.equal(
        game.tournament.levelTicks,
        initialTicks + 1,
        "level timer should advance during showdown",
      );
    });

    it("should trigger level change after LEVEL_DURATION_TICKS", () => {
      game.tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;
      game.hand.phase = "preflop";

      const result = TournamentTick.tick(game);

      assert.equal(result.levelChanged, true);
      assert.equal(game.tournament.level, 2);
      assert.equal(game.tournament.levelTicks, 0);
    });

    it("should trigger break after level 4", () => {
      game.tournament.level = Tournament.BREAK_AFTER_LEVEL;
      game.tournament.levelTicks = Tournament.LEVEL_DURATION_TICKS - 1;

      const result = TournamentTick.tick(game);

      assert.equal(result.breakStarted, true);
      assert.equal(game.tournament.onBreak, true);
    });

    it("should not increment levelTicks before tournament starts", () => {
      game.tournament.startTime = null;
      const initialTicks = game.tournament.levelTicks;

      TournamentTick.tick(game);

      assert.equal(
        game.tournament.levelTicks,
        initialTicks,
        "level timer should not advance before first hand starts",
      );
    });
  });

  describe("shouldTournamentTick", () => {
    it("should return true during waiting phase", () => {
      game.hand.phase = "waiting";
      assert.equal(TournamentTick.shouldTournamentTick(game), true);
    });

    it("should return true during active hand", () => {
      game.hand.phase = "preflop";
      assert.equal(
        TournamentTick.shouldTournamentTick(game),
        true,
        "tournament should tick during active hands",
      );
    });

    it("should return true during break", () => {
      game.tournament.onBreak = true;
      assert.equal(TournamentTick.shouldTournamentTick(game), true);
    });

    it("should return false for non-tournament games", () => {
      const cashGame = Game.create({ seats: 6 });
      assert.equal(TournamentTick.shouldTournamentTick(cashGame), false);
    });

    it("should return false before tournament starts (no startTime)", () => {
      game.tournament.startTime = null;
      assert.equal(
        TournamentTick.shouldTournamentTick(game),
        false,
        "tournament should not tick before first hand starts",
      );
    });
  });

  describe("getTimeToNextLevel", () => {
    it("should return remaining ticks until level change", () => {
      game.tournament.levelTicks = 100;
      const expected = Tournament.LEVEL_DURATION_TICKS - 100;

      assert.equal(TournamentTick.getTimeToNextLevel(game), expected);
    });

    it("should return remaining break ticks when on break", () => {
      game.tournament.onBreak = true;
      game.tournament.breakTicks = 50;
      const expected = Tournament.BREAK_DURATION_TICKS - 50;

      assert.equal(TournamentTick.getTimeToNextLevel(game), expected);
    });

    it("should return null for non-tournament games", () => {
      const cashGame = Game.create({ seats: 6 });
      assert.equal(TournamentTick.getTimeToNextLevel(cashGame), null);
    });
  });

  describe("winner reporting", () => {
    it("should report tournamentEnded when winner is already set", () => {
      game.tournament.winner = 0;

      const result = TournamentTick.tick(game);

      assert.equal(result.tournamentEnded, true);
    });

    it("should not report tournamentEnded when no winner yet", () => {
      const result = TournamentTick.tick(game);

      assert.equal(result.tournamentEnded, false);
      assert.equal(game.tournament.winner, null);
    });

    it("should not set winner (that is done by autoStartNextHand)", () => {
      // Even with only one player having chips, tick does not set winner
      game.seats[1].stack = 0;

      const result = TournamentTick.tick(game);

      assert.equal(
        game.tournament.winner,
        null,
        "tick should not detect winner - autoStartNextHand does that",
      );
      assert.equal(result.tournamentEnded, false);
    });
  });
});
