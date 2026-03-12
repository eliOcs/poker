import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import { Readable } from "node:stream";
import { readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRoutes } from "../../src/backend/http-routes.js";
import { clearEmailSignInTokens } from "../../src/backend/sign-in.js";
import * as Store from "../../src/backend/store.js";
import * as PokerGame from "../../src/backend/poker/game.js";
import * as Seat from "../../src/backend/poker/seat.js";
import { createTempDataDir } from "./temp-data-dir.js";

let testDataDir;

function createLog() {
  return { context: {} };
}

function createRequest(url, method, body = null) {
  const req = Readable.from(body ? [JSON.stringify(body)] : []);
  req.url = url;
  req.method = method;
  req.headers = {
    host: "plutonpoker.com",
    "x-forwarded-proto": "https",
  };
  req.socket = { remoteAddress: "127.0.0.1" };
  return req;
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
    },
    writeHead(statusCode, headers = {}) {
      this.statusCode = statusCode;
      Object.assign(this.headers, headers);
    },
    end(chunk = "") {
      this.body += String(chunk);
    },
  };
}

function findRoute(routes, method, path) {
  return routes.find(
    (route) => route.method === method && String(route.path) === String(path),
  );
}

describe("http-routes sign in", () => {
  beforeEach(() => {
    process.env.APP_ORIGIN = "https://plutonpoker.com";
    Store._reset();
  });

  beforeEach(async () => {
    testDataDir = await createTempDataDir();
    process.env.DATA_DIR = testDataDir;
    Store.initialize();
    clearEmailSignInTokens();
  });

  afterEach(async () => {
    delete process.env.APP_ORIGIN;
    delete process.env.DATA_DIR;
    clearEmailSignInTokens();
    Store.close();
    if (existsSync(testDataDir)) {
      await rm(testDataDir, { recursive: true, force: true });
    }
  });

  it("sends a sign-in email with a verification link", async () => {
    const users = {};
    const sentEmails = [];
    const log = { context: {} };
    const routes = createRoutes(users, new Map(), () => {}, {
      sendSignInEmail: async (payload) => {
        sentEmails.push(payload);
        return {
          kind: "sign_in",
          provider: "test",
          toEmail: payload.toEmail,
        };
      },
    });
    const route = findRoute(routes, "POST", "/api/sign-in-links");

    const req = createRequest("/api/sign-in-links", "POST", {
      email: "Player@Example.com",
      returnPath: "/games/abc123?buyin=1#seat-3",
    });
    const res = createResponse();

    await route.handler({
      req,
      res,
      match: null,
      users,
      games: new Map(),
      broadcast: () => {},
      log,
    });

    assert.equal(res.statusCode, 204);
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].toEmail, "player@example.com");
    assert.match(
      sentEmails[0].signInUrl,
      /^https:\/\/plutonpoker\.com\/auth\/email-sign-in\/callback\?token=/,
    );
    assert.deepEqual(log.context.email, {
      kind: "sign_in",
      provider: "test",
      toEmail: "player@example.com",
    });
  });

  it("verifies a sign-in token and restores the original user session", async () => {
    const users = {};
    let signInUrl = "";
    const routes = createRoutes(users, new Map(), () => {}, {
      sendSignInEmail: async (payload) => {
        signInUrl = payload.signInUrl;
      },
    });
    const requestRoute = findRoute(routes, "POST", "/api/sign-in-links");
    const verifyRoute = findRoute(routes, "POST", "/api/sign-in-links/verify");

    const requestReq = createRequest("/api/sign-in-links", "POST", {
      email: "player@example.com",
      returnPath: "/games/test-game?buyin=50",
    });
    const requestRes = createResponse();
    await requestRoute.handler({
      req: requestReq,
      res: requestRes,
      match: null,
      users,
      games: new Map(),
      broadcast: () => {},
      log: { context: {} },
    });

    const originalCookie = String(requestRes.headers["Set-Cookie"]);
    const originalUserId = originalCookie.match(/phg=([^;]+)/)?.[1];
    const token = new URL(signInUrl).searchParams.get("token");

    const verifyReq = createRequest("/api/sign-in-links/verify", "POST", {
      token,
    });
    const verifyRes = createResponse();
    await verifyRoute.handler({
      req: verifyReq,
      res: verifyRes,
      match: null,
      users,
      games: new Map(),
      broadcast: () => {},
      log: createLog(),
    });

    assert.equal(verifyRes.statusCode, 200);
    assert.deepEqual(JSON.parse(verifyRes.body), {
      returnPath: "/games/test-game?buyin=50",
    });
    assert.match(
      String(verifyRes.headers["Set-Cookie"]),
      new RegExp(originalUserId),
    );
    assert.equal(Store.loadUser(originalUserId)?.email, "player@example.com");
  });

  it("merges the guest session into an existing signed-in account for the same email", async () => {
    const users = {};
    const games = new Map();
    let signInUrl = "";
    let broadcastedGameId = null;
    const ws = {};
    const clientConnections = new Map();

    Store.saveUser({
      id: "registered-user",
      name: "Registered",
      email: "player@example.com",
      settings: { volume: 0.25 },
    });

    const routes = createRoutes(
      users,
      games,
      (gameId) => {
        broadcastedGameId = gameId;
      },
      {
        sendSignInEmail: async (payload) => {
          signInUrl = payload.signInUrl;
        },
        clientConnections,
      },
    );
    const requestRoute = findRoute(routes, "POST", "/api/sign-in-links");
    const verifyRoute = findRoute(routes, "POST", "/api/sign-in-links/verify");

    const requestReq = createRequest("/api/sign-in-links", "POST", {
      email: "player@example.com",
      returnPath: "/games/test-game",
    });
    const requestRes = createResponse();
    await requestRoute.handler({
      req: requestReq,
      res: requestRes,
      match: null,
      users,
      games,
      broadcast: () => {},
      log: { context: {} },
    });

    const guestUserId = String(requestRes.headers["Set-Cookie"]).match(
      /phg=([^;]+)/,
    )?.[1];
    assert.ok(guestUserId);

    Store.recordPlayerGames([{ playerId: guestUserId, gameId: "test-game" }]);
    const game = PokerGame.create({ seats: 2 });
    game.id = "test-game";
    game.seats[0] = Seat.occupied({ id: guestUserId, name: "Guest" }, 5000);
    games.set(game.id, game);

    const guestUser = Store.loadUser(guestUserId);
    clientConnections.set(ws, { user: guestUser, gameId: game.id });

    const token = new URL(signInUrl).searchParams.get("token");
    const verifyReq = createRequest("/api/sign-in-links/verify", "POST", {
      token,
    });
    const verifyRes = createResponse();
    await verifyRoute.handler({
      req: verifyReq,
      res: verifyRes,
      match: null,
      users,
      games,
      broadcast: (gameId) => {
        broadcastedGameId = gameId;
      },
      log: createLog(),
    });

    assert.equal(verifyRes.statusCode, 200);
    assert.deepEqual(JSON.parse(verifyRes.body), {
      returnPath: "/games/test-game",
    });
    assert.match(String(verifyRes.headers["Set-Cookie"]), /registered-user/);
    assert.equal(
      Store.loadUser("registered-user")?.email,
      "player@example.com",
    );
    assert.equal(Store.loadUser("registered-user")?.name, "Registered");
    assert.equal(Store.loadUser(guestUserId), null);
    assert.equal(users[guestUserId], undefined);
    assert.equal(users["registered-user"]?.id, "registered-user");
    assert.deepStrictEqual(Store.listPlayerGameIds("registered-user"), [
      "test-game",
    ]);
    assert.deepStrictEqual(Store.listPlayerGameIds(guestUserId), []);
    assert.equal(game.seats[0].empty, false);
    if (!game.seats[0].empty) {
      assert.equal(game.seats[0].player.id, "registered-user");
      assert.equal(game.seats[0].player.name, "Registered");
      assert.equal(game.seats[0].disconnected, false);
    }
    assert.equal(clientConnections.get(ws)?.user.id, "registered-user");
    assert.equal(broadcastedGameId, "test-game");
  });

  it("rewrites persisted hand history from guest id to registered id during merge", async () => {
    const users = {};
    const games = new Map();
    let signInUrl = "";

    Store.saveUser({
      id: "registered-user",
      name: "Registered",
      email: "player@example.com",
      settings: { volume: 0.25 },
    });

    await writeFile(
      `${testDataDir}/history-game.ohh`,
      `${JSON.stringify({
        ohh: {
          spec_version: "1.4.6",
          site_name: "Pluton Poker",
          game_number: "history-game-1",
          start_date_utc: "2026-03-07T12:00:00.000Z",
          game_type: "Holdem",
          bet_limit: { bet_type: "NL" },
          table_size: 2,
          dealer_seat: 1,
          small_blind_amount: 0.25,
          big_blind_amount: 0.5,
          ante_amount: 0,
          players: [
            {
              id: "guest-placeholder",
              seat: 1,
              name: "Guest",
              starting_stack: 10,
            },
            { id: "villain", seat: 2, name: "Villain", starting_stack: 10 },
          ],
          rounds: [
            {
              id: 0,
              street: "Preflop",
              actions: [
                {
                  action_number: 1,
                  player_id: "guest-placeholder",
                  action: "Post SB",
                  amount: 0.25,
                },
              ],
            },
          ],
          pots: [
            {
              number: 0,
              amount: 0.75,
              winning_hand: null,
              winning_cards: null,
              player_wins: [
                {
                  player_id: "guest-placeholder",
                  win_amount: 0.75,
                  contributed_rake: 0,
                },
              ],
            },
          ],
        },
      })}\n\n`,
      "utf8",
    );

    const routes = createRoutes(users, games, () => {}, {
      sendSignInEmail: async (payload) => {
        signInUrl = payload.signInUrl;
      },
      clientConnections: new Map(),
    });
    const requestRoute = findRoute(routes, "POST", "/api/sign-in-links");
    const verifyRoute = findRoute(routes, "POST", "/api/sign-in-links/verify");

    const requestReq = createRequest("/api/sign-in-links", "POST", {
      email: "player@example.com",
      returnPath: "/games/history-game",
    });
    const requestRes = createResponse();
    await requestRoute.handler({
      req: requestReq,
      res: requestRes,
      match: null,
      users,
      games,
      broadcast: () => {},
      log: { context: {} },
    });

    const guestUserId = String(requestRes.headers["Set-Cookie"]).match(
      /phg=([^;]+)/,
    )?.[1];
    assert.ok(guestUserId);

    Store.recordPlayerGames([
      { playerId: guestUserId, gameId: "history-game" },
    ]);

    const originalHistory = await Store.listPlayerGameIds(guestUserId);
    assert.deepStrictEqual(originalHistory, ["history-game"]);

    const originalFile = await readFile(
      `${testDataDir}/history-game.ohh`,
      "utf8",
    );
    await writeFile(
      `${testDataDir}/history-game.ohh`,
      originalFile.replaceAll("guest-placeholder", guestUserId),
      "utf8",
    );

    const token = new URL(signInUrl).searchParams.get("token");
    const verifyReq = createRequest("/api/sign-in-links/verify", "POST", {
      token,
    });
    const verifyRes = createResponse();
    await verifyRoute.handler({
      req: verifyReq,
      res: verifyRes,
      match: null,
      users,
      games,
      broadcast: () => {},
      log: createLog(),
    });

    const rewritten = await readFile(`${testDataDir}/history-game.ohh`, "utf8");
    assert.equal(rewritten.includes(guestUserId), false);
    assert.equal(rewritten.includes("registered-user"), true);
  });

  it("falls back to root when the requested return path is not relative", async () => {
    const users = {};
    let signInUrl = "";
    const routes = createRoutes(users, new Map(), () => {}, {
      sendSignInEmail: async (payload) => {
        signInUrl = payload.signInUrl;
      },
    });
    const requestRoute = findRoute(routes, "POST", "/api/sign-in-links");
    const verifyRoute = findRoute(routes, "POST", "/api/sign-in-links/verify");

    const requestReq = createRequest("/api/sign-in-links", "POST", {
      email: "player@example.com",
      returnPath: "https://evil.example/steal",
    });
    const requestRes = createResponse();
    await requestRoute.handler({
      req: requestReq,
      res: requestRes,
      match: null,
      users,
      games: new Map(),
      broadcast: () => {},
      log: { context: {} },
    });

    const token = new URL(signInUrl).searchParams.get("token");
    const verifyReq = createRequest("/api/sign-in-links/verify", "POST", {
      token,
    });
    const verifyRes = createResponse();
    await verifyRoute.handler({
      req: verifyReq,
      res: verifyRes,
      match: null,
      users,
      games: new Map(),
      broadcast: () => {},
      log: createLog(),
    });

    assert.equal(verifyRes.statusCode, 200);
    assert.deepEqual(JSON.parse(verifyRes.body), {
      returnPath: "/",
    });
  });

  it("returns an error when the sign-in token is invalid", async () => {
    const users = {};
    const routes = createRoutes(users, new Map(), () => {}, {});
    const verifyRoute = findRoute(routes, "POST", "/api/sign-in-links/verify");

    const verifyReq = createRequest("/api/sign-in-links/verify", "POST", {
      token: "invalid-token",
    });
    const verifyRes = createResponse();
    await assert.rejects(() =>
      verifyRoute.handler({
        req: verifyReq,
        res: verifyRes,
        match: null,
        users,
        games: new Map(),
        broadcast: () => {},
        log: createLog(),
      }),
    );
  });
});
