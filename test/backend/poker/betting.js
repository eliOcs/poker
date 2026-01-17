import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as Seat from "../../../src/backend/poker/seat.js";
import * as Betting from "../../../src/backend/poker/betting.js";
import * as Actions from "../../../src/backend/poker/actions.js";

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

  describe("all-in scenarios", () => {
    beforeEach(() => {
      // Set up heads-up game
      game.seats[4] = Seat.empty();
      game.button = 0;
    });

    it("should set actingSeat to -1 when starting round with all players all-in", () => {
      game.seats[0].allIn = true;
      game.seats[2].allIn = true;

      Betting.startBettingRound(game, "flop");

      // No one can act, so actingSeat should be -1
      assert.equal(game.hand.actingSeat, -1);
    });

    it("should set actingSeat to -1 after call makes everyone all-in", () => {
      // Player 1 has gone all-in with 500 bet
      game.seats[0].stack = 0;
      game.seats[0].bet = 500;
      game.seats[0].allIn = true;
      game.hand.currentBet = 500;
      game.hand.lastRaiser = 0;

      // Player 2 needs to act
      game.hand.actingSeat = 2;
      game.hand.phase = "preflop";

      // Player 2 calls, going all-in (has only 500 chips left)
      game.seats[2].stack = 500;
      Actions.call(game, { seat: 2 });

      // Both players are now all-in
      assert.equal(game.seats[2].allIn, true);
      assert.equal(game.seats[2].stack, 0);
      // No one can act anymore
      assert.equal(game.hand.actingSeat, -1);
    });

    it("should count 0 players who can act when both all-in", () => {
      game.seats[0].allIn = true;
      game.seats[2].allIn = true;

      assert.equal(Betting.countPlayersWhoCanAct(game), 0);
    });

    it("should still count active players when all-in", () => {
      game.seats[0].allIn = true;
      game.seats[2].allIn = true;

      // All-in players are still active (not folded)
      assert.equal(Betting.countActivePlayers(game), 2);
    });

    it("should auto-complete betting round when only one player can act and opponent is all-in", () => {
      // Scenario: heads-up, player at seat 0 went all-in and was called
      // Player at seat 2 has chips remaining but opponent can't respond to any bet
      game.seats[0].stack = 0;
      game.seats[0].allIn = true;
      game.seats[2].stack = 500; // Has chips remaining

      // Start flop betting round
      Betting.startBettingRound(game, "flop");

      // Bug: actingSeat is set to 2 (player with chips), forcing them to check
      // Expected: actingSeat should be -1 (auto-complete) since opponent can't respond
      assert.equal(
        game.hand.actingSeat,
        -1,
        "Betting round should auto-complete when opponent is all-in",
      );
    });
  });

  describe("advanceAction - betting round completion", () => {
    describe("postflop: all players check (no bet)", () => {
      beforeEach(() => {
        // Set up heads-up game for simpler testing
        game.seats[4] = Seat.empty();
        game.button = 0;
        // Seat 0 = button/SB, Seat 2 = BB
        // Postflop: first to act is seat 2 (first after button)
        Betting.startBettingRound(game, "flop");
      });

      it("should set lastRaiser to first actor on postflop", () => {
        // First actor is seat 2 (first active after button)
        assert.equal(game.hand.lastRaiser, 2);
        assert.equal(game.hand.actingSeat, 2);
      });

      it("should advance action when first player checks", () => {
        // Seat 2 checks
        Actions.check(game, { seat: 2 });
        // Action should move to seat 0
        assert.equal(game.hand.actingSeat, 0);
      });

      it("should end round when all players check", () => {
        // Seat 2 checks
        Actions.check(game, { seat: 2 });
        assert.equal(game.hand.actingSeat, 0);

        // Seat 0 checks - action should return to seat 2 (lastRaiser), ending round
        Actions.check(game, { seat: 0 });
        assert.equal(game.hand.actingSeat, -1);
      });
    });

    describe("preflop: BB checks after call", () => {
      beforeEach(() => {
        // Set up heads-up game
        game.seats[4] = Seat.empty();
        game.button = 0;
        // Seat 0 = button/SB, Seat 2 = BB

        // Post blinds
        game.seats[0].bet = 25;
        game.seats[0].stack -= 25;
        game.seats[2].bet = 50;
        game.seats[2].stack -= 50;
        game.hand.currentBet = 50;

        Betting.startBettingRound(game, "preflop");
      });

      it("should set lastRaiser to first actor (SB in heads-up) for preflop", () => {
        // In heads-up, first to act preflop is SB (button)
        // lastRaiser is set to first actor so BB gets their option
        assert.equal(game.hand.lastRaiser, 0);
      });

      it("should set first to act to SB (seat 0) in heads-up preflop", () => {
        // In heads-up, SB (button) acts first preflop
        assert.equal(game.hand.actingSeat, 0);
      });

      it("should end round when BB checks after SB calls", () => {
        // SB (seat 0) calls
        Actions.call(game, { seat: 0 });
        // Action should move to BB (seat 2)
        assert.equal(game.hand.actingSeat, 2);

        // BB (seat 2) checks - round should end (action returns to SB who is lastRaiser)
        Actions.check(game, { seat: 2 });
        assert.equal(game.hand.actingSeat, -1);
      });
    });

    describe("postflop: bet and call", () => {
      beforeEach(() => {
        // Set up heads-up game
        game.seats[4] = Seat.empty();
        game.button = 0;
        Betting.startBettingRound(game, "flop");
      });

      it("should end round when caller action returns to bettor", () => {
        // Seat 2 bets 100
        Actions.bet(game, { seat: 2, amount: 100 });
        assert.equal(game.hand.lastRaiser, 2);
        assert.equal(game.hand.actingSeat, 0);

        // Seat 0 calls - action returns to seat 2 (lastRaiser), ending round
        Actions.call(game, { seat: 0 });
        assert.equal(game.hand.actingSeat, -1);
      });
    });

    describe("postflop: check then bet", () => {
      beforeEach(() => {
        // Set up heads-up game
        game.seats[4] = Seat.empty();
        game.button = 0;
        Betting.startBettingRound(game, "flop");
      });

      it("should update lastRaiser when bet is made after check", () => {
        // Seat 2 checks
        Actions.check(game, { seat: 2 });
        assert.equal(game.hand.actingSeat, 0);

        // Seat 0 bets - lastRaiser should update
        Actions.bet(game, { seat: 0, amount: 100 });
        assert.equal(game.hand.lastRaiser, 0);
        assert.equal(game.hand.actingSeat, 2);
      });

      it("should end round when checker calls the bet", () => {
        // Seat 2 checks
        Actions.check(game, { seat: 2 });

        // Seat 0 bets
        Actions.bet(game, { seat: 0, amount: 100 });

        // Seat 2 calls - action returns to seat 0 (lastRaiser), ending round
        Actions.call(game, { seat: 2 });
        assert.equal(game.hand.actingSeat, -1);
      });
    });

    describe("3-player postflop betting", () => {
      beforeEach(() => {
        // Keep all 3 players: seats 0, 2, 4
        game.button = 0;
        Betting.startBettingRound(game, "flop");
      });

      it("should set first actor to seat 2 (first after button)", () => {
        assert.equal(game.hand.actingSeat, 2);
        assert.equal(game.hand.lastRaiser, 2);
      });

      it("should end round when all 3 players check", () => {
        // Seat 2 checks
        Actions.check(game, { seat: 2 });
        assert.equal(game.hand.actingSeat, 4);

        // Seat 4 checks
        Actions.check(game, { seat: 4 });
        assert.equal(game.hand.actingSeat, 0);

        // Seat 0 checks - action returns to seat 2 (lastRaiser), ending round
        Actions.check(game, { seat: 0 });
        assert.equal(game.hand.actingSeat, -1);
      });
    });
  });
});
