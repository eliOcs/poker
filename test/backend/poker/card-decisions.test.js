import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import * as Game from "../../../src/backend/poker/game.js";
import * as Seat from "../../../src/backend/poker/seat.js";
import * as Actions from "../../../src/backend/poker/actions.js";
import { awardToLastPlayer } from "../../../src/backend/poker/showdown.js";
import {
  tick,
  shouldTickBeRunning,
} from "../../../src/backend/poker/game-tick.js";
import playerView from "../../../src/backend/poker/player-view.js";

describe("card decision visibility", () => {
  let game;
  const owner = { id: "owner" };
  const opponent = { id: "opponent" };
  const spectator = { id: "spectator" };
  const holeCards = ["As", "Kh"];

  beforeEach(() => {
    game = Game.create({ seats: 2 });
    game.seats[0] = Seat.occupied(owner, 1000);
    game.seats[1] = Seat.occupied(opponent, 1000);
    game.seats[0].cards = [...holeCards];
    game.seats[0].totalInvested = 100;
    game.hand.phase = "preflop";
    game.hand.actingSeat = 0;
  });

  function assertCardsVisibleToOthers(expected) {
    for (const viewer of [opponent, spectator]) {
      assert.deepEqual(playerView(game, viewer).seats[0].cards, expected);
    }
    assert.deepEqual(playerView(game, owner).seats[0].cards, holeCards);
  }

  function winUncontested() {
    game.hand.actingSeat = 1;
    Actions.fold(game, { seat: 1 });
    awardToLastPlayer(game);
    Actions.endHand(game);
  }

  for (const decision of ["muck", "timeout"]) {
    it(`lets an uncontested winner ${decision} without showing or losing the pot`, () => {
      game.hand.pot = 200;
      winUncontested();
      assertCardsVisibleToOthers(["??", "??"]);
      assert.ok(
        playerView(game, owner).seats[0].actions.some(
          ({ action }) => action === "muck",
        ),
      );

      if (decision === "muck") {
        Actions.muck(game, { seat: 0 });
      } else {
        for (let i = 0; i < 5; i += 1) tick(game);
      }

      assertCardsVisibleToOthers([]);
      assert.equal(game.seats[0].stack, 1200);
      assert.equal(game.seats[0].folded, false);
      for (const action of [
        "muck",
        "showCard1",
        "showCard2",
        "showBothCards",
      ]) {
        assert.throws(() => Actions[action](game, { seat: 0 }));
        assert.ok(
          !playerView(game, owner).seats[0].actions.some(
            (available) => available.action === action,
          ),
        );
      }

      Seat.resetForNewHand(game.seats[0]);
      game.seats[0].cards = [...holeCards];
      assertCardsVisibleToOthers(["??", "??"]);
    });
  }

  for (const decision of ["muck", "timeout"]) {
    it(`keeps card backs pending a decision and hides them on ${decision}`, () => {
      Actions.fold(game, { seat: 0 });
      assertCardsVisibleToOthers(["??", "??"]);

      for (let i = 0; i < 4; i += 1) {
        tick(game);
        assertCardsVisibleToOthers(["??", "??"]);
      }
      if (decision === "muck") {
        Actions.muck(game, { seat: 0 });
      } else {
        assert.deepEqual(tick(game).autoMuckSeats, [0]);
      }

      assertCardsVisibleToOthers([]);
      game.hand.phase = "showdown";
      assertCardsVisibleToOthers([]);
    });
  }

  for (const phase of ["preflop", "flop", "waiting"]) {
    for (const [action, visibleCards] of [
      ["showCard1", ["As", "??"]],
      ["showCard2", ["??", "Kh"]],
      ["showBothCards", holeCards],
    ]) {
      it(`displays ${action} for five ticks when chosen during ${phase}`, () => {
        game.hand.phase = phase;
        if (phase === "waiting") {
          winUncontested();
        } else {
          Actions.fold(game, { seat: 0 });
        }
        game.hand.actingSeat = -1;
        // The reveal gets a full display window even after deciding late.
        for (let i = 0; i < 4; i += 1) tick(game);

        Actions[action](game, { seat: 0 });
        assertCardsVisibleToOthers(visibleCards);
        for (let i = 0; i < 4; i += 1) {
          assert.equal(shouldTickBeRunning(game), true);
          tick(game);
          assertCardsVisibleToOthers(visibleCards);
        }

        const result = tick(game);
        assert.equal(result.shouldBroadcast, true);
        assert.equal(result.autoMuckSeats, undefined);
        assert.equal(shouldTickBeRunning(game), false);
        assertCardsVisibleToOthers([]);
        assert.throws(() => Actions.showBothCards(game, { seat: 0 }));
        game.hand.phase = "showdown";
        assertCardsVisibleToOthers([]);
      });
    }
  }

  it("clears the previous reveal timer before the next hand", () => {
    Actions.fold(game, { seat: 0 });
    Actions.showCard1(game, { seat: 0 });
    tick(game);

    Seat.resetForNewHand(game.seats[0]);
    game.seats[0].cards = [...holeCards];
    assertCardsVisibleToOthers(["??", "??"]);
    for (let i = 0; i < 5; i += 1) tick(game);
    assertCardsVisibleToOthers(["??", "??"]);
    game.seats[0].totalInvested = 100;
    winUncontested();
    Actions.showCard2(game, { seat: 0 });
    assertCardsVisibleToOthers(["??", "Kh"]);
  });

  it("keeps mandatory showdown cards visible", () => {
    game.hand.phase = "waiting";
    game.seats[0].cardsRevealed = true;
    for (let i = 0; i < 6; i += 1) tick(game);
    assertCardsVisibleToOthers(holeCards);
  });
});
