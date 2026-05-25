import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import playerView from "../../../src/backend/poker/player-view.js";
import * as Game from "../../../src/backend/poker/game.js";
import * as Seat from "../../../src/backend/poker/seat.js";
import { createHeadsUpGame } from "./test-helpers.js";

describe("disconnection handling", () => {
  let game;

  beforeEach(() => {
    game = createHeadsUpGame();
  });

  describe("seat disconnected property", () => {
    it("should initialize disconnected as false", () => {
      assert.equal(game.seats[0].disconnected, false);
      assert.equal(game.seats[2].disconnected, false);
    });

    it("should be able to mark seat as disconnected", () => {
      game.seats[0].disconnected = true;
      assert.equal(game.seats[0].disconnected, true);
      assert.equal(game.seats[2].disconnected, false);
    });
  });

  describe("game tick timer properties", () => {
    it("should initialize tickTimer as undefined", () => {
      assert.equal(game.tickTimer, null);
    });
  });

  describe("player view includes disconnected", () => {
    it("should include disconnected=false for connected player", () => {
      const view = playerView(game, { id: "player1" });
      assert.equal(view.seats[0].disconnected, false);
    });

    it("should include disconnected=true for disconnected player", () => {
      game.seats[0].disconnected = true;
      const view = playerView(game, { id: "player1" });
      assert.equal(view.seats[0].disconnected, true);
    });

    it("should show disconnected status to other players", () => {
      game.seats[0].disconnected = true;
      const view = playerView(game, { id: "player2" });
      assert.equal(view.seats[0].disconnected, true);
    });

    it("should show reconnected status to other players", () => {
      // Player disconnects
      game.seats[0].disconnected = true;
      let view = playerView(game, { id: "player2" });
      assert.equal(view.seats[0].disconnected, true);

      // Player reconnects
      game.seats[0].disconnected = false;
      view = playerView(game, { id: "player2" });
      assert.equal(view.seats[0].disconnected, false);
    });
  });

  describe("auto sit-out at end of hand", () => {
    it("should sit out disconnected players", () => {
      game.seats[0].disconnected = true;
      game.seats[2].disconnected = false;

      Game.sitOutDisconnectedPlayers(game);

      assert.equal(game.seats[0].sittingOut, true);
      assert.equal(game.seats[2].sittingOut, false);
    });

    it("should not change already sitting out players", () => {
      game.seats[0].disconnected = true;
      game.seats[0].sittingOut = true;

      Game.sitOutDisconnectedPlayers(game);

      assert.equal(game.seats[0].sittingOut, true);
    });

    it("should not affect connected players", () => {
      game.seats[0].disconnected = false;
      game.seats[2].disconnected = false;

      Game.sitOutDisconnectedPlayers(game);

      assert.equal(game.seats[0].sittingOut, false);
      assert.equal(game.seats[2].sittingOut, false);
    });

    it("should sit out disconnected MTT players", () => {
      const mttGame = Game.createMttTable({
        tournamentId: "mtt-1",
        tableName: "Table 1",
        startTime: "2026-05-22T20:00:00.000Z",
      });
      mttGame.seats[0] = Seat.occupied({ id: "player1" }, 1000);
      mttGame.seats[1] = Seat.occupied({ id: "player2" }, 1000);
      mttGame.seats[0].disconnected = true;

      Game.sitOutDisconnectedPlayers(mttGame);

      assert.equal(mttGame.seats[0].sittingOut, true);
      assert.equal(mttGame.seats[1].sittingOut, false);
    });

    it("should not finish a tournament while a sitting out player still has chips", () => {
      const tournamentGame = Game.createTournament();
      tournamentGame.seats[0] = Seat.occupied({ id: "player1" }, 1000);
      tournamentGame.seats[1] = Seat.occupied({ id: "player2" }, 1000, true);

      Game.autoStartNextHand(tournamentGame);

      assert.equal(tournamentGame.tournament.winner, null);
      assert.equal(tournamentGame.countdown, 5);
    });
  });
});
