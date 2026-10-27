import { describe, it } from "node:test";
import assert from "node:assert";
import * as Actions from "../../../src/backend/poker/actions.js";
import * as Seat from "../../../src/backend/poker/seat.js";
import playerView from "../../../src/backend/poker/player-view.js";
import { createBotTable } from "../../../src/backend/bot-table.js";

const LEARNER = { id: "learner1", name: "Alex" };

describe("bot table rules", () => {
  it("deals only while every seat plays", () => {
    const game = createBotTable(LEARNER);
    assert.strictEqual(Actions.canDealHand(game), true);

    /** @type {any} */ (game.seats[0]).sittingOut = true;

    assert.strictEqual(Actions.canDealHand(game), false);
  });

  it("resets every stack to 100 BB when a hand ends", () => {
    const game = createBotTable(LEARNER);
    const stacks = [0, 2500, 10000, 17500, 9999, 100];
    game.seats.forEach((seat, index) => {
      /** @type {any} */ (seat).stack = stacks[index];
    });

    Actions.endHand(game);

    assert.deepStrictEqual(
      game.seats.map((seat) => !seat.empty && [seat.stack, seat.sittingOut]),
      [
        [10000, false],
        [10000, false],
        [10000, false],
        [10000, false],
        [10000, false],
        [10000, false],
      ],
    );
  });

  it("lets nobody else sit and the learner not leave", () => {
    const game = createBotTable(LEARNER);
    game.seats[5] = Seat.empty();

    assert.throws(
      () => Actions.sit(game, { seat: 5, player: { id: "other", name: "Bo" } }),
      /bot tables are private/,
    );
    Actions.sitOut(game, { seat: 0 });
    assert.throws(
      () => Actions.leave(game, { seat: 0 }),
      /cannot leave a bot table/,
    );
  });

  it("offers neither sharing nor leaving", () => {
    const game = createBotTable(LEARNER);
    delete game.countdown;
    Actions.sitOut(game, { seat: 0 });

    const seat = playerView(game, LEARNER).seats[0];

    assert.deepStrictEqual(!seat.empty && seat.actions, [
      { action: "emote" },
      { action: "chat" },
      { action: "sitIn", cost: 0 },
    ]);
  });
});
