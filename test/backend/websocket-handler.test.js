import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import {
  classifyAllInAction,
  getSeatStateBefore,
  processPokerAction,
} from "../../src/backend/websocket-handler.js";
import * as PokerActions from "../../src/backend/poker/actions.js";
import * as Seat from "../../src/backend/poker/seat.js";
import * as HandHistory from "../../src/backend/poker/hand-history/index.js";
import * as Store from "../../src/backend/store.js";
import playerView from "../../src/backend/poker/player-view.js";
import { tick } from "../../src/backend/poker/game-tick.js";
import { createTestGame } from "./poker/test-helpers.js";

describe("websocket-handler", () => {
  beforeEach(() => {
    Store._reset();
    Store.initialize(":memory:");
  });

  afterEach(() => {
    Store.close();
  });

  describe("classifyAllInAction", () => {
    it("should return bet when currentBet is 0", () => {
      // Going all-in when no one has bet
      assert.strictEqual(classifyAllInAction(0, 0, 1000), "bet");
      // Even with a previous bet on this street
      assert.strictEqual(classifyAllInAction(50, 0, 1000), "bet");
    });

    it("should return call when finalBet equals currentBet", () => {
      // Exact call
      assert.strictEqual(classifyAllInAction(0, 100, 100), "call");
      // Already had partial bet
      assert.strictEqual(classifyAllInAction(50, 100, 100), "call");
    });

    it("should return call when finalBet is less than currentBet (all-in for less)", () => {
      // All-in for less than current bet
      assert.strictEqual(classifyAllInAction(0, 100, 50), "call");
      assert.strictEqual(classifyAllInAction(25, 100, 75), "call");
    });

    it("should return raise when finalBet exceeds currentBet", () => {
      // Going over the current bet
      assert.strictEqual(classifyAllInAction(0, 100, 200), "raise");
      // Already had some bet, raising more
      assert.strictEqual(classifyAllInAction(50, 100, 300), "raise");
      assert.strictEqual(classifyAllInAction(100, 100, 500), "raise");
    });
  });

  describe("all-in classification in game flow", () => {
    let game;
    let player1, player2, player3;

    beforeEach(() => {
      game = createTestGame();
      player1 = { id: "p1" };
      player2 = { id: "p2" };
      player3 = { id: "p3" };

      // Set up players on river
      game.seats[0] = {
        ...Seat.occupied(player1, 4000),
        cards: ["As", "Ks"],
      };
      game.seats[2] = {
        ...Seat.occupied(player2, 3000), // Will go all-in
        cards: ["Qh", "Jh"],
      };
      game.seats[4] = {
        ...Seat.occupied(player3, 5000),
        cards: ["2c", "3c"],
      };

      game.hand = {
        phase: "river",
        collectedPot: 800,
        currentBet: 0,
        lastRaiser: -1,
        actingSeat: 0,
        lastRaiseSize: 0,
      };
      game.board.cards = ["Js", "7c", "2h", "5h", "8c"];
    });

    it("should classify all-in as raise when exceeding current bet after bet+raise", () => {
      // Reproduces production bug ml1c1ixx2027 hand #10
      // Scenario:
      // - Player 1 bets 1000
      // - Player 3 raises to 2000
      // - Player 2 folds
      // - Player 1 goes all-in for 4000 total
      // This should be classified as a RAISE, not a call

      // Player 1 bets
      game.hand.actingSeat = 0;
      PokerActions.bet(game, { seat: 0, amount: 1000 });
      // currentBet is now 1000

      // Player 3 raises to 2000
      game.hand.actingSeat = 4;
      PokerActions.raise(game, { seat: 4, amount: 2000 });
      // currentBet is now 2000

      // Player 2 folds
      game.hand.actingSeat = 2;
      game.seats[2].folded = true;

      // Now player 1 goes all-in
      game.hand.actingSeat = 0;

      // Capture state BEFORE all-in using the fixed function
      const { betBefore, currentBetBefore } = getSeatStateBefore(game, player1);

      assert.strictEqual(betBefore, 1000, "betBefore should be 1000");
      assert.strictEqual(
        currentBetBefore,
        2000,
        "currentBetBefore should be 2000",
      );

      // Player 1 goes all-in with remaining stack
      // They already bet 1000, have 3000 left, so total bet will be 4000
      PokerActions.allIn(game, { seat: 0 });
      const seatAfter = game.seats[0];

      assert.strictEqual(seatAfter.bet, 4000, "total bet should be 4000");

      // With the fix, using currentBetBefore gives correct classification
      const classification = classifyAllInAction(
        betBefore,
        currentBetBefore, // 2000 - captured BEFORE all-in
        seatAfter.bet, // 4000
      );
      assert.strictEqual(
        classification,
        "raise",
        "All-in for more than current bet should be a raise",
      );
    });

    it("getSeatStateBefore captures currentBet before action modifies it", () => {
      // This test verifies the fix: currentBetBefore is captured correctly
      game.hand.actingSeat = 0;
      PokerActions.bet(game, { seat: 0, amount: 1000 });

      game.hand.actingSeat = 4;
      PokerActions.raise(game, { seat: 4, amount: 2000 });

      // Before all-in, currentBet should be 2000
      game.hand.actingSeat = 0;
      const stateBefore = getSeatStateBefore(game, player1);

      assert.strictEqual(
        stateBefore.currentBetBefore,
        2000,
        "currentBetBefore should capture the bet before action",
      );

      // After all-in, game.hand.currentBet will be 4000
      PokerActions.allIn(game, { seat: 0 });

      assert.strictEqual(
        game.hand.currentBet,
        4000,
        "currentBet after action should be 4000",
      );

      // But stateBefore.currentBetBefore should still be 2000
      assert.strictEqual(
        stateBefore.currentBetBefore,
        2000,
        "captured currentBetBefore should not change",
      );
    });
  });

  describe("show card actions", () => {
    const alice = { id: "p1", name: "Alice" };
    const bob = { id: "p2", name: "Bob" };
    const carol = { id: "p3", name: "Carol" };

    /** Alice folds on the flop after investing; Bob and Carol play on. */
    function foldMidHand() {
      const game = createTestGame({ seats: 3 });
      game.seats[0] = {
        ...Seat.occupied(alice, 1000),
        cards: ["As", "Kh"],
        totalInvested: 25,
      };
      game.seats[1] = { ...Seat.occupied(bob, 1000), cards: ["2c", "3d"] };
      game.seats[2] = { ...Seat.occupied(carol, 1000), cards: ["4h", "5s"] };
      game.hand.phase = "flop";
      game.hand.actingSeat = 0;
      game.handNumber = 1;
      HandHistory.clearRecorder(game.id);
      HandHistory.startHand(game);
      processPokerAction(game, alice, "fold", { seat: 0 });
      return game;
    }

    function endHand(game) {
      processPokerAction(game, bob, "fold", { seat: 1 });
      assert.strictEqual(game.hand.phase, "waiting");
    }

    function showdownRecords(game) {
      return HandHistory.getRecorder(game.id)
        .actions.filter((a) => /Shows|Mucks/.test(a.action))
        .map((a) => [a.player_id, a.action, a.cards]);
    }

    function aliceActions(game) {
      return playerView(game, alice).seats[0].actions.map((a) => a.action);
    }

    it("lets a folded player change which cards to show until the hand ends", () => {
      const game = foldMidHand();

      processPokerAction(game, alice, "showBothCards", { seat: 0 });
      processPokerAction(game, alice, "toggleShowCard", { seat: 0, card: 0 });

      assert.deepStrictEqual(playerView(game, alice).seats[0].cardChoice, {
        show: [false, true],
        open: true,
      });
      assert.deepStrictEqual(playerView(game, bob).seats[0].cards, []);
      assert.deepStrictEqual(showdownRecords(game), []);

      endHand(game);

      assert.deepStrictEqual(showdownRecords(game), [
        ["p1", "Shows Cards", ["Kh"]],
      ]);
      assert.deepStrictEqual(playerView(game, bob).seats[0].cards, [
        "??",
        "Kh",
      ]);
      HandHistory.clearRecorder(game.id);
    });

    it("closes the menu once a card is picked on the table", () => {
      const game = foldMidHand();
      assert.ok(aliceActions(game).includes("muck"));

      processPokerAction(game, alice, "toggleShowCard", { seat: 0, card: 1 });

      assert.ok(!aliceActions(game).includes("muck"));
      assert.ok(!aliceActions(game).includes("showBothCards"));
      endHand(game);
      assert.deepStrictEqual(showdownRecords(game), [
        ["p1", "Shows Cards", ["Kh"]],
      ]);
      HandHistory.clearRecorder(game.id);
    });

    for (const decision of ["muck", "timeout"]) {
      it(`records a mid-hand ${decision} when the hand ends`, () => {
        const game = foldMidHand();

        if (decision === "muck") {
          processPokerAction(game, alice, "muck", { seat: 0 });
        } else {
          for (let i = 0; i < 5; i += 1) tick(game);
        }

        assert.deepStrictEqual(aliceActions(game).includes("muck"), false);
        assert.deepStrictEqual(showdownRecords(game), []);
        endHand(game);
        assert.deepStrictEqual(showdownRecords(game), [
          ["p1", "Mucks Cards", undefined],
        ]);
        assert.deepStrictEqual(playerView(game, bob).seats[0].cards, []);
        HandHistory.clearRecorder(game.id);
      });
    }

    it("keeps an unanswered menu open after the hand ends", () => {
      const game = foldMidHand();
      endHand(game);

      assert.strictEqual(
        playerView(game, alice).seats[0].cardChoice,
        undefined,
      );
      assert.ok(aliceActions(game).includes("showCard1"));
      assert.deepStrictEqual(showdownRecords(game), []);

      processPokerAction(game, alice, "showCard1", { seat: 0 });

      assert.deepStrictEqual(playerView(game, bob).seats[0].cards, [
        "As",
        "??",
      ]);
      assert.deepStrictEqual(showdownRecords(game), [
        ["p1", "Shows Cards", ["As"]],
      ]);
      HandHistory.clearRecorder(game.id);
    });

    it("rejects card toggles outside a folded player's held choice", () => {
      const game = foldMidHand();
      for (const card of [2, "1", undefined]) {
        assert.throws(
          () =>
            processPokerAction(game, alice, "toggleShowCard", {
              seat: 0,
              card,
            }),
          /card must be 0 or 1/,
        );
      }
      assert.throws(
        () =>
          processPokerAction(game, carol, "toggleShowCard", {
            seat: 2,
            card: 0,
          }),
        /after folding mid-hand/,
      );

      endHand(game);
      assert.throws(
        () =>
          processPokerAction(game, alice, "toggleShowCard", {
            seat: 0,
            card: 0,
          }),
        /after folding mid-hand/,
      );
      HandHistory.clearRecorder(game.id);
    });

    it("acts only on the sender's own seat", () => {
      const game = foldMidHand();
      // Bob tries to act for Alice and for Carol, whose turn it is not.
      assert.throws(() =>
        processPokerAction(game, bob, "toggleShowCard", { seat: 0, card: 0 }),
      );
      assert.throws(() =>
        processPokerAction(game, bob, "showBothCards", { seat: 0 }),
      );
      assert.deepStrictEqual(game.seats[0].pendingShow, [false, false]);

      game.hand.actingSeat = 2;
      assert.throws(
        () => processPokerAction(game, bob, "fold", { seat: 2 }),
        /not your turn/,
      );
      assert.strictEqual(game.seats[2].folded, false);
      HandHistory.clearRecorder(game.id);
    });

    it("rejects actions that are not a player's to send", () => {
      const game = foldMidHand();
      for (const action of ["resolvePendingShows", "endHand", "startHand"]) {
        assert.throws(
          () => processPokerAction(game, bob, action, {}),
          /unknown action/,
        );
      }
      assert.strictEqual(game.hand.phase, "flop");
      assert.throws(
        () =>
          processPokerAction(game, { id: "spectator" }, "fold", { seat: 1 }),
        /not seated/,
      );
      HandHistory.clearRecorder(game.id);
    });

    it("records a muck after the hand right away", () => {
      const game = createTestGame({ seats: 2 });
      const player = { id: "p1", name: "Alice" };
      const opponent = { id: "p2", name: "Bob" };
      game.seats[0] = {
        ...Seat.occupied(player, 1000),
        cards: ["As", "Kh"],
        folded: true,
        muckDecision: { remainingTicks: 5 },
      };
      game.seats[1] = Seat.occupied(opponent, 1000);
      game.hand.phase = "waiting";
      game.handNumber = 1;

      HandHistory.clearRecorder(game.id);
      HandHistory.startHand(game);

      processPokerAction(game, player, "muck", { seat: 0 });

      const muckAction = HandHistory.getRecorder(game.id).actions.find(
        (action) => action.action === "Mucks Cards",
      );
      assert.ok(muckAction);
      assert.strictEqual(game.seats[0].muckDecision, undefined);

      HandHistory.clearRecorder(game.id);
    });
  });

  describe("countdown cancellation with pending history", () => {
    it("finalizes pending hand history when sitOut cancels countdown", async () => {
      const game = createTestGame({ seats: 2 });
      const player = { id: "p1", name: "Alice" };
      const opponent = { id: "p2", name: "Bob" };
      game.seats[0] = {
        ...Seat.occupied(player, 1000),
        folded: true,
      };
      game.seats[1] = Seat.occupied(opponent, 1000);
      game.hand = {
        phase: "flop",
        collectedPot: 0,
        currentBet: 0,
        lastRaiser: -1,
        actingSeat: 1,
        lastRaiseSize: 0,
      };
      game.handNumber = 1;
      game.countdown = 3;

      HandHistory.clearCache();
      HandHistory.clearRecorder(game.id);
      HandHistory.startHand(game);
      HandHistory.recordBlind(game.id, "p1", "sb", 25);
      game.pendingHandHistory = [
        {
          potAmount: 25,
          winners: [0],
          winningHand: null,
          winningCards: null,
          awards: [{ seat: 0, amount: 25 }],
        },
      ];

      const handData = processPokerAction(game, player, "sitOut", { seat: 0 });
      let historyEvent = null;
      if (handData) {
        await HandHistory.finalizeHand(
          game,
          handData.potResults,
          handData.handNumber,
        );
        historyEvent = { gameId: game.id, handNumber: handData.handNumber };
      }

      assert.strictEqual(game.countdown, undefined);
      assert.strictEqual(game.pendingHandHistory, undefined);
      assert.strictEqual(HandHistory.getCacheSize(), 1);
      assert.deepStrictEqual(historyEvent, { gameId: game.id, handNumber: 1 });

      const hand = await HandHistory.getHand(game.id, 1);
      assert.ok(hand);
      HandHistory.clearRecorder(game.id);
    });
  });
});
