import { describe, it } from "node:test";
import assert from "node:assert";
import * as PokerGame from "../../src/backend/poker/game.js";
import { resetClosedTable } from "../../src/backend/mtt-table-state.js";

describe("mtt table state", () => {
  it("resets the action clock when clearing a closed table", () => {
    const game = PokerGame.create();
    game.actionClock.waitTicks = 15;
    game.actionClock.countdownTicks = 59;

    resetClosedTable(game);

    assert.deepStrictEqual(game.actionClock, {
      waitTicks: 0,
      countdownTicks: 0,
    });
  });
});
