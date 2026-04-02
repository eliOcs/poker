import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import {
  getOrCreateUser,
  logFrontendErrorReport,
} from "../../src/backend/http-routes.js";
import * as Store from "../../src/backend/store.js";

describe("http-routes", () => {
  let originalConsoleError;

  beforeEach(() => {
    Store._reset();
    Store.initialize(":memory:");
    originalConsoleError = console.error;
  });

  afterEach(() => {
    console.error = originalConsoleError;
    Store.close();
  });

  it("adds session player context to the request log for an existing session user", () => {
    const user = {
      id: "user-1",
      name: "Alice",
      settings: { volume: 0.75, vibration: true },
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
        signedIn: false,
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
    assert.strictEqual(log.context.session.signedIn, false);
    assert.ok(log.context.userCreateRateLimit);
    assert.strictEqual(headers[0][0], "Set-Cookie");
  });

  it("logs frontend errors with session and client context", () => {
    /** @type {string[]} */
    const lines = [];
    console.error = (line) => lines.push(String(line));

    logFrontendErrorReport(
      {
        url: "/api/client-errors",
        method: "POST",
      },
      {
        id: "user-1",
        name: "Alice",
        settings: { volume: 0.75, vibration: true },
      },
      {
        type: "unhandledrejection",
        message: "Cannot read properties of undefined",
        stack: "TypeError: Cannot read properties of undefined",
        route: "/cash/abc123",
        gameId: "abc123",
        line: 12,
        column: 9,
        source: "window.unhandledrejection",
      },
    );

    assert.equal(lines.length, 1);
    assert.match(lines[0], /frontend_error/);
    assert.match(lines[0], /playerId":"user-1"/);
    assert.match(lines[0], /"gameId":"abc123"/);
    assert.match(lines[0], /"route":"\/cash\/abc123"/);
  });

  it("rejects frontend error reports without a message", () => {
    assert.throws(
      () =>
        logFrontendErrorReport(
          {
            url: "/api/client-errors",
            method: "POST",
          },
          {
            id: "user-1",
            name: "Alice",
            settings: { volume: 0.75, vibration: true },
          },
          { type: "error" },
        ),
      /Frontend error message is required/,
    );
  });
});
