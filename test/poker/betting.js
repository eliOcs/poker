import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../src/poker/game.js";
import * as Seat from "../../src/poker/seat.js";
import * as Betting from "../../src/poker/betting.js";

describe("betting", () => {
  let game;

  beforeEach(() => {
    game = Game.create({ seats: 6, blinds: { ante: 0, small: 25, big: 50 } });
    // Set up 3 players at seats 0, 2, 4
    game.seats[0] = Seat.occupied({ id: "player1" }, 1000);
    game.seats[2] = Seat.occupied({ id: "player2" }, 1000);
    game.seats[4] = Seat.occupied({ id: "player3" }, 1000);
    game.button = 0;
  });

  describe("countActivePlayers", () => {
    it("should count non-folded players", () => {
      assert.equal(Betting.countActivePlayers(game), 3);
    });

    it("should not count folded players", () => {
      game.seats[0].folded = true;
      assert.equal(Betting.countActivePlayers(game), 2);
    });

    it("should not count sitting out players", () => {
      game.seats[0].sittingOut = true;
      assert.equal(Betting.countActivePlayers(game), 2);
    });
  });

  describe("countPlayersWhoCanAct", () => {
    it("should count players who can act", () => {
      assert.equal(Betting.countPlayersWhoCanAct(game), 3);
    });

    it("should not count all-in players", () => {
      game.seats[0].allIn = true;
      assert.equal(Betting.countPlayersWhoCanAct(game), 2);
    });

    it("should not count folded players", () => {
      game.seats[0].folded = true;
      assert.equal(Betting.countPlayersWhoCanAct(game), 2);
    });
  });

  describe("getSmallBlindSeat", () => {
    it("should return first active seat after button", () => {
      game.button = 0;
      assert.equal(Betting.getSmallBlindSeat(game), 2);
    });

    it("should wrap around", () => {
      game.button = 4;
      assert.equal(Betting.getSmallBlindSeat(game), 0);
    });

    it("should handle heads-up (button is small blind)", () => {
      // Remove player at seat 4
      game.seats[4] = Seat.empty();
      game.button = 0;
      // In heads-up, button posts small blind
      assert.equal(Betting.getSmallBlindSeat(game), 0);
    });
  });

  describe("getBigBlindSeat", () => {
    it("should return seat after small blind", () => {
      game.button = 0;
      assert.equal(Betting.getBigBlindSeat(game), 4);
    });
  });

  describe("getFirstToAct", () => {
    it("should return UTG for preflop (after big blind)", () => {
      game.button = 0;
      // Small blind at 2, big blind at 4, UTG at 0
      assert.equal(Betting.getFirstToAct(game, "preflop"), 0);
    });

    it("should return first active after button for postflop", () => {
      game.button = 0;
      assert.equal(Betting.getFirstToAct(game, "flop"), 2);
    });
  });

  describe("getMinBet", () => {
    it("should return big blind", () => {
      assert.equal(Betting.getMinBet(game), 50);
    });
  });

  describe("getMinRaise", () => {
    it("should return current bet plus last raise size", () => {
      game.hand.currentBet = 100;
      game.hand.lastRaiseSize = 50;
      assert.equal(Betting.getMinRaise(game), 150);
    });

    it("should use big blind as minimum raise size", () => {
      game.hand.currentBet = 50;
      game.hand.lastRaiseSize = 0;
      assert.equal(Betting.getMinRaise(game), 100);
    });
  });

  describe("getCallAmount", () => {
    it("should return difference between current bet and player bet", () => {
      game.hand.currentBet = 100;
      game.seats[0].bet = 50;
      assert.equal(Betting.getCallAmount(game, 0), 50);
    });

    it("should cap at player stack", () => {
      game.hand.currentBet = 2000;
      game.seats[0].bet = 0;
      game.seats[0].stack = 1000;
      assert.equal(Betting.getCallAmount(game, 0), 1000);
    });
  });

  describe("isBettingRoundComplete", () => {
    beforeEach(() => {
      Betting.startBettingRound(game, "flop");
    });

    it("should return true when only one player left", () => {
      game.seats[0].folded = true;
      game.seats[2].folded = true;
      assert.equal(Betting.isBettingRoundComplete(game), true);
    });

    it("should return true when all remaining players are all-in", () => {
      game.seats[0].allIn = true;
      game.seats[2].allIn = true;
      game.seats[4].allIn = true;
      assert.equal(Betting.isBettingRoundComplete(game), true);
    });

    it("should return false when bets are not equal", () => {
      game.seats[0].bet = 50;
      game.seats[2].bet = 100;
      game.seats[4].bet = 50;
      game.hand.currentBet = 100;
      assert.equal(Betting.isBettingRoundComplete(game), false);
    });
  });

  describe("startBettingRound", () => {
    it("should set phase", () => {
      Betting.startBettingRound(game, "flop");
      assert.equal(game.hand.phase, "flop");
    });

    it("should reset bets for postflop rounds", () => {
      game.seats[0].bet = 50;
      game.seats[2].bet = 100;
      Betting.startBettingRound(game, "flop");
      assert.equal(game.seats[0].bet, 0);
      assert.equal(game.seats[2].bet, 0);
    });

    it("should set first player to act", () => {
      Betting.startBettingRound(game, "flop");
      assert.equal(game.hand.actingSeat, 2);
    });
  });

  describe("collectBets", () => {
    it("should add bets to pot", () => {
      game.seats[0].bet = 50;
      game.seats[2].bet = 100;
      game.seats[4].bet = 100;
      game.hand.pot = 0;

      Betting.collectBets(game);

      assert.equal(game.hand.pot, 250);
    });

    it("should update totalInvested", () => {
      game.seats[0].bet = 50;
      game.seats[0].totalInvested = 25;

      Betting.collectBets(game);

      assert.equal(game.seats[0].totalInvested, 75);
    });

    it("should reset bets to 0", () => {
      game.seats[0].bet = 50;
      game.seats[2].bet = 100;

      Betting.collectBets(game);

      assert.equal(game.seats[0].bet, 0);
      assert.equal(game.seats[2].bet, 0);
    });

    it("should reset current bet", () => {
      game.hand.currentBet = 100;

      Betting.collectBets(game);

      assert.equal(game.hand.currentBet, 0);
    });
  });
});
