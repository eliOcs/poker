import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHistoryRoutes } from "../../src/backend/history-routes.js";
import {
  addToCache,
  clearCache,
} from "../../src/backend/poker/hand-history/io.js";

afterEach(() => clearCache());

describe("history routes", () => {
  it("returns replay snapshots without exposing unshown opponent cards", async () => {
    addToCache("table1-1", {
      spec_version: "1.4.6",
      site_name: "Pluton Poker",
      game_number: "table1-1",
      start_date_utc: "2026-01-01T00:00:00Z",
      game_type: "Holdem",
      bet_limit: { bet_type: "NL" },
      table_size: 2,
      dealer_seat: 1,
      small_blind_amount: 25,
      big_blind_amount: 50,
      ante_amount: 0,
      players: [
        { id: "player1", seat: 1, name: "Alice", starting_stack: 1000 },
        { id: "player2", seat: 2, name: "Bob", starting_stack: 1000 },
      ],
      rounds: [
        {
          id: 0,
          street: "Preflop",
          actions: [
            {
              action_number: 1,
              player_id: "player1",
              action: "Dealt Cards",
              cards: ["Ah", "Kh"],
            },
            {
              action_number: 2,
              player_id: "player2",
              action: "Dealt Cards",
              cards: ["Qc", "Jc"],
            },
            { action_number: 3, player_id: "player2", action: "Fold" },
          ],
        },
      ],
      pots: [
        {
          number: 0,
          amount: 0,
          winning_hand: null,
          player_wins: [],
        },
      ],
    });

    const route = createHistoryRoutes({
      player1: {
        id: "player1",
        name: "Alice",
        settings: { volume: 0.75, vibration: true },
      },
    })[1];
    let body = "";
    const response = {
      setHeader() {},
      writeHead(status, headers) {
        assert.equal(status, 200);
        assert.equal(headers["content-type"], "application/json");
      },
      end(chunk) {
        body = chunk;
      },
    };

    await route.handler({
      req: { headers: { cookie: "phg=player1" } },
      res: response,
      match: ["/api/history/table1/1", "table1", "1"],
      log: { context: {} },
    });

    const payload = JSON.parse(body);
    assert.ok(payload.hand);
    assert.ok(payload.view);
    assert.ok(payload.replay.steps.length > 1);
    assert.deepEqual(payload.hand.rounds[0].actions[1].cards, ["??", "??"]);
    assert.deepEqual(payload.replay.steps[0].view.seats[1].cards, ["??", "??"]);
    assert.deepEqual(payload.replay.steps.at(-1).view, payload.view);
  });
});
