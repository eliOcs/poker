import { describe, it } from "node:test";
import assert from "node:assert";
import * as Seat from "../../src/backend/poker/seat.js";
import * as PokerGame from "../../src/backend/poker/game.js";
import {
  handlePlayerDisconnected,
  markTournamentPlayerConnected,
} from "../../src/backend/ws-connection.js";
import { createTestGame } from "./poker/test-helpers.js";

describe("ws-connection", () => {
  it("marks a seat disconnected when the last socket closes", () => {
    const game = createTestGame({ seats: 2 });
    game.id = "table-1";
    game.seats[0] = Seat.occupied({ id: "player-1", name: "Player 1" }, 1000);

    const games = new Map([[game.id, game]]);
    const clientConnections = new Map();
    const conn = {
      gameId: game.id,
      user: { id: "player-1", name: "Player 1" },
    };
    const broadcastedGameIds = [];

    handlePlayerDisconnected(
      conn,
      games,
      clientConnections,
      () => {},
      (gameId) => broadcastedGameIds.push(gameId),
    );

    assert.equal(game.seats[0].empty, false);
    assert.equal(game.seats[0].disconnected, true);
    assert.deepEqual(broadcastedGameIds, [game.id]);
  });

  it("keeps a seat connected when another socket for that player is still open", () => {
    const game = createTestGame({ seats: 2 });
    game.id = "table-1";
    game.seats[0] = Seat.occupied({ id: "player-1", name: "Player 1" }, 1000);

    const games = new Map([[game.id, game]]);
    const otherSocket = /** @type {import("ws").WebSocket} */ ({
      readyState: 1,
    });
    const clientConnections = new Map([
      [
        otherSocket,
        {
          gameId: game.id,
          user: { id: "player-1", name: "Player 1" },
        },
      ],
    ]);
    const conn = {
      gameId: game.id,
      user: { id: "player-1", name: "Player 1" },
    };
    let broadcastCount = 0;

    handlePlayerDisconnected(
      conn,
      games,
      clientConnections,
      () => {},
      () => {
        broadcastCount += 1;
      },
    );

    assert.equal(game.seats[0].empty, false);
    assert.equal(game.seats[0].disconnected, false);
    assert.equal(broadcastCount, 0);
  });

  it("keeps an MTT seat connected while the player has a lobby socket open", () => {
    const game = PokerGame.createMttTable({
      tournamentId: "mtt-1",
      tableName: "Table 1",
      startTime: "2026-05-22T20:00:00.000Z",
    });
    game.id = "table-1";
    game.seats[0] = Seat.occupied({ id: "player-1", name: "Player 1" }, 1000);

    const games = new Map([[game.id, game]]);
    const lobbySocket = /** @type {import("ws").WebSocket} */ ({
      readyState: 1,
    });
    const clientConnections = new Map([
      [
        lobbySocket,
        {
          gameId: null,
          tournamentId: "mtt-1",
          user: { id: "player-1", name: "Player 1" },
        },
      ],
    ]);
    const conn = {
      gameId: game.id,
      tournamentId: "mtt-1",
      user: { id: "player-1", name: "Player 1" },
    };
    let broadcastCount = 0;

    handlePlayerDisconnected(
      conn,
      games,
      clientConnections,
      () => {},
      () => {
        broadcastCount += 1;
      },
    );

    assert.equal(game.seats[0].empty, false);
    assert.equal(game.seats[0].disconnected, false);
    assert.equal(broadcastCount, 0);
  });

  it("marks an MTT table seat connected when the player opens the lobby", () => {
    const game = PokerGame.createMttTable({
      tournamentId: "mtt-1",
      tableName: "Table 1",
      startTime: "2026-05-22T20:00:00.000Z",
    });
    game.id = "table-1";
    game.seats[0] = Seat.occupied({ id: "player-1", name: "Player 1" }, 1000);
    game.seats[0].disconnected = true;

    const broadcastedGameIds = [];
    markTournamentPlayerConnected(
      new Map([[game.id, game]]),
      "mtt-1",
      { id: "player-1", name: "Player 1" },
      (gameId) => broadcastedGameIds.push(gameId),
    );

    assert.equal(game.seats[0].disconnected, false);
    assert.deepEqual(broadcastedGameIds, [game.id]);
  });
});
