import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { getOrCreateUser } from "../../src/backend/http-routes.js";
import * as Store from "../../src/backend/store.js";

describe("http-routes", () => {
  beforeEach(() => {
    Store._reset();
    Store.initialize(":memory:");
  });

  afterEach(() => {
    Store.close();
  });

  it("adds session player context to the request log for an existing session user", () => {
    const user = {
      id: "user-1",
      name: "Alice",
      settings: { volume: 0.75 },
    };
    const users = { [user.id]: user };
    const req = { headers: { cookie: "phg=user-1" } };
    const res = { setHeader() {} };
    const log = { context: {} };

    const resolvedUser = getOrCreateUser(req, res, users, log);

    assert.strictEqual(resolvedUser, user);
    assert.deepStrictEqual(log.context, {
      session: {
        playerId: "user-1",
        playerName: "Alice",
      },
    });
  });

  it("adds session player context to the request log when creating a new session user", () => {
    const users = {};
    /** @type {Array<[string, string]>} */
    const headers = [];
    const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
    const res = {
      setHeader(name, value) {
        headers.push([name, value]);
      },
    };
    const log = { context: {} };

    const resolvedUser = getOrCreateUser(req, res, users, log);

    assert.ok(resolvedUser.id);
    assert.strictEqual(users[resolvedUser.id], resolvedUser);
    assert.strictEqual(log.context.session.playerId, resolvedUser.id);
    assert.strictEqual(log.context.session.playerName, null);
    assert.ok(log.context.userCreateRateLimit);
    assert.strictEqual(headers[0][0], "Set-Cookie");
  });
});
