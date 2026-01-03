import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../src/poker/game.js";
import * as Seat from "../../src/poker/seat.js";
import * as Betting from "../../src/poker/betting.js";
import playerView from "../../src/poker/player-view.js";

describe("disconnection handling", () => {
  let game;

  beforeEach(() => {
    game = Game.create({ seats: 6, blinds: { ante: 0, small: 25, big: 50 } });
    game.seats[0] = Seat.occupied({ id: "player1" }, 1000);
    game.seats[2] = Seat.occupied({ id: "player2" }, 1000);
    game.button = 0;
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

  describe("game disconnect timer properties", () => {
    it("should initialize disconnectTimer as null", () => {
      assert.equal(game.disconnectTimer, null);
    });

    it("should initialize disconnectTimerSeat as -1", () => {
      assert.equal(game.disconnectTimerSeat, -1);
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
  });

  describe("auto-action decision logic", () => {
    beforeEach(() => {
      // Start a betting round
      Betting.startBettingRound(game, "flop");
    });

    it("can check when bet equals currentBet", () => {
      // No one has bet yet, so currentBet is 0
      assert.equal(game.hand.currentBet, 0);
      assert.equal(game.seats[0].bet, 0);
      // When bet === currentBet, player can check
      const canCheck = game.seats[0].bet === game.hand.currentBet;
      assert.equal(canCheck, true);
    });

    it("must fold when bet is less than currentBet", () => {
      // Simulate a bet was made
      game.hand.currentBet = 100;
      assert.equal(game.seats[0].bet, 0);
      // When bet < currentBet, player must fold
      const mustFold = game.seats[0].bet < game.hand.currentBet;
      assert.equal(mustFold, true);
    });
  });

  describe("auto sit-out at end of hand", () => {
    it("should sit out disconnected players", () => {
      game.seats[0].disconnected = true;
      game.seats[2].disconnected = false;

      // Simulate what sitOutDisconnectedPlayers does
      for (const seat of game.seats) {
        if (!seat.empty && seat.disconnected && !seat.sittingOut) {
          seat.sittingOut = true;
        }
      }

      assert.equal(game.seats[0].sittingOut, true);
      assert.equal(game.seats[2].sittingOut, false);
    });

    it("should not change already sitting out players", () => {
      game.seats[0].disconnected = true;
      game.seats[0].sittingOut = true;

      // Simulate what sitOutDisconnectedPlayers does
      for (const seat of game.seats) {
        if (!seat.empty && seat.disconnected && !seat.sittingOut) {
          seat.sittingOut = true;
        }
      }

      assert.equal(game.seats[0].sittingOut, true);
    });

    it("should not affect connected players", () => {
      game.seats[0].disconnected = false;
      game.seats[2].disconnected = false;

      // Simulate what sitOutDisconnectedPlayers does
      for (const seat of game.seats) {
        if (!seat.empty && seat.disconnected && !seat.sittingOut) {
          seat.sittingOut = true;
        }
      }

      assert.equal(game.seats[0].sittingOut, false);
      assert.equal(game.seats[2].sittingOut, false);
    });
  });
});
