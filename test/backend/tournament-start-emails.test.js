import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import { Readable } from "node:stream";
import { setImmediate } from "node:timers/promises";
import { createRoutes } from "../../src/backend/http-routes.js";
import {
  clearEmailSignInTokens,
  consumeEmailSignInToken,
  saveEmailSignInToken,
} from "../../src/backend/sign-in.js";
import { renderTournamentStartEmail } from "../../src/backend/tournament-start-email.js";
import { createMttContext, createUser } from "./mtt-test-context.js";

function createRequest(url, method, { body, cookie } = {}) {
  const req = Readable.from(body ? [JSON.stringify(body)] : []);
  req.url = url;
  req.method = method;
  req.headers = {
    host: "plutonpoker.com",
    "x-forwarded-proto": "https",
    ...(cookie && { cookie }),
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

async function callRoute(routes, method, path, { users, games, ...request }) {
  const route = routes.find(
    (candidate) =>
      candidate.method === method &&
      (typeof candidate.path === "string"
        ? candidate.path === path
        : candidate.path.test(path)),
  );
  assert.ok(route, `no route for ${method} ${path}`);
  const res = createResponse();
  await route.handler({
    req: createRequest(path, method, request),
    res,
    match: typeof route.path === "string" ? null : path.match(route.path),
    users,
    games,
    broadcast: () => {},
    log: { context: {} },
  });
  return res;
}

describe("tournament start emails", () => {
  const ctx = createMttContext();

  beforeEach(() => {
    process.env.APP_ORIGIN = "https://plutonpoker.com";
    ctx.setup();
    clearEmailSignInTokens();
  });

  afterEach(() => {
    delete process.env.APP_ORIGIN;
    clearEmailSignInTokens();
    ctx.teardown();
  });

  async function startMtt(owner, registrants, users) {
    const tournamentId = ctx.manager.createTournament({
      owner,
      buyIn: 500,
      tableSize: 6,
      maxRebuys: 0,
    });
    for (const registrant of registrants) {
      ctx.manager.registerPlayer(tournamentId, registrant);
    }
    const sent = [];
    const routes = createRoutes(users, ctx.games, () => {}, {
      mttManager: ctx.manager,
      sendTournamentStartEmail: async (email) => {
        sent.push(email);
      },
    });
    const res = await callRoute(
      routes,
      "POST",
      `/api/mtt/${tournamentId}/start`,
      { users, games: ctx.games, cookie: `phg=${owner.id}` },
    );
    await setImmediate();
    return { tournamentId, routes, sent, res };
  }

  it("emails every registered player but the owner who started the MTT", async () => {
    const owner = createUser("owner");
    const alice = createUser("alice");
    const bob = createUser("bob");

    const { res, sent } = await startMtt(owner, [alice, bob], {
      [owner.id]: owner,
      [alice.id]: alice,
      [bob.id]: bob,
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(sent.map((email) => email.toEmail).sort(), [
      "alice@example.com",
      "bob@example.com",
    ]);
    assert.equal(sent[0].tournamentName, "Multi-Table Tournament");
  });

  it("signs the player in from the start email and returns them to the tournament", async () => {
    const owner = createUser("owner");
    const alice = createUser("alice");
    const users = { [owner.id]: owner, [alice.id]: alice };
    const { tournamentId, routes, sent } = await startMtt(
      owner,
      [alice],
      users,
    );

    const link = new URL(sent[0].signInUrl);
    const res = await callRoute(routes, "POST", "/api/sign-in-links/verify", {
      users,
      games: ctx.games,
      body: { token: link.searchParams.get("token") },
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(JSON.parse(res.body), {
      returnPath: `/mtt/${tournamentId}`,
    });
    assert.match(String(res.headers["Set-Cookie"]), /phg=alice;/);
  });

  it("puts the tournament and the email in the link so an expired link can ask to sign in again", async () => {
    const owner = createUser("owner");
    const alice = createUser("alice");

    const { tournamentId, sent } = await startMtt(owner, [alice], {
      [owner.id]: owner,
      [alice.id]: alice,
    });

    const link = new URL(sent[0].signInUrl);
    assert.equal(link.pathname, "/auth/email-sign-in/callback");
    assert.equal(link.searchParams.get("fallback"), `/mtt/${tournamentId}`);
    assert.equal(link.searchParams.get("email"), "alice@example.com");
  });

  it("sends nothing, without failing the start, when an entrant has no email", async () => {
    const owner = createUser("owner");
    const missing = createUser("missing");

    const { res, sent } = await startMtt(owner, [missing], {
      [owner.id]: owner,
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(sent, []);
  });

  it("keeps a start link working after the player requests a sign-in link", async () => {
    const owner = createUser("owner");
    const alice = createUser("alice");
    const { sent } = await startMtt(owner, [alice], {
      [owner.id]: owner,
      [alice.id]: alice,
    });

    saveEmailSignInToken({
      token: "requested",
      userId: alice.id,
      email: alice.email,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      returnPath: "/",
    });

    const startToken = new URL(sent[0].signInUrl).searchParams.get("token");
    assert.equal(consumeEmailSignInToken(startToken)?.userId, alice.id);
    assert.equal(consumeEmailSignInToken("requested")?.userId, alice.id);
  });

  it("escapes the tournament name, which players choose", () => {
    const { html } = renderTournamentStartEmail({
      appOrigin: "https://plutonpoker.com",
      tournamentName: '<img src=x onerror="alert(1)">',
      signInUrl: "https://plutonpoker.com/auth/email-sign-in/callback?token=t",
      expiresInMinutes: 30,
    });

    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  });
});
