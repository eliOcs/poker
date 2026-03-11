import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import { Readable } from "node:stream";
import { createRoutes } from "../../src/backend/http-routes.js";
import { clearEmailSignInTokens } from "../../src/backend/sign-in.js";
import * as Store from "../../src/backend/store.js";

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
    Store.initialize(":memory:");
    clearEmailSignInTokens();
  });

  afterEach(() => {
    delete process.env.APP_ORIGIN;
    clearEmailSignInTokens();
    Store.close();
  });

  it("sends a sign-in email with a verification link", async () => {
    const users = {};
    const sentEmails = [];
    const routes = createRoutes(users, new Map(), () => {}, {
      sendSignInEmail: async (payload) => {
        sentEmails.push(payload);
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
      log: { context: {} },
    });

    assert.equal(res.statusCode, 204);
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].toEmail, "player@example.com");
    assert.match(
      sentEmails[0].signInUrl,
      /^https:\/\/plutonpoker\.com\/auth\/email-sign-in\/verify\?token=/,
    );
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
    const verifyRoute = routes.find(
      (route) =>
        route.method === "GET" &&
        String(route.path) ===
          String(/^\/auth\/email-sign-in\/verify(?:\?.*)?$/),
    );

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

    const verifyReq = createRequest(
      `/auth/email-sign-in/verify?token=${encodeURIComponent(String(token))}`,
      "GET",
    );
    const verifyRes = createResponse();
    await verifyRoute.handler({
      req: verifyReq,
      res: verifyRes,
      match: null,
      users,
      games: new Map(),
      broadcast: () => {},
      log: null,
    });

    assert.equal(verifyRes.statusCode, 302);
    assert.equal(verifyRes.headers.Location, "/games/test-game?buyin=50");
    assert.match(
      String(verifyRes.headers["Set-Cookie"]),
      new RegExp(originalUserId),
    );
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
    const verifyRoute = routes.find(
      (route) =>
        route.method === "GET" &&
        String(route.path) ===
          String(/^\/auth\/email-sign-in\/verify(?:\?.*)?$/),
    );

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
    const verifyReq = createRequest(
      `/auth/email-sign-in/verify?token=${encodeURIComponent(String(token))}`,
      "GET",
    );
    const verifyRes = createResponse();
    await verifyRoute.handler({
      req: verifyReq,
      res: verifyRes,
      match: null,
      users,
      games: new Map(),
      broadcast: () => {},
      log: null,
    });

    assert.equal(verifyRes.statusCode, 302);
    assert.equal(verifyRes.headers.Location, "/");
  });
});
