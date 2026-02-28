import { describe, it } from "node:test";
import assert from "node:assert";
import * as Seat from "../../../src/backend/poker/seat.js";
import * as Showdown from "../../../src/backend/poker/showdown.js";
import { createTestGame, drainGenerator } from "./test-helpers.js";

describe("showdown split winning cards", () => {
  it("uses each split winner's own hole card in winningCards", () => {
    const game = createTestGame();
    game.seats[0] = {
      ...Seat.occupied({ id: "p1" }, 0),
      cards: ["4s", "Jc"],
      bet: 0,
      totalInvested: 50,
    };
    game.seats[2] = {
      ...Seat.occupied({ id: "p2" }, 0),
      cards: ["Js", "2c"],
      bet: 0,
      totalInvested: 50,
    };
    game.board.cards = ["6h", "Qd", "3d", "8d", "3s"];
    game.hand = { phase: "river", pot: 0, currentBet: 0, actingSeat: -1 };

    drainGenerator(Showdown.showdown(game));

    assert.ok(game.seats[0].winningCards?.includes("Jc"));
    assert.ok(game.seats[2].winningCards?.includes("Js"));
    assert.ok(!game.seats[2].winningCards?.includes("Jc"));
  });
});
