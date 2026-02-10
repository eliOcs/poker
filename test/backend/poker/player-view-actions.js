import { describe, it } from "node:test";
import * as assert from "assert";
import * as Game from "../../../src/backend/poker/game.js";
import * as User from "../../../src/backend/user.js";
import * as Player from "../../../src/backend/poker/player.js";
import * as Actions from "../../../src/backend/poker/actions.js";
import playerView from "../../../src/backend/poker/player-view.js";

function createPlayer() {
  return Player.fromUser(User.create());
}

describe("Player View", function () {
  describe("callClock action", function () {
    it("should appear on waiting player's seat when opponent is acting too long", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });

      // Simulate a hand in progress where seat 1 is acting
      g.hand = {
        phase: "flop",
        pot: 10,
        currentBet: 0,
        actingSeat: 1,
        lastRaiser: -1,
        lastRaiseSize: 0,
      };
      g.actingTicks = 60; // 60 ticks (enough for clock)
      g.clockTicks = 0; // Clock not called

      // Player 1 (seat 0) is waiting - should see callClock action on their own seat
      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;
      const callClockAction = p1Actions.find((a) => a.action === "callClock");

      assert.ok(callClockAction, "callClock action should be available");
    });

    it("should NOT appear on acting player's own seat", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });

      // Simulate a hand in progress where seat 1 is acting
      g.hand = {
        phase: "flop",
        pot: 10,
        currentBet: 0,
        actingSeat: 1,
        lastRaiser: -1,
        lastRaiseSize: 0,
      };
      g.actingTicks = 60; // 60 ticks (enough for clock)
      g.clockTicks = 0; // Clock not called

      // Player 2 (seat 1) is acting - should NOT see callClock on their own seat
      const view = playerView(g, p2);
      const p2Actions = view.seats[1].actions;
      const callClockAction = p2Actions.find((a) => a.action === "callClock");

      assert.ok(
        !callClockAction,
        "callClock should NOT appear for acting player",
      );
    });

    it("should NOT appear before 60 ticks have passed", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });

      // Simulate a hand where seat 1 started acting recently
      g.hand = {
        phase: "flop",
        pot: 10,
        currentBet: 0,
        actingSeat: 1,
        lastRaiser: -1,
        lastRaiseSize: 0,
      };
      g.actingTicks = 30; // Only 30 ticks
      g.clockTicks = 0;

      // Player 1 (seat 0) is waiting - should NOT see callClock yet
      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;
      const callClockAction = p1Actions.find((a) => a.action === "callClock");

      assert.ok(
        !callClockAction,
        "callClock should NOT appear before 60 ticks",
      );
    });

    it("should NOT appear if clock is already called", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });

      // Simulate a hand where clock is already called
      g.hand = {
        phase: "flop",
        pot: 10,
        currentBet: 0,
        actingSeat: 1,
        lastRaiser: -1,
        lastRaiseSize: 0,
      };
      g.actingTicks = 60;
      g.clockTicks = 5; // Clock was called 5 ticks ago

      // Player 1 (seat 0) should NOT see callClock again
      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;
      const callClockAction = p1Actions.find((a) => a.action === "callClock");

      assert.ok(
        !callClockAction,
        "callClock should NOT appear if already called",
      );
    });

    it("should NOT appear when no one is acting", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });
      Actions.buyIn(g, { seat: 0, amount: 50 });
      Actions.buyIn(g, { seat: 1, amount: 50 });

      // Waiting phase - no one is acting
      g.hand = {
        phase: "waiting",
        pot: 0,
        currentBet: 0,
        actingSeat: -1,
        lastRaiser: -1,
        lastRaiseSize: 0,
      };
      g.actingTicks = 0;
      g.clockTicks = 0;

      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;
      const callClockAction = p1Actions.find((a) => a.action === "callClock");

      assert.ok(
        !callClockAction,
        "callClock should NOT appear when no one is acting",
      );
    });
  });

  describe("show card actions", function () {
    it("shows 3 reveal actions immediately after folding", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });

      g.hand = {
        phase: "flop",
        pot: 0,
        currentBet: 0,
        actingSeat: 1,
        lastRaiser: -1,
        lastRaiseSize: 0,
      };
      g.seats[0].cards = ["As", "Kh"];
      g.seats[0].folded = true;

      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;

      assert.ok(p1Actions.some((a) => a.action === "showCard1"));
      assert.ok(p1Actions.some((a) => a.action === "showCard2"));
      assert.ok(p1Actions.some((a) => a.action === "showBothCards"));
    });

    it("shows reveal actions in waiting phase for non-folded players", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });

      g.hand = {
        phase: "waiting",
        pot: 0,
        currentBet: 0,
        actingSeat: -1,
        lastRaiser: -1,
        lastRaiseSize: 0,
      };
      g.seats[0].cards = ["As", "Kh"];
      g.seats[0].folded = false;

      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;

      assert.ok(p1Actions.some((a) => a.action === "showCard1"));
      assert.ok(p1Actions.some((a) => a.action === "showCard2"));
      assert.ok(p1Actions.some((a) => a.action === "showBothCards"));
    });
  });

  describe("sitting out actions", function () {
    it("should show sitIn for sitting out player with short stack", function () {
      const g = Game.create({ seats: 2 });
      const p1 = createPlayer();
      const p2 = createPlayer();
      Actions.sit(g, { seat: 0, player: p1 });
      Actions.sit(g, { seat: 1, player: p2 });

      // Player has a short stack (less than big blind)
      g.seats[0].stack = 25; // Less than big blind of 50
      g.seats[0].sittingOut = true;

      g.hand = {
        phase: "waiting",
        pot: 0,
        currentBet: 0,
        actingSeat: -1,
      };

      const view = playerView(g, p1);
      const p1Actions = view.seats[0].actions;
      const sitInAction = p1Actions.find((a) => a.action === "sitIn");

      // Sitting out players should always be able to sit in
      // If they can't afford the big blind, they go all-in
      assert.ok(
        sitInAction,
        "sitIn should be available for sitting out player regardless of stack size",
      );
    });
  });
});
