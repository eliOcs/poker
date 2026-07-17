import { describe, it } from "node:test";
import assert from "node:assert";
import http from "node:http";
import { once } from "node:events";
import * as PokerGame from "../../src/backend/poker/game.js";
import * as Player from "../../src/backend/poker/player.js";
import * as Seat from "../../src/backend/poker/seat.js";
import {
  createGameRoutes,
  findActiveGamePath,
} from "../../src/backend/game-routes.js";
import { HttpError } from "../../src/backend/http-error.js";
import { handleRequest } from "../../src/backend/http-routes.js";
import { DEFAULT_ENTRY_PERIOD_LEVELS } from "../../src/backend/mtt-entry-policy.js";
import { createMttContext, createUser } from "./mtt-test-context.js";

describe("game-routes", () => {
  it("returns the live cash path for a seated player", () => {
    const user = { id: "u1", name: "Alice", settings: {} };
    const game = PokerGame.create({ kind: "cash" });
    game.seats[2] = Seat.occupied(Player.fromUser(user), 5000);

    const path = findActiveGamePath(new Map([[game.id, game]]), user.id);

    assert.strictEqual(path, `/cash/${game.id}`);
  });

  it("returns a path for a sitting out player while the game is running", () => {
    const user = { id: "u1", name: "Alice", settings: {} };
    const game = PokerGame.create({ kind: "cash" });
    game.seats[2] = Seat.occupied(Player.fromUser(user), 5000, true);

    const path = findActiveGamePath(new Map([[game.id, game]]), user.id);

    assert.strictEqual(path, `/cash/${game.id}`);
  });

  it("does not return a path for a finished sitngo", () => {
    const user = { id: "u1", name: "Alice", settings: {} };
    const game = PokerGame.createTournament();
    game.seats[2] = Seat.occupied(Player.fromUser(user), 5000);
    game.tournament.winner = 2;
    game.running = false;

    const path = findActiveGamePath(new Map([[game.id, game]]), user.id);

    assert.strictEqual(path, undefined);
  });

  it("returns the MTT table path for a seated player", () => {
    const user = { id: "u1", name: "Alice", settings: {} };
    const table = PokerGame.createMttTable({
      tournamentId: "mtt123",
      tableName: "Table 1",
      startTime: null,
    });
    table.seats[1] = Seat.occupied(Player.fromUser(user), 5000);

    const path = findActiveGamePath(new Map([[table.id, table]]), user.id);

    assert.strictEqual(path, `/mtt/mtt123/tables/${table.id}`);
  });

  it("ignores games where the player is not seated", () => {
    const user = { id: "u1", name: "Alice", settings: {} };
    const game = PokerGame.create({ kind: "cash" });

    const path = findActiveGamePath(new Map([[game.id, game]]), user.id);

    assert.strictEqual(path, undefined);
  });

  it("does not forward a client entry-period override when creating an MTT", async () => {
    const ctx = createMttContext();
    ctx.setup();
    try {
      const owner = createUser("owner");
      const users = { [owner.id]: owner };
      const routes = createGameRoutes(users, ctx.games, () => {}, {
        mttManager: ctx.manager,
      });
      const server = http.createServer((req, res) => {
        handleRequest(req, res, routes).catch((error) => res.destroy(error));
      });
      server.listen(0, "127.0.0.1");
      await once(server, "listening");

      try {
        const address = server.address();
        assert.ok(address && typeof address === "object");
        const response = await fetch(`http://127.0.0.1:${address.port}/mtt`, {
          method: "POST",
          headers: {
            cookie: `phg=${owner.id}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            seats: 9,
            buyIn: 1_000,
            entryPeriodLevels: 7,
          }),
        });

        assert.equal(response.status, 200);
        const { id } = await response.json();
        const tournament = ctx.manager.getTournament(id);
        assert.ok(tournament);
        assert.equal(tournament.entryPeriodLevels, DEFAULT_ENTRY_PERIOD_LEVELS);
      } finally {
        server.close();
        await once(server, "close");
      }
    } finally {
      ctx.teardown();
    }
  });

  it("accepts open and rejects closed late registration over HTTP", async () => {
    const ctx = createMttContext();
    ctx.setup();
    try {
      const owner = createUser("owner");
      const latePlayer = createUser("late");
      const closedPlayer = createUser("closed");
      const users = {
        [owner.id]: owner,
        [latePlayer.id]: latePlayer,
        [closedPlayer.id]: closedPlayer,
      };
      const tournamentId = ctx.manager.createTournament({
        owner,
        buyIn: 500,
        tableSize: 6,
        maxRebuys: 0,
      });
      ctx.manager.registerPlayer(tournamentId, createUser("p2"));
      ctx.manager.startTournament(tournamentId, owner.id);
      const tournament = ctx.manager.getTournament(tournamentId);
      assert.ok(tournament);
      const table = ctx.games.get(tournament.tables[0].tableId);
      assert.ok(table);
      table.hand.phase = "flop";

      const routes = createGameRoutes(users, ctx.games, () => {}, {
        mttManager: ctx.manager,
      });
      const path = `/api/mtt/${tournamentId}/register`;
      const server = http.createServer(async (req, res) => {
        try {
          await handleRequest(req, res, routes);
        } catch (error) {
          if (!(error instanceof HttpError)) {
            res.destroy(error instanceof Error ? error : undefined);
            return;
          }
          res.writeHead(error.status, { "content-type": "application/json" });
          res.end(
            JSON.stringify(
              error.body ?? { error: error.message, status: error.status },
            ),
          );
        }
      });
      server.listen(0, "127.0.0.1");
      await once(server, "listening");

      try {
        const address = server.address();
        assert.ok(address && typeof address === "object");
        const url = `http://127.0.0.1:${address.port}${path}`;
        const acceptedResponse = await fetch(url, {
          method: "POST",
          headers: { cookie: `phg=${latePlayer.id}` },
        });
        assert.equal(acceptedResponse.status, 200);
        await acceptedResponse.json();
        const acceptedTournament = ctx.manager.getTournament(tournamentId);
        assert.ok(acceptedTournament);
        const acceptedEntrant = acceptedTournament.entrants.get(latePlayer.id);
        assert.ok(acceptedEntrant);
        assert.equal(acceptedEntrant.status, "registered");

        tournament.entryPeriodOpen = false;
        const rejectedResponse = await fetch(url, {
          method: "POST",
          headers: { cookie: `phg=${closedPlayer.id}` },
        });
        assert.equal(rejectedResponse.status, 400);
        assert.deepEqual(await rejectedResponse.json(), {
          error: "registration is closed",
          status: 400,
        });
        const rejectedTournament = ctx.manager.getTournament(tournamentId);
        assert.ok(rejectedTournament);
        assert.equal(rejectedTournament.entrants.has(closedPlayer.id), false);
      } finally {
        server.close();
        await once(server, "close");
      }
    } finally {
      ctx.teardown();
    }
  });
});
