import assert from "assert";
import tap from "tap";
import deck from "../../src/poker/deck.js";
import game from "../../src/poker/game.js";

const { describe, it } = tap.mocha;

describe("game", function () {
  describe("deal", function () {
    describe("preflop", function () {
      it("should deal 2 cards face down to players", function () {
        const preflopGame = game.deal.preflop({
          deck: deck.create(),
          seats: [{}, {}],
        });
        for (const seat of preflopGame.seats) {
          assert.equal(seat.holeCards.length, 2);
          game.deck.validateCard(seat.holeCards[0]);
          assert.equal(seat.holeCards[0].face, "down");
          game.deck.validateCard(seat.holeCards[1]);
          assert.equal(seat.holeCards[1].face, "down");
        }
      });
    });

    describe("flop", function () {
      it("should deal 3 face up community cards", function () {
        const gameOnFlop = game.deal.flop({
          deck: deck.create(),
          communityCards: [],
        });
        assert.equal(gameOnFlop.communityCards.length, 3);
        for (const flopCard of gameOnFlop.communityCards) {
          game.deck.validateCard(flopCard);
          assert.equal(flopCard.face, "up");
        }
      });
    });

    describe("turn", function () {
      it("should deal 1 face up community card", function () {
        const gameOnTurn = game.deal.turn({
          deck: deck.create(),
          communityCards: [],
        });
        assert.equal(gameOnTurn.communityCards.length, 1);
        const [turnCard] = gameOnTurn.communityCards;
        game.deck.validateCard(turnCard);
        assert.equal(turnCard.face, "up");
      });
    });

    describe("river", function () {
      it("should deal 1 face up community card", function () {
        const gameOnRiver = game.deal.river({
          deck: deck.create(),
          communityCards: [],
        });
        assert.equal(gameOnRiver.communityCards.length, 1);
        const [riverCard] = gameOnRiver.communityCards;
        game.deck.validateCard(riverCard);
        assert.equal(riverCard.face, "up");
      });
    });
  });

  describe("buyin", function () {});

  describe("rebuy");

  describe("bet");

  describe("call");

  describe("check");

  describe("seat out");

  describe("tick");

  describe("turn", function () {
    it("player in the inmmediate left of the button is the first to act", function () {
      assert.equal(
        game.turn.next({
          seats: [{}, { button: true }, {}, {}],
        }),
        2
      );
    });

    it("should skip players which are all in", function () {
      assert.equal(
        game.turn.next({
          seats: [
            { bet: 5 },
            { button: true, bet: 5 },
            { bet: 5, allin: true },
            { bet: 10 },
            { allin: true },
          ],
        }),
        0
      );
    });

    it("should skip players which have folded", function () {
      assert.equal(
        game.turn.next({
          seats: [{}, { button: true }, { folded: true }, {}],
        }),
        3
      );
    });

    it("should skip empty seats", function () {
      assert.equal(
        game.turn.next({
          seats: [{ button: true }, { bet: 10 }, "empty", {}],
        }),
        3
      );
    });

    it("should skip players that already have bet", function () {
      assert.equal(
        game.turn.next({
          seats: [{ button: true }, { bet: 10 }, { bet: 10 }],
        }),
        0
      );
    });

    it("should return player", function () {
      assert.equal(
        game.turn.next({
          seats: [
            { bet: 10 },
            { button: true, bet: 10 },
            { bet: 20 },
            { bet: 40 },
            { bet: 40 },
          ],
        }),
        0
      );
    });

    it("should return -1 if all players called the largest bet", function () {
      game.turn.next(
        {
          seats: [{ button: true, bet: 10 }, { bet: 10 }, { bet: 10 }],
        },
        0
      );
    });
  });

  describe("betting round", function () {
    describe("antes", function () {
      it("all players should bet ante", function () {
        let gameOnAntes = game.bettingRound.antes.next({
          pot: 0,
          blinds: { ante: 10 },
          seats: [{ button: true, stack: 100 }, { stack: 100 }],
        });
        assert.equal(gameOnAntes.seats[1].bet, 10);
        assert.equal(gameOnAntes.seats[1].stack, 90);
        gameOnAntes = game.bettingRound.antes.next(gameOnAntes);
        assert.equal(gameOnAntes.seats[0].bet, 10);
        assert.equal(gameOnAntes.seats[0].stack, 90);
        gameOnAntes = game.bettingRound.antes.next(gameOnAntes);
        assert.equal(gameOnAntes.pot, 20);
        assert.equal(gameOnAntes.seats[0].hasOwnProperty("bet"), false);
        assert.equal(gameOnAntes.seats[1].hasOwnProperty("bet"), false);
      });
    });

    describe("preflop", function () {
      it("first player left of button should bet small blind", function () {
        const gameOnPreflop = game.bettingRound.preflop.next({
          pot: 0,
          blinds: { small: 5, big: 10 },
          seats: [{ button: true, stack: 100 }, { stack: 100 }],
        });
        assert.equal(gameOnPreflop.seats[1].bet, 5);
        assert.equal(gameOnPreflop.seats[1].stack, 95);
      });

      it("second player left of button should bet big blind", function () {
        const gameOnPreflop = game.bettingRound.preflop.next({
          pot: 0,
          blinds: { small: 5, big: 10 },
          seats: [
            { button: true, stack: 100 },
            { stack: 95, bet: 5 },
          ],
        });
        assert.equal(gameOnPreflop.seats[0].bet, 10);
        assert.equal(gameOnPreflop.seats[0].stack, 90);
      });
    });

    describe("unraised pot", function () {
      it("should be able to fold");

      it("should be able to check");

      it("should be able to raise");
    });

    describe("raised pot", function () {
      it("should be able to fold");

      it("should be able to call");

      it("should be able to raise");
    });

    describe("check", function () {
      it("should move action to next player");
    });

    describe("call", function () {
      it("should match the current bet");

      it("should move action to next player");
    });

    describe("fold", function () {
      it("should put cards in the muck");

      it("should move action to next player");
    });

    describe("raise", function () {
      it("should move chips player stack to board");
    });

    describe("end", function () {
      it("should move player bets to the pot");
    });

    it("should end when last bet has been called by all players");

    it("should end when all players have checked");
  });
});
