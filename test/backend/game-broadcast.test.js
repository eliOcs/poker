import { describe, it } from "node:test";
import assert from "node:assert";
import { createGameBroadcaster } from "../../src/backend/game-broadcast.js";

function createWs() {
  return {
    readyState: 1,
    bufferedAmount: 0,
    sent: [],
    terminated: false,
    send(payload) {
      this.sent.push(JSON.parse(payload));
    },
    terminate() {
      this.terminated = true;
      this.readyState = 2;
    },
  };
}

describe("game broadcaster", () => {
  it("sends player move events to the moved tournament player only", () => {
    const movedPlayerTableSocket = createWs();
    const movedPlayerLobbySocket = createWs();
    const otherPlayerSocket = createWs();
    const clientConnections = new Map([
      [
        movedPlayerTableSocket,
        {
          user: { id: "p1", name: "Player 1" },
          gameId: "table1",
          tournamentId: "mtt1",
        },
      ],
      [
        movedPlayerLobbySocket,
        {
          user: { id: "p1", name: "Player 1" },
          gameId: null,
          tournamentId: "mtt1",
        },
      ],
      [
        otherPlayerSocket,
        {
          user: { id: "p2", name: "Player 2" },
          gameId: "table1",
          tournamentId: "mtt1",
        },
      ],
    ]);

    const broadcaster = createGameBroadcaster(new Map(), clientConnections, {
      getTournamentView: (tournamentId, playerId) => ({
        id: tournamentId,
        currentPlayer: {
          tableId: playerId === "p1" ? "table2" : "table1",
        },
        tables: [
          { tableId: "table1", tableName: "Table 1" },
          { tableId: "table2", tableName: "Table 2" },
        ],
      }),
    });

    broadcaster.broadcastTournamentStateMessage("mtt1", [
      {
        playerId: "p1",
        tournamentId: "mtt1",
        tableId: "table2",
        tableName: "Table 2",
      },
    ]);

    assert.deepEqual(
      movedPlayerTableSocket.sent.map((message) => message.type),
      ["playerMoved", "tournamentState"],
    );
    assert.deepEqual(movedPlayerTableSocket.sent[0], {
      type: "playerMoved",
      tournamentId: "mtt1",
      tableId: "table2",
      tableName: "Table 2",
    });
    assert.deepEqual(
      movedPlayerLobbySocket.sent.map((message) => message.type),
      ["playerMoved", "tournamentState"],
    );
    assert.deepEqual(
      otherPlayerSocket.sent.map((message) => message.type),
      ["tournamentState"],
    );
  });

  it("does not count clients whose send queue has exceeded the limit", () => {
    const slowSocket = createWs();
    slowSocket.bufferedAmount = 256 * 1024;
    const clientConnections = new Map([
      [
        slowSocket,
        {
          user: { id: "p1", name: "Player 1" },
          gameId: "table1",
        },
      ],
    ]);
    const broadcaster = createGameBroadcaster(
      new Map(),
      /** @type {Map<import("ws").WebSocket, any>} */ (clientConnections),
    );

    const stats = broadcaster.broadcastGameMessage({
      type: "social",
      gameId: "table1",
      action: "emote",
      seat: 0,
      emoji: "👍",
    });

    assert.deepEqual(stats, { recipients: 0, maxPayloadBytes: 0 });
    assert.equal(slowSocket.terminated, true);
    assert.deepEqual(slowSocket.sent, []);
  });
});
