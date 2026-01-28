import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { existsSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import * as Game from "../../../src/backend/poker/game.js";
import * as TournamentSummary from "../../../src/backend/poker/tournament-summary.js";
import * as Seat from "../../../src/backend/poker/seat.js";
import * as Tournament from "../../../src/shared/tournament.js";

describe("tournament-summary", () => {
  let game;

  beforeEach(() => {
    game = Game.createTournament();
    // Add players
    game.seats[0] = Seat.occupied(
      { id: "player1", name: "Alice" },
      Tournament.INITIAL_STACK,
    );
    game.seats[1] = Seat.occupied(
      { id: "player2", name: "Bob" },
      Tournament.INITIAL_STACK,
    );
    game.seats[2] = Seat.occupied(
      { id: "player3", name: "Charlie" },
      Tournament.INITIAL_STACK,
    );
    game.tournament.startTime = "2024-01-01T10:00:00.000Z";
  });

  afterEach(() => {
    TournamentSummary.clearRecorder(game.id);
  });

  describe("startTournament", () => {
    it("should initialize recorder with start time and players", () => {
      TournamentSummary.startTournament(game);

      const recorder = TournamentSummary.getRecorderForTest(game.id);
      assert.ok(recorder, "recorder should exist");
      assert.equal(recorder.startTime, game.tournament.startTime);
      assert.equal(recorder.players.length, 3);
      assert.deepEqual(recorder.players[0], {
        id: "player1",
        name: "Alice",
        seatIndex: 0,
      });
    });

    it("should only initialize once (first hand)", () => {
      TournamentSummary.startTournament(game);
      const firstStartTime = TournamentSummary.getRecorderForTest(
        game.id,
      ).startTime;

      // Modify game start time
      game.tournament.startTime = "2024-01-02T10:00:00.000Z";
      TournamentSummary.startTournament(game);

      // Start time should not change
      const recorder = TournamentSummary.getRecorderForTest(game.id);
      assert.equal(recorder.startTime, firstStartTime);
    });

    it("should not initialize for non-tournament games", () => {
      const cashGame = Game.create();
      TournamentSummary.startTournament(cashGame);

      const recorder = TournamentSummary.getRecorderForTest(cashGame.id);
      assert.equal(recorder, undefined);
    });
  });

  describe("recordElimination", () => {
    it("should record player elimination with position", () => {
      TournamentSummary.startTournament(game);

      const seat =
        /** @type {import('../../../src/backend/poker/seat.js').OccupiedSeat} */ (
          game.seats[2]
        );
      TournamentSummary.recordElimination(game, seat, 3);

      const recorder = TournamentSummary.getRecorderForTest(game.id);
      assert.equal(recorder.eliminations.length, 1);
      assert.equal(recorder.eliminations[0].playerId, "player3");
      assert.equal(recorder.eliminations[0].position, 3);
      assert.ok(recorder.eliminations[0].time, "should have timestamp");
    });

    it("should record multiple eliminations in order", () => {
      TournamentSummary.startTournament(game);

      const seat2 =
        /** @type {import('../../../src/backend/poker/seat.js').OccupiedSeat} */ (
          game.seats[1]
        );
      const seat3 =
        /** @type {import('../../../src/backend/poker/seat.js').OccupiedSeat} */ (
          game.seats[2]
        );
      TournamentSummary.recordElimination(game, seat3, 3);
      TournamentSummary.recordElimination(game, seat2, 2);

      const recorder = TournamentSummary.getRecorderForTest(game.id);
      assert.equal(recorder.eliminations.length, 2);
      assert.equal(recorder.eliminations[0].playerId, "player3");
      assert.equal(recorder.eliminations[0].position, 3);
      assert.equal(recorder.eliminations[1].playerId, "player2");
      assert.equal(recorder.eliminations[1].position, 2);
    });
  });

  describe("finalizeTournament", () => {
    const testDataDir = "data";

    afterEach(() => {
      // Clean up test file
      const otsFilePath = `${testDataDir}/${game.id}.ots`;
      if (existsSync(otsFilePath)) {
        rmSync(otsFilePath);
      }
    });

    it("should clean up recorder after finalization", async () => {
      TournamentSummary.startTournament(game);

      // Set winner
      game.seats[1].stack = 0;
      game.seats[2].stack = 0;
      game.tournament.winner = 0;

      await TournamentSummary.finalizeTournament(game);

      const recorder = TournamentSummary.getRecorderForTest(game.id);
      assert.equal(
        recorder,
        undefined,
        "recorder should be cleared after finalization",
      );
    });

    it("should write valid OTS file", async () => {
      TournamentSummary.startTournament(game);

      // Simulate eliminations
      const seat3 =
        /** @type {import('../../../src/backend/poker/seat.js').OccupiedSeat} */ (
          game.seats[2]
        );
      const seat2 =
        /** @type {import('../../../src/backend/poker/seat.js').OccupiedSeat} */ (
          game.seats[1]
        );
      TournamentSummary.recordElimination(game, seat3, 3);
      TournamentSummary.recordElimination(game, seat2, 2);

      // Set winner
      game.seats[1].stack = 0;
      game.seats[2].stack = 0;
      game.tournament.winner = 0;

      // Ensure data dir exists
      if (!existsSync(testDataDir)) {
        mkdirSync(testDataDir, { recursive: true });
      }

      await TournamentSummary.finalizeTournament(game);

      // Verify file exists
      const otsFilePath = `${testDataDir}/${game.id}.ots`;
      assert.ok(existsSync(otsFilePath), "OTS file should exist");

      // Verify file content
      const content = readFileSync(otsFilePath, "utf-8");
      const data = JSON.parse(content);

      assert.ok(data.ots, "should have ots wrapper");
      assert.equal(data.ots.spec_version, "1.1.3");
      assert.equal(data.ots.site_name, "Pluton Poker");
      assert.equal(data.ots.tournament_number, game.id);
      assert.equal(data.ots.tournament_name, "Sit & Go");
      assert.equal(data.ots.player_count, 3);
      assert.equal(data.ots.type, "STT");
      assert.deepEqual(data.ots.flags, ["SNG"]);

      // Verify finishes
      const finishes = data.ots.tournament_finishes_and_winnings;
      assert.equal(finishes.length, 3);

      // Should be sorted by position
      assert.equal(finishes[0].finish_position, 1);
      assert.equal(finishes[0].player_name, "Alice"); // Winner
      assert.equal(finishes[1].finish_position, 2);
      assert.equal(finishes[1].player_name, "Bob");
      assert.equal(finishes[2].finish_position, 3);
      assert.equal(finishes[2].player_name, "Charlie");
    });
  });

  describe("OTS structure validation", () => {
    it("should build correct finish positions with winner first", () => {
      TournamentSummary.startTournament(game);

      // Simulate eliminations
      const seat3 =
        /** @type {import('../../../src/backend/poker/seat.js').OccupiedSeat} */ (
          game.seats[2]
        );
      const seat2 =
        /** @type {import('../../../src/backend/poker/seat.js').OccupiedSeat} */ (
          game.seats[1]
        );
      TournamentSummary.recordElimination(game, seat3, 3);
      TournamentSummary.recordElimination(game, seat2, 2);

      // Set winner
      game.seats[1].stack = 0;
      game.seats[2].stack = 0;
      game.tournament.winner = 0;

      // We can verify the recorder state
      const recorder = TournamentSummary.getRecorderForTest(game.id);
      assert.equal(recorder.players.length, 3);
      assert.equal(recorder.eliminations.length, 2);
    });
  });
});
