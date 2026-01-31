import { describe, it } from "node:test";
import * as assert from "assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as User from "../../../src/backend/user.js";
import * as Player from "../../../src/backend/poker/player.js";
import * as Actions from "../../../src/backend/poker/actions.js";
import playerView from "../../../src/backend/poker/player-view.js";

/** Helper to create a test player */
function createPlayer() {
  return Player.fromUser(User.create());
}

describe("Player View - Betting Actions", function () {
  describe("betting when opponents are all-in", function () {
    it("should NOT allow raise when all opponents are all-in", function () {
      const g = Game.create({
        seats: 2,
        blinds: { ante: 0, small: 25, big: 50 },
      });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.buyIn(g, { seat: 0, amount: 50 }); // $25 stack
      Actions.buyIn(g, { seat: 1, amount: 50 }); // $25 stack

      // Simulate flop where opponent went all-in
      g.hand = {
        phase: "flop",
        pot: 100,
        currentBet: 500, // Opponent bet $5
        actingSeat: 0,
        lastRaiser: 1,
        lastRaiseSize: 500,
      };
      g.seats[0].stack = 2000; // Player has $20 left
      g.seats[0].bet = 0;
      g.seats[1].stack = 0; // Opponent is all-in
      g.seats[1].bet = 500;
      g.seats[1].allIn = true;

      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;

      // Should be able to call or fold, but NOT raise (opponent can't respond)
      const callAction = p1Actions.find((a) => a.action === "call");
      const raiseAction = p1Actions.find((a) => a.action === "raise");
      const foldAction = p1Actions.find((a) => a.action === "fold");

      assert.ok(callAction, "call should be available");
      assert.ok(foldAction, "fold should be available");
      assert.ok(
        !raiseAction,
        "raise should NOT be available when opponent is all-in",
      );
    });

    it("should NOT allow bet when all opponents are all-in", function () {
      const g = Game.create({
        seats: 2,
        blinds: { ante: 0, small: 25, big: 50 },
      });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });

      // Simulate flop where opponent is all-in but no bet yet this round
      g.hand = {
        phase: "flop",
        pot: 100,
        currentBet: 0, // No bet yet this round
        actingSeat: 0,
        lastRaiser: 0,
        lastRaiseSize: 0,
      };
      g.seats[0].stack = 2000; // Player has chips
      g.seats[0].bet = 0;
      g.seats[1].stack = 0; // Opponent is all-in from previous round
      g.seats[1].bet = 0;
      g.seats[1].allIn = true;

      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;

      // Should only be able to check (no point in betting)
      const checkAction = p1Actions.find((a) => a.action === "check");
      const betAction = p1Actions.find((a) => a.action === "bet");

      assert.ok(checkAction, "check should be available");
      assert.ok(
        !betAction,
        "bet should NOT be available when opponent is all-in",
      );
    });

    it("should NOT allow all-in as a raise when opponents cannot match", function () {
      const g = Game.create({
        seats: 2,
        blinds: { ante: 0, small: 25, big: 50 },
      });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });

      // Simulate flop where opponent went all-in for less
      g.hand = {
        phase: "flop",
        pot: 100,
        currentBet: 500, // Opponent all-in bet
        actingSeat: 0,
        lastRaiser: 1,
        lastRaiseSize: 500,
      };
      g.seats[0].stack = 2000; // Player has $20 left
      g.seats[0].bet = 0;
      g.seats[1].stack = 0; // Opponent is all-in
      g.seats[1].bet = 500;
      g.seats[1].allIn = true;

      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;

      // All-in should NOT be available since it would be a raise and opponent can't respond
      const allInAction = p1Actions.find((a) => a.action === "allIn");
      assert.ok(
        !allInAction,
        "all-in should NOT be available when opponent is all-in",
      );
    });

    it("should allow raise when at least one opponent can respond", function () {
      const g = Game.create({
        seats: 3,
        blinds: { ante: 0, small: 25, big: 50 },
      });
      const p1 = createPlayer();
      const p2 = createPlayer();
      const p3 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.sit(g, { seat: 2, player: p3 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });
      Actions.buyIn(g, { seat: 2, amount: 50 });

      // Simulate flop where one opponent is all-in but another has chips
      g.hand = {
        phase: "flop",
        pot: 100,
        currentBet: 500,
        actingSeat: 0,
        lastRaiser: 1,
        lastRaiseSize: 500,
      };
      g.seats[0].stack = 2000; // Player has chips
      g.seats[0].bet = 0;
      g.seats[1].stack = 0; // Opponent 1 is all-in
      g.seats[1].bet = 500;
      g.seats[1].allIn = true;
      g.seats[2].stack = 1500; // Opponent 2 has chips
      g.seats[2].bet = 500;
      g.seats[2].allIn = false;

      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;

      // Raise should be available since opponent 2 can respond
      const raiseAction = p1Actions.find((a) => a.action === "raise");
      assert.ok(
        raiseAction,
        "raise should be available when at least one opponent can respond",
      );
    });
  });
});
