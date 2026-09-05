import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import http from "node:http";
import { once } from "node:events";
import * as Store from "../../src/backend/store.js";
import * as PokerGame from "../../src/backend/poker/game.js";
import * as Player from "../../src/backend/poker/player.js";
import * as Seat from "../../src/backend/poker/seat.js";
import { getAvatarRevision } from "../../src/backend/avatar.js";
import { createGameRoutes } from "../../src/backend/game-routes.js";
import { handleRequest } from "../../src/backend/http-routes.js";
import { HttpError } from "../../src/backend/http-error.js";
import { DEFAULT_AVATAR } from "../../src/shared/avatar.js";

describe("avatar routes", () => {
  afterEach(() => Store._reset());

  it("validates, stores, versions, caches, and synchronizes avatars", async () => {
    Store.initialize(":memory:");
    const user = {
      id: "player1",
      name: "Alice",
      settings: { volume: 0.75, vibration: true },
    };
    Store.saveUser(user);
    const users = { [user.id]: user };
    const game = PokerGame.create({ kind: "cash" });
    game.seats[0] = Seat.occupied(Player.fromUser(user), 1_000);
    const games = new Map([[game.id, game]]);
    const broadcasts = [];
    const routes = createGameRoutes(
      users,
      games,
      (gameId) => broadcasts.push(gameId),
      {},
    );
    const server = http.createServer(async (req, res) => {
      try {
        await handleRequest(req, res, routes);
      } catch (error) {
        if (!(error instanceof HttpError)) throw error;
        res.writeHead(error.status, { "content-type": "application/json" });
        res.end(JSON.stringify(error.body));
      }
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    try {
      const address = server.address();
      assert.ok(address && typeof address === "object");
      const origin = `http://127.0.0.1:${address.port}`;
      const avatar = structuredClone(DEFAULT_AVATAR);
      delete avatar.schemaVersion;
      avatar.face.color = "#C98255";
      const updateResponse = await fetch(`${origin}/api/users/me`, {
        method: "PUT",
        headers: {
          cookie: `phg=${user.id}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ settings: { avatar } }),
      });
      assert.equal(updateResponse.status, 200);
      const updatedUser = await updateResponse.json();
      const revision = getAvatarRevision(updatedUser.settings.avatar);
      assert.equal(updatedUser.settings.avatar.schemaVersion, 1);
      assert.equal(updatedUser.settings.avatar.face.color, "#c98255");
      assert.equal(game.seats[0].player.avatarRevision, revision);
      assert.deepEqual(broadcasts, [game.id]);

      const avatarResponse = await fetch(
        `${origin}/api/players/${user.id}/avatar`,
        { headers: { cookie: `phg=${user.id}` } },
      );
      assert.equal(avatarResponse.status, 200);
      assert.equal(avatarResponse.headers.get("etag"), `"${revision}"`);
      assert.match(
        avatarResponse.headers.get("cache-control") ?? "",
        /must-revalidate/,
      );
      assert.deepEqual(await avatarResponse.json(), {
        revision,
        avatar: updatedUser.settings.avatar,
      });

      const cachedResponse = await fetch(
        `${origin}/api/players/${user.id}/avatar`,
        {
          headers: {
            cookie: `phg=${user.id}`,
            "if-none-match": `"${revision}"`,
          },
        },
      );
      assert.equal(cachedResponse.status, 304);
    } finally {
      server.close();
      await once(server, "close");
    }
  });

  it("rejects invalid avatar settings without persisting them", async () => {
    Store.initialize(":memory:");
    const user = { id: "player1", settings: {} };
    Store.saveUser(user);
    const routes = createGameRoutes(
      { [user.id]: user },
      new Map(),
      () => {},
      {},
    );
    const invalidAvatar = structuredClone(DEFAULT_AVATAR);
    invalidAvatar.face.size = 3;
    const requestWithBody = (body) => ({
      headers: { cookie: `phg=${user.id}` },
      on(event, callback) {
        if (event === "data") callback(JSON.stringify(body));
        if (event === "end") callback();
      },
    });
    const route = routes.find(
      ({ method, path }) => method === "PUT" && path === "/api/users/me",
    );
    assert.ok(route);

    await assert.rejects(
      route.handler({
        req: requestWithBody({ settings: { avatar: invalidAvatar } }),
        res: { setHeader() {} },
        match: undefined,
        users: {},
        games: new Map(),
        broadcast: () => {},
        log: { context: {} },
      }),
      (error) => error instanceof HttpError && error.status === 400,
    );
    assert.equal(Store.loadUser(user.id)?.settings.avatar, undefined);

    await assert.rejects(
      route.handler({
        req: requestWithBody({ settings: [] }),
        res: { setHeader() {} },
        match: undefined,
        users: {},
        games: new Map(),
        broadcast: () => {},
        log: { context: {} },
      }),
      (error) => error instanceof HttpError && error.status === 400,
    );
  });
});
