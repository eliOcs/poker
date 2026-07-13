import { describe, it } from "node:test";
import assert from "node:assert";
import * as Actions from "../../../src/backend/poker/actions.js";
import * as Game from "../../../src/backend/poker/game.js";
import * as HandHistory from "../../../src/backend/poker/hand-history/index.js";
import * as Seat from "../../../src/backend/poker/seat.js";

/** @typedef {import('../../../src/backend/poker/game.js').Game} PokerGame */

const gameFactories = {
  cash: () => Game.create({ seats: 6 }),
  "Sit & Go": () => Game.createTournament({ seats: 6 }),
  MTT: () =>
    Game.createMttTable({
      seats: 6,
      tournamentId: "tournament1",
      tableName: "Table 1",
      startTime: undefined,
    }),
};

/**
 * @param {PokerGame} game
 * @param {number[]} seatIndices
 */
function addPlayers(game, seatIndices) {
  for (const seatIndex of seatIndices) {
    game.seats[seatIndex] = Seat.occupied(
      { id: `player${seatIndex}`, name: undefined },
      500000,
    );
  }
}

/**
 * @param {number[]} seatIndices
 * @returns {PokerGame}
 */
function createCashGame(seatIndices = [0, 2, 4]) {
  const game = Game.create({ seats: 6 });
  addPlayers(game, seatIndices);
  return game;
}

describe("dealer button timing", () => {
  for (const [gameType, createGame] of Object.entries(gameFactories)) {
    it(`${gameType} keeps the initial button and advances at the next hand start`, () => {
      const game = createGame();
      addPlayers(game, [0, 2, 4]);

      Game.startHand(game);

      assert.equal(game.handNumber, 1);
      assert.equal(game.button, 0);

      Actions.endHand(game);
      Game.autoStartNextHand(game);

      assert.equal(game.button, 0, "the previous dealer remains visible");
      assert.equal(game.countdown, 5);

      Game.startHand(game);

      assert.equal(game.handNumber, 2);
      assert.equal(game.button, 2);
    });
  }

  it("does not advance when fewer than two players are eligible", () => {
    const game = createCashGame([0, 2]);
    game.handNumber = 1;
    game.seats[2].sittingOut = true;

    Game.startHand(game);

    assert.equal(game.handNumber, 1);
    assert.equal(game.button, 0);
  });

  it("includes a player who joins between hands", () => {
    const game = createCashGame([0, 4]);
    Game.startHand(game);
    Actions.endHand(game);
    addPlayers(game, [2]);

    Game.startHand(game);

    assert.equal(game.button, 2);
    assert.equal(HandHistory.getRecorder(game.id).dealerSeat, 3);
  });

  it("excludes a player who leaves between hands", () => {
    const game = createCashGame();
    Game.startHand(game);
    Actions.endHand(game);
    Actions.sitOut(game, { seat: 2 });
    Actions.leave(game, { seat: 2 });

    Game.startHand(game);

    assert.equal(game.button, 4);
  });

  it("excludes a player who sits out between hands", () => {
    const game = createCashGame();
    Game.startHand(game);
    Actions.endHand(game);
    Actions.sitOut(game, { seat: 2 });

    Game.startHand(game);

    assert.equal(game.button, 4);
  });

  it("includes a player who sits in between hands", () => {
    const game = createCashGame();
    game.seats[2].sittingOut = true;
    Game.startHand(game);
    Actions.endHand(game);
    Actions.sitIn(game, { seat: 2 });

    Game.startHand(game);

    assert.equal(game.button, 2);
  });

  it("keeps heads-up button and blind positions correct", () => {
    const game = createCashGame([0, 2]);

    Game.startHand(game);

    assert.equal(game.button, 0);
    assert.equal(game.seats[0].bet, game.blinds.small);
    assert.equal(game.seats[2].bet, game.blinds.big);

    Actions.endHand(game);

    assert.equal(game.button, 0);

    Game.startHand(game);

    assert.equal(game.button, 2);
    assert.equal(game.seats[2].bet, game.blinds.small);
    assert.equal(game.seats[0].bet, game.blinds.big);
  });
});
