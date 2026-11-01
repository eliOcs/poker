import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { rm } from "node:fs/promises";
import * as PokerGame from "../../src/backend/poker/game.js";
import * as HandHistory from "../../src/backend/poker/hand-history/index.js";
import * as Store from "../../src/backend/store.js";
import { computeRankings } from "../../src/backend/poker/ranking.js";
import { recoverGameFromHistory } from "../../src/backend/poker/recovery.js";
import { finalizePendingHandHistory } from "../../src/backend/poker/game-hand-lifecycle.js";
import { processPokerAction } from "../../src/backend/websocket-handler.js";
import { getPlayerProfile } from "../../src/backend/player-profile.js";
import { createBotRoutes } from "../../src/backend/bot-routes.js";
import {
  createBotTable,
  isBotTableLearner,
} from "../../src/backend/bot-table.js";
import { createTempDataDir, restoreDataDir } from "./temp-data-dir.js";

const LEARNER = { id: "learner1", name: "Alex" };

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
 * A hand at a table with the button on the learner: the learner raises and
 * the blinds fold, so the learner wins both blinds.
 * @param {import('../../src/backend/poker/game.js').Game} game
 */
function playStealHand(game) {
  delete game.countdown;
  game.button = 0;
  PokerGame.startHand(game);
  for (let i = 0; i < 3; i += 1) act(game, "fold");
  act(game, "raise", { amount: 250 });
  act(game, "fold");
  act(game, "fold");
}

/** @param {import('../../src/backend/poker/game.js').Game} game */
function netResults(game) {
  return computeRankings(game).map(({ playerId, netWinnings }) => ({
    playerId,
    netWinnings,
  }));
}

describe("bot table history", () => {
  /** @type {string} */
  let dataDir;
  /** @type {import('../../src/backend/poker/game.js').Game[]} */
  let games;

  beforeEach(async () => {
    dataDir = await createTempDataDir();
    process.env.DATA_DIR = dataDir;
    Store._reset();
    Store.initialize();
    games = [];
  });

  afterEach(async () => {
    for (const game of games) {
      PokerGame.stopGameTick(game);
      HandHistory.clearRecorder(game.id);
    }
    HandHistory.clearCache();
    Store.close();
    await rm(dataDir, { recursive: true, force: true });
    restoreDataDir();
  });

  it("ranks the session's result although every stack is reset", () => {
    const game = createBotTable(LEARNER);
    games.push(game);

    playStealHand(game);

    assert.ok(game.seats.every((seat) => !seat.empty && seat.stack === 10000));
    const [first, second, third] = netResults(game);
    assert.deepStrictEqual(first, { playerId: LEARNER.id, netWinnings: 150 });
    assert.deepStrictEqual(
      [second?.netWinnings, third?.netWinnings],
      [0, 0],
      "the folded seats lose nothing",
    );
    assert.strictEqual(
      netResults(game).reduce((sum, r) => sum + r.netWinnings, 0),
      0,
    );
  });

  it("rebuilds a bot table with its learner, bots and results", async () => {
    const game = createBotTable(LEARNER);
    games.push(game);
    playStealHand(game);
    const { historyHand } = finalizePendingHandHistory(game);
    await HandHistory.persistHand(game.id, historyHand);

    const recovered = await recoverGameFromHistory(game.id);

    assert.ok(recovered);
    games.push(recovered);
    assert.strictEqual(recovered.kind, "bots");
    assert.strictEqual(recovered.handNumber, 1);
    assert.strictEqual(recovered.countdown, 5);
    assert.deepStrictEqual(
      recovered.seats.map((seat) => !seat.empty && seat.player),
      game.seats.map((seat) => !seat.empty && seat.player),
    );
    assert.ok(isBotTableLearner(recovered, LEARNER.id));
    assert.deepStrictEqual(
      recovered.seats.map((seat) => !seat.empty && seat.disconnected),
      [true, false, false, false, false, false],
    );
    assert.ok(
      recovered.seats.every((seat) => !seat.empty && seat.stack === 10000),
    );
    assert.deepStrictEqual(netResults(recovered), netResults(game));
    assert.ok(computeRankings(recovered).every((r) => r.handsPlayed === 1));
  });

  it("keeps bot tables off the learner's profile", async () => {
    const game = createBotTable(LEARNER);
    games.push(game);
    playStealHand(game);
    const { historyHand } = finalizePendingHandHistory(game);
    await HandHistory.persistHand(game.id, historyHand);
    Store.recordHandActivity([
      {
        playerId: LEARNER.id,
        tableId: game.id,
        lastHandNumber: 1,
        lastPlayedAt: historyHand.start_date_utc,
      },
    ]);

    const profile = await getPlayerProfile(new Map(), LEARNER.id);

    assert.strictEqual(profile, undefined);
  });

  it("records the hand that just ended when the learner leaves", () => {
    /** @type {Map<string, any>} */
    const tables = new Map();
    /** @type {import('../../src/backend/poker/game.js').BroadcastMessage[]} */
    const messages = [];
    const routes = createBotRoutes(
      { [LEARNER.id]: { ...LEARNER, settings: {} } },
      tables,
      { isReady: () => true },
      (message) => {
        // Recording looks the table up, so it must still be live.
        assert.ok(tables.has(message.gameId));
        messages.push(message);
        return { recipients: 0, maxPayloadBytes: 0 };
      },
    );
    const call = (method) =>
      routes
        .find((route) => route.method === method)
        ?.handler({
          req: { headers: { cookie: `phg=${LEARNER.id}` } },
          res: { setHeader() {}, writeHead() {}, end() {} },
          log: { context: {} },
        });
    call("POST");
    const game = [...tables.values()][0];
    games.push(game);
    playStealHand(game);

    call("DELETE");

    assert.strictEqual(tables.size, 0);
    assert.deepStrictEqual(
      messages.map(
        (message) => message.type === "handEnded" && message.handNumber,
      ),
      [1],
    );
  });
});
