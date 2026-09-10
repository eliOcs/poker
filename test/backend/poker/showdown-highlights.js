import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Seat from "../../../src/backend/poker/seat.js";
import * as Showdown from "../../../src/backend/poker/showdown.js";
import { createTestGame, drainGenerator } from "./test-helpers.js";

describe("showdown winning-card highlights", () => {
  let game;

  beforeEach(() => {
    game = createTestGame();
  });

  it("returns an uncalled bet without highlighting the losing hand", () => {
    game.seats = [
      {
        ...Seat.occupied({ id: "p1" }, 0),
        cards: ["Jc", "Th"],
        totalInvested: 21,
        folded: true,
      },
      {
        ...Seat.occupied({ id: "p2" }, 0),
        cards: ["Qh", "Qc"],
        totalInvested: 71,
      },
      {
        ...Seat.occupied({ id: "p3" }, 0),
        cards: ["Qs", "Ad"],
        folded: true,
      },
      {
        ...Seat.occupied({ id: "p4" }, 0),
        cards: ["4c", "4h"],
        totalInvested: 1603,
      },
      {
        ...Seat.occupied({ id: "p5" }, 0),
        cards: ["8d", "6d"],
        totalInvested: 71,
        folded: true,
      },
    ];
    game.board.cards = ["Ah", "5s", "Kd", "Jh", "9c"];
    game.hand = {
      phase: "river",
      collectedPot: 1766,
      currentBet: 0,
      actingSeat: -1,
    };

    drainGenerator(Showdown.showdown(game));

    assert.equal(game.seats[1].stack, 234);
    assert.equal(game.seats[1].handResult, 163);
    assert.deepEqual(game.seats[1].winningCards, [
      "Qh",
      "Qc",
      "Ah",
      "Kd",
      "Jh",
    ]);
    assert.equal(game.seats[3].stack, 1532);
    assert.equal(game.seats[3].handResult, -71);
    assert.equal(game.seats[3].winningCards, undefined);
  });

  for (const folded of [false, true]) {
    it(`highlights a real side-pot winner with a net loss (${folded ? "uncontested" : "contested"})`, () => {
      game.seats = [
        {
          ...Seat.occupied({ id: "p1" }, 0),
          cards: ["As", "Ah"],
          totalInvested: 400,
        },
        {
          ...Seat.occupied({ id: "p2" }, 0),
          cards: ["Ks", "Kh"],
          totalInvested: 500,
        },
        {
          ...Seat.occupied({ id: "p3" }, 0),
          cards: ["Qs", "Qh"],
          totalInvested: 500,
          folded,
        },
      ];
      game.board.cards = ["2c", "5s", "8d", "Jh", "9c"];
      game.hand = {
        phase: "river",
        collectedPot: 1400,
        currentBet: 0,
        actingSeat: -1,
      };

      drainGenerator(Showdown.showdown(game));

      assert.equal(game.seats[1].stack, 200);
      assert.equal(game.seats[1].handResult, -300);
      assert.ok(game.seats[1].winningCards.includes("Ks"));
      assert.ok(game.seats[1].winningCards.includes("Kh"));
      assert.equal(game.seats[2].winningCards, undefined);
    });
  }
});
