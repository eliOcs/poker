import { describe, it, afterEach } from "node:test";
import assert from "node:assert";
import { setTimeout as delay } from "node:timers/promises";
import { stripVTControlCharacters } from "node:util";
import * as PokerGame from "../../src/backend/poker/game.js";
import * as Actions from "../../src/backend/poker/actions.js";
import { finishCollectBets } from "../../src/backend/poker/game-flow.js";
import { processPokerAction } from "../../src/backend/websocket-handler.js";
import {
  buildEngineRequest,
  createBotDriver,
  createBotTable,
  isBotTableLearner,
  sampleStrategy,
  toBotAction,
} from "../../src/backend/bot-table.js";

const LEARNER = { id: "learner1", name: "Alex" };

/** A table with the button on the learner, so seats 3, 4 and 5 act first. */
function dealtTable() {
  const game = createBotTable(LEARNER);
  delete game.countdown;
  game.button = 0;
  PokerGame.startHand(game);
  return game;
}

/**
 * @param {import('../../src/backend/poker/game.js').Game} game
 * @param {string} action
 * @param {Record<string, unknown>} [args]
 */
function act(game, action, args = {}) {
  const seat = game.hand.actingSeat;
  const player = /** @type {any} */ (game.seats[seat]).player;
  processPokerAction(game, player, action, { seat, ...args });
}

/**
 * Drives bots like the server does: every state broadcast runs the driver.
 * @param {import('../../src/backend/bot-engine.js').BotEngine["decide"]} decide
 * @param {import('../../src/backend/poker/game.js').Game} game
 */
function drivenTable(decide, game) {
  const games = new Map([[game.id, game]]);
  /** @type {any[]} */
  const requests = [];
  const engine = {
    isReady: () => true,
    decide: (request) => {
      requests.push(request);
      return decide(request);
    },
    close: () => {},
  };
  /** @type {(gameId: string) => void} */
  let drive = () => {};
  const broadcast = (message) => {
    if (message.type === "gameState") drive(message.gameId);
    return { recipients: 0, maxPayloadBytes: 0 };
  };
  drive = createBotDriver({ engine, games, broadcast });
  return { games, requests, drive };
}

/** @param {() => boolean} condition */
async function waitFor(condition) {
  for (let i = 0; i < 200 && !condition(); i += 1) await delay(1);
  assert.ok(condition(), "condition was never met");
}

describe("bot table", () => {
  /** @type {import('../../src/backend/poker/game.js').Game|undefined} */
  let game;

  afterEach(() => {
    if (game) PokerGame.stopGameTick(game);
  });

  it("seats the learner and five different bots at 100 BB, ready to deal", () => {
    game = createBotTable(LEARNER);

    assert.strictEqual(game.kind, "bots");
    assert.deepStrictEqual(game.blinds, { ante: 0, small: 50, big: 100 });
    assert.strictEqual(game.countdown, 5);
    const seats = game.seats.map((seat) => {
      assert.ok(!seat.empty);
      return { stack: seat.stack, sittingOut: seat.sittingOut };
    });
    assert.deepStrictEqual(
      seats,
      Array(6).fill({ stack: 10000, sittingOut: false }),
    );
    const players = game.seats.map((seat) => !seat.empty && seat.player);
    assert.deepStrictEqual(players[0], LEARNER);
    const bots = players.slice(1);
    assert.ok(bots.every((player) => player && player.bot === true));
    assert.strictEqual(new Set(bots.map((player) => player.id)).size, 5);
    assert.ok(isBotTableLearner(game, LEARNER.id));
    assert.ok(!isBotTableLearner(game, players[1].id));
  });

  it("describes the hand so far as the acting bot may know it", () => {
    game = dealtTable();
    act(game, "raise", { amount: 250 });
    act(game, "fold");

    const seat5 = /** @type {any} */ (game.seats[5]);
    assert.deepStrictEqual(buildEngineRequest(game, 5), {
      button: 0,
      stacks: Array(6).fill(10000),
      seat: 5,
      hole: seat5.cards,
      board: [],
      actions: [{ type: "raise", to: 250 }, { type: "fold" }],
    });
  });

  it("describes later streets with the board, and checks as calls", () => {
    game = dealtTable();
    for (let i = 0; i < 5; i += 1) act(game, "call");
    act(game, "check");
    finishCollectBets(game);

    const seat = game.hand.actingSeat;
    assert.strictEqual(game.board.cards.length, 3);
    assert.deepStrictEqual(buildEngineRequest(game, seat), {
      button: 0,
      stacks: Array(6).fill(10000),
      seat,
      hole: /** @type {any} */ (game.seats[seat]).cards,
      board: game.board.cards,
      actions: Array(6).fill({ type: "call" }),
    });
  });

  it("samples a mixed strategy by its probabilities", () => {
    const strategy = [
      { type: "fold", p: 0.25 },
      { type: "call", p: 0.5 },
      { type: "raise", to: 300, p: 0.25 },
    ];

    assert.deepStrictEqual(
      [0, 0.24, 0.25, 0.74, 0.75, 0.99].map(
        (r) => sampleStrategy(strategy, r).type,
      ),
      ["fold", "fold", "call", "call", "raise", "raise"],
    );
  });

  it("turns engine actions into legal table actions", () => {
    game = dealtTable();

    assert.deepStrictEqual(toBotAction(game, 3, { type: "fold" }), {
      action: "fold",
    });
    assert.deepStrictEqual(toBotAction(game, 3, { type: "call" }), {
      action: "call",
    });
    assert.deepStrictEqual(toBotAction(game, 3, { type: "raise", to: 250 }), {
      action: "raise",
      amount: 250,
    });
    assert.deepStrictEqual(
      toBotAction(game, 3, { type: "raise", to: 150 }),
      { action: "raise", amount: 200 },
      "below the minimum raise",
    );
    assert.deepStrictEqual(
      toBotAction(game, 3, { type: "raise", to: 599 }),
      { action: "raise", amount: 600 },
      "pot-fraction sizes round to the table's 50 chip",
    );
    assert.deepStrictEqual(toBotAction(game, 3, { type: "raise", to: 10000 }), {
      action: "allIn",
    });
    assert.deepStrictEqual(
      toBotAction(game, 3, { type: "raise", to: 9990 }),
      { action: "allIn" },
      "a size that rounds to the whole stack",
    );

    act(game, "call");
    act(game, "call");
    act(game, "call");
    act(game, "call");
    act(game, "call");
    assert.strictEqual(game.hand.actingSeat, 2);
    assert.deepStrictEqual(toBotAction(game, 2, { type: "fold" }), {
      action: "check",
    });
    assert.deepStrictEqual(toBotAction(game, 2, { type: "call" }), {
      action: "check",
    });
  });

  it("bets rather than raises when nobody has bet", () => {
    game = dealtTable();
    game.hand.currentBet = 0;
    /** @type {any} */ (game.seats[3]).bet = 0;

    assert.deepStrictEqual(toBotAction(game, 3, { type: "raise", to: 60 }), {
      action: "bet",
      amount: 100,
    });
  });

  it("plays every bot seat until the learner is to act", async () => {
    game = dealtTable();
    const { requests, drive } = drivenTable(
      async () => ({ strategy: [{ type: "call", p: 1 }], source: "blueprint" }),
      game,
    );

    drive(game.id);
    await waitFor(() => game?.hand.actingSeat === 0);

    assert.deepStrictEqual(
      requests.map((request) => request.seat),
      [3, 4, 5],
    );
    assert.deepStrictEqual(
      requests.map((request) => request.actions.length),
      [0, 1, 2],
    );
    assert.deepStrictEqual(
      game.seats.slice(3).map((seat) => !seat.empty && seat.bet),
      [100, 100, 100],
    );
  });

  it("logs each decision with all a replay needs", async (t) => {
    const consoleLog = t.mock.method(console, "log", () => {});
    game = dealtTable();
    const strategy = [
      { type: "fold", p: 0.25 },
      { type: "raise", to: 250, p: 0.75 },
    ];
    const { requests, drive } = drivenTable(
      async () => ({ strategy, source: "blueprint" }),
      game,
    );

    drive(game.id);
    await waitFor(() => game?.hand.actingSeat === 0);

    const engines = consoleLog.mock.calls
      .map((call) => stripVTControlCharacters(String(call.arguments[0])))
      .filter((line) => line.includes(" bot_action "))
      .map((line) => {
        const field = line.split(" ").find((f) => f.startsWith("engine="));
        return JSON.parse(/** @type {string} */ (field).slice(7));
      });
    assert.deepStrictEqual(
      engines.map((engine) => engine.request),
      requests,
    );
    for (const engine of engines) {
      assert.deepStrictEqual(engine.strategy, strategy);
      assert.strictEqual(engine.source, "blueprint");
      assert.deepStrictEqual(
        engine.choice,
        sampleStrategy(strategy, engine.sample),
      );
    }
  });

  it("checks, or folds when it cannot, if the engine fails", async () => {
    game = dealtTable();
    const { drive } = drivenTable(
      () => Promise.reject(new Error("bot engine exited")),
      game,
    );

    drive(game.id);
    await waitFor(() => game?.hand.actingSeat === 0);

    assert.deepStrictEqual(
      game.seats.slice(3).map((seat) => !seat.empty && seat.folded),
      [true, true, true],
    );
  });

  it("asks once per decision and drops answers for a table that ended", async () => {
    game = dealtTable();
    /** @type {(decision: any) => void} */
    let answer = () => {};
    const { games, requests, drive } = drivenTable(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
      game,
    );

    drive(game.id);
    drive(game.id);
    games.delete(game.id);
    answer({ strategy: [{ type: "call", p: 1 }], source: "blueprint" });
    await delay(5);

    assert.strictEqual(requests.length, 1);
    assert.strictEqual(game.hand.actingSeat, 3);
  });

  it("deals again once a disconnected learner sits back in", () => {
    game = createBotTable(LEARNER);
    delete game.countdown;
    /** @type {any} */ (game.seats[0]).sittingOut = true;
    const { drive } = drivenTable(async () => {
      throw new Error("no decisions while waiting");
    }, game);

    drive(game.id);
    assert.strictEqual(game.countdown, undefined);

    Actions.sitIn(game, { seat: 0 });
    drive(game.id);
    assert.strictEqual(game.countdown, 5);
  });
});
