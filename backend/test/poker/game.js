import assert from "assert";
import tap from "tap";
import deck from "../../src/poker/deck.js";
import game from "../../src/poker/game.js";

const { describe, it } = tap.mocha;

describe("game", function () {
  describe("deal", function () {
    describe("preflop", function () {
      it("should deal 2 cards to players", function () {
        const preflopGame = game.deal.preflop(
          {
            deck: deck.create(),
            seats: [{}, {}],
          },
          1
        );
        const seat = preflopGame.seats[1];
        assert.equal(seat.cards.length, 2);
        game.deck.validateCard(seat.cards[0]);
        game.deck.validateCard(seat.cards[1]);
      });
    });

    describe("flop", function () {
      it("should deal 3 community cards", function () {
        const gameOnFlop = game.deal.flop({
          deck: deck.create(),
          communityCards: [],
        });
        assert.equal(gameOnFlop.communityCards.length, 3);
        for (const flopCard of gameOnFlop.communityCards) {
          game.deck.validateCard(flopCard);
        }
      });
    });

    describe("turn", function () {
      it("should deal 1 community card", function () {
        const gameOnTurn = game.deal.turn({
          deck: deck.create(),
          communityCards: [],
        });
        assert.equal(gameOnTurn.communityCards.length, 1);
        const [turnCard] = gameOnTurn.communityCards;
        game.deck.validateCard(turnCard);
      });
    });

    describe("river", function () {
      it("should deal 1 community card", function () {
        const gameOnRiver = game.deal.river({
          deck: deck.create(),
          communityCards: [],
        });
        assert.equal(gameOnRiver.communityCards.length, 1);
        const [riverCard] = gameOnRiver.communityCards;
        game.deck.validateCard(riverCard);
      });
    });
  });

  describe("resume", function () {
    it("should resume game", function () {
      const actual = game.actions.resume({ isPaused: true });
      assert.equal(actual.isPaused, false);
    });

    it("should throw error if there are less than 2 players");
  });

  describe("buyin", function () {
    it("should occupy seat with desired stack", function () {
      const actual = game.actions.buyin(
        { seats: ["empty"] },
        { player: "player", stack: 5000, seat: 0 }
      );
      assert.deepEqual(actual, { seats: [{ player: "player", stack: 5000 }] });
    });

    it("should throw error if buyin is smaller than 20 big blinds");

    it("should throw error if buyin is bigger than 100 big blinds");

    it("should throw error if seat already occupied");

    it("should throw error if seat doesn't exist");
  });

  describe("rebuy");

  describe("bet");

  describe("call", function () {
    it("should match highest bet", function () {
      const actual = game.actions.call(
        { seats: [{ stack: 90, bet: 10 }, { stack: 100 }] },
        { seat: 1 }
      );
      assert.equal(actual.seats[1].bet, 10);
      assert.equal(actual.seats[1].stack, 90);
    });
  });

  describe("check");

  describe("seat out");

  describe("tick");

  describe("turn", function () {
    it("player in the inmmediate left of the button is the first to act", function () {
      assert.equal(
        game.turn.next({
          button: 1,
          seats: [{}, {}, {}, {}],
        }),
        2
      );
    });

    it("should skip players which are all in", function () {
      assert.equal(
        game.turn.next({
          button: 1,
          seats: [
            { bet: 5 },
            { bet: 5 },
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
          button: 1,
          seats: [{}, {}, { folded: true }, {}],
        }),
        3
      );
    });

    it("should skip empty seats", function () {
      assert.equal(
        game.turn.next({
          button: 0,
          seats: [{}, { bet: 10 }, "empty", {}],
        }),
        3
      );
    });

    it("should skip players that already have bet", function () {
      assert.equal(
        game.turn.next({
          button: 0,
          seats: [{}, { bet: 10 }, { bet: 10 }],
        }),
        0
      );
    });

    it("should return player", function () {
      assert.equal(
        game.turn.next({
          button: 1,
          seats: [
            { bet: 10 },
            { bet: 10 },
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
          button: 0,
          seats: [{ bet: 10 }, { bet: 10 }, { bet: 10 }],
        },
        0
      );
    });
  });

  describe("betting round", function () {
    describe("antes", function () {
      it("all players should bet ante", function () {
        let gameOnAntes = game.bettingRound.antes.next({
          button: 0,
          pot: 0,
          blinds: { ante: 10 },
          seats: [{ stack: 100 }, { stack: 100 }],
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
          button: 2,
          blinds: { small: 5, big: 10 },
          seats: [{ stack: 100 }, "empty", { stack: 100 }, "empty"],
        });
        assert.equal(gameOnPreflop.seats[0].bet, 5);
        assert.equal(gameOnPreflop.seats[0].stack, 95);
      });

      it("second player left of button should bet big blind", function () {
        const gameOnPreflop = game.bettingRound.preflop.next({
          pot: 0,
          blinds: { small: 5, big: 10 },
          button: 2,
          seats: [{ stack: 95, bet: 5 }, "empty", { stack: 100 }, "empty"],
        });
        assert.equal(gameOnPreflop.seats[2].bet, 10);
        assert.equal(gameOnPreflop.seats[2].stack, 90);
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
      it("should bet 0", function () {
        const result = game.actions.check(
          { seats: [{ bet: 0 }, { stack: 100 }] },
          1
        );
        assert.equal(result.seats[1].bet, 0);
      });
    });

    describe("call", function () {
      it("should match the last bet", function () {
        const result = game.actions.call(
          { seats: [{ bet: 10 }, { stack: 100 }] },
          { seat: 1 }
        );
        assert.equal(result.seats[1].bet, 10);
      });
    });

    describe("fold", function () {
      it("should set folded true", function () {
        const result = game.actions.fold({ seats: [{}] }, 0);
        assert.equal(result.seats[0].folded, true);
      });
    });

    describe("raise", function () {
      it("should bet", function () {
        const result = game.actions.raise(
          { seats: [{ bet: 10 }, { stack: 100 }] },
          1,
          20
        );
        assert.equal(result.seats[1].bet, 20);
        assert.equal(result.seats[1].stack, 80);
      });

      it("amount should be at least the big blind");

      // eslint-disable-next-line max-len
      // https://poker.stackexchange.com/questions/2729/what-is-the-min-raise-and-min-reraise-in-holdem-no-limit
      it("amount should be at least the size of the last raise");
    });

    describe("end", function () {
      it("should move player bets to the pot");
    });

    it("should end when last bet has been called by all players");

    it("should end when all players have checked");
  });

  describe("moveButton", function () {
    // eslint-disable-next-line max-len
    // https://www.pokerstars.com/help/articles/fwd-moving-button/86605/
    it("should move button to next player", function () {
      const actual = game.moveButton({
        button: 1,
        seats: ["empty", {}, "empty", {}],
      });
      assert.equal(actual.button, 3);
    });
  });

  it("sample hand", function () {
    function print(game) {
      console.dir({ ...game, deck: game.deck.length }, { depth: null });
    }

    let g = game.create();
    print(g);
    for (const [func, args] of [
      [game.actions.buyin, { player: "elio", stack: 5000, seat: 0 }],
      [game.actions.buyin, { player: "oscar", stack: 5000, seat: 1 }],
      [game.actions.resume],
      [game.next],
      [game.next],
      [game.next],
      [game.next],
      [game.next],
      [game.next],
      [game.next],
      [game.next],
      [game.actions.call, { seat: 1 }],
      [game.next],
      [game.next],
      [game.actions.raise, { seat: 1, amount: 250 }],
      [game.actions.raise, { seat: 0, amount: 500 }],
      [game.actions.call, { seat: 1 }],
      [game.next],
      [game.next],
      [game.actions.check, { seat: 1 }],
      [game.actions.check, { seat: 0 }],
      [game.next],
      [game.next],
      [game.actions.raise, { seat: 1, amount: 2000 }],
      [game.actions.call, { seat: 0 }],
      [game.next],
      [game.next],
      [game.next],
    ]) {
      g = func(g, args);
      print(g);
    }

    /*
    g = game.actions.resume(g);
    g = game.next(g); // ante elio
    g = game.next(g); // ante oscar
    g = game.next(g); // preflop small blind
    g = game.next(g); // preflop big blind
    g = game.next(g); // deal hole cards elio
    g = game.next(g); // deal hole cards oscar
    g = game.next(g); // start timer oscar
    g = game.actions.call(g, { seat: 1 });
    g = game.next(g); // start timer elio
    g = game.actions.check(g, { seat: 0 });
    g = game.next(g); // deal flop
    g = game.next(g); // start timer oscar
    g = game.actions.raise(g, { seat: 1, amount: 250 });
    g = game.next(g); // start timer elio
    g = game.actions.raise(g, { seat: 0, amount: 500 });
    g = game.next(g); // start timer oscar
    g = game.actions.call(g, { seat: 1 });
    g = game.next(g); // deal turn
    g = game.next(g); // start timer oscar
    g = game.actions.check(g, { seat: 1 });
    g = game.next(g); // start timer elio
    g = game.actions.check(g, { seat: 0 });
    g = game.next(g); // deal river
    g = game.next(g); // start timer oscar
    g = game.actions.raise(g, { seat: 1, amount: 2000 });
    g = game.next(g); // start timer elio
    g = game.actions.call(g, { seat: 0 });
    g = game.next(g); // show oscar's hand
    g = game.next(g); // elio's hand
    g = game.next(g); // give pot to elio
    game.next(g); // start new hand: 1. move button,*/
  });
});
