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

    it("should trigger a level change after the Sit & Go level duration", () => {
      game.tournament.levelTicks = game.tournament.levelDurationTicks - 1;
      game.hand.phase = "preflop";

      const result = TournamentTick.tick(game);

      assert.equal(result.levelChanged, true);
      assert.equal(result.completedLevel, 1);
      assert.equal(game.tournament.level, 2);
      assert.equal(game.tournament.levelTicks, 0);
    });

    it("should trigger a break after every four levels", () => {
      assert.deepEqual(game.tournament.breakAfterLevels.slice(0, 2), [4, 8]);

      for (const level of game.tournament.breakAfterLevels.slice(0, 2)) {
        game.tournament.level = level;
        game.tournament.levelTicks = game.tournament.levelDurationTicks - 1;
        game.tournament.onBreak = false;
        game.hand.phase = "waiting";

        const result = TournamentTick.tick(game);

        assert.equal(result.breakStarted, true);
        assert.equal(result.completedLevel, level);
        assert.equal(game.tournament.onBreak, true);
        assert.equal(game.tournament.pendingBreak, false);
      }
    });

    it("should set pendingBreak when level 4 ends during active hand", () => {
      game.tournament.level = game.tournament.breakAfterLevels[0];
      game.tournament.levelTicks = game.tournament.levelDurationTicks - 1;
      game.hand.phase = "flop"; // Hand in progress

      const result = TournamentTick.tick(game);

      assert.equal(result.breakStarted, false, "break should not start yet");
      assert.equal(result.completedLevel, game.tournament.breakAfterLevels[0]);
      assert.equal(game.tournament.onBreak, false, "should not be on break");
      assert.equal(
        game.tournament.pendingBreak,
        true,
        "break should be pending",
      );
    });

    it("should advance after a break without completing another playing level", () => {
      game.tournament.level = game.tournament.breakAfterLevels[0];
      game.tournament.onBreak = true;
      game.tournament.breakTicks = game.tournament.breakDurationTicks - 1;

      const result = TournamentTick.tick(game);

      assert.equal(result.breakEnded, true);
      assert.equal(result.completedLevel, undefined);
      assert.equal(
        game.tournament.level,
        game.tournament.breakAfterLevels[0] + 1,
      );
    });

    it("should report completion of the maximum playing level", () => {
      const maxLevel = game.tournament.blindLevels.length;
      game.tournament.level = maxLevel;
      game.tournament.levelTicks = game.tournament.levelDurationTicks - 1;

      const result = TournamentTick.tick(game);

      assert.equal(result.completedLevel, maxLevel);
      assert.equal(game.tournament.level, maxLevel);
      assert.equal(game.tournament.levelTicks, 0);
    });

    it("rejects a current level missing from a custom schedule", () => {
      game.tournament.blindLevels = game.tournament.blindLevels.slice(0, 1);
      game.tournament.level = 2;
      game.tournament.levelTicks = game.tournament.levelDurationTicks - 1;

      assert.throws(
        () => TournamentTick.tick(game),
        /blind schedule has no level 2/,
      );
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
      const expected = game.tournament.levelDurationTicks - 100;

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

  describe("startPendingBreak", () => {
    it("should start break when pendingBreak is true", () => {
      game.tournament.pendingBreak = true;

      const result = TournamentTick.startPendingBreak(game);

      assert.equal(result.breakStarted, true);
      assert.equal(game.tournament.onBreak, true);
      assert.equal(game.tournament.pendingBreak, false);
      assert.equal(game.tournament.breakTicks, 0);
    });

    it("should not start break when pendingBreak is false", () => {
      game.tournament.pendingBreak = false;

      const result = TournamentTick.startPendingBreak(game);

      assert.equal(result.breakStarted, false);
      assert.equal(game.tournament.onBreak, false);
    });

    it("should return empty result for non-tournament games", () => {
      const cashGame = Game.create({ seats: 6 });

      const result = TournamentTick.startPendingBreak(cashGame);

      assert.equal(result.breakStarted, false);
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

describe("Sit & Go blind schedule", () => {
  it("uses duration and table size to generate the schedule", () => {
    const short = Game.createTournament({ seats: 6, durationMinutes: 60 });
    const long = Game.createTournament({ seats: 6, durationMinutes: 180 });
    const headsUp = Game.createTournament({ seats: 2, durationMinutes: 120 });
    const fullRing = Game.createTournament({ seats: 9, durationMinutes: 120 });

    assert.equal(short.tournament.durationMinutes, 60);
    assert.equal(
      short.tournament.levelDurationTicks,
      Tournament.SITNGO_LEVEL_DURATION_TICKS,
    );
    assert.ok(
      short.tournament.blindLevels[2].big > long.tournament.blindLevels[2].big,
      "shorter tournaments should increase blinds faster",
    );
    assert.ok(
      fullRing.tournament.blindLevels.at(-4).big >
        headsUp.tournament.blindLevels.at(-4).big,
      "larger tables should target a larger finishing big blind",
    );
  });
});
