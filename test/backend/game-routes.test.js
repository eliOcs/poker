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
import { handleRequest } from "../../src/backend/http-routes.js";
import { DEFAULT_ENTRY_PERIOD_LEVELS } from "../../src/backend/mtt-entry-policy.js";
import { createLog } from "../../src/backend/logger.js";
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

  it("records accepted and rejected late registration outcomes in the HTTP log", () => {
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
      const route = routes.find(
        (candidate) =>
          candidate.method === "POST" &&
          candidate.path instanceof RegExp &&
          path.match(candidate.path),
      );
      assert.ok(route);

      function invoke(playerId, log) {
        const req = { headers: { cookie: `phg=${playerId}` } };
        const res = {
          setHeader() {},
          writeHead() {},
          end() {},
        };
        return route.handler({
          req,
          res,
          match: path.match(route.path),
          users,
          games: ctx.games,
          broadcast: () => {},
          log,
        });
      }

      const acceptedLog = createLog("http_request");
      invoke(latePlayer.id, acceptedLog);
      assert.deepEqual(acceptedLog.context.mttRegistration, {
        tournamentId,
        playerId: latePlayer.id,
        mode: "late",
        level: 1,
        entryPeriodLevels: 4,
        result: "accepted",
        seating: "queued",
      });

      tournament.entryPeriodOpen = false;
      const rejectedLog = createLog("http_request");
      assert.throws(
        () => invoke(closedPlayer.id, rejectedLog),
        /registration is closed/,
      );
      assert.deepEqual(rejectedLog.context.mttRegistration, {
        tournamentId,
        playerId: closedPlayer.id,
        mode: "late",
        level: 1,
        entryPeriodLevels: 4,
        result: "rejected",
        error: "registration is closed",
      });
    } finally {
      ctx.teardown();
    }
  });
});
