import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "assert";
import { stripVTControlCharacters } from "util";

function stripAnsi(value) {
  return stripVTControlCharacters(value);
}

describe("logger", function () {
  let originalEnv;
  let consoleLog;
  let consoleError;
  let consoleWarn;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };

    // Mock console methods
    consoleLog = mock.fn();
    consoleError = mock.fn();
    consoleWarn = mock.fn();
    console.log = consoleLog;
    console.error = consoleError;
    console.warn = consoleWarn;
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;

    // Reset mocks
    mock.reset();
  });

  describe("log emission", function () {
    it("emits debug and info messages without filtering", async function () {
      process.env.LOG_FORMAT = "text";

      const { debug, info } = await import(
        `../../src/backend/logger.js?t=${Date.now()}-1`
      );

      debug("debug message");
      info("info message");

      const calls = consoleLog.mock.calls;
      assert.strictEqual(calls.length, 2);
      assert.ok(calls[0].arguments[0].includes("DEBUG"));
      assert.ok(calls[1].arguments[0].includes("INFO"));
    });

    it("emits info, warn, and error messages regardless of LOG_LEVEL", async function () {
      process.env.LOG_LEVEL = "error";
      process.env.LOG_FORMAT = "text";

      const { info, warn, error } = await import(
        `../../src/backend/logger.js?t=${Date.now()}-2`
      );

      info("info message");
      warn("warn message");
      error("error message");

      assert.strictEqual(consoleLog.mock.calls.length, 1);
      assert.strictEqual(consoleWarn.mock.calls.length, 1);
      assert.strictEqual(consoleError.mock.calls.length, 1);
      assert.ok(consoleLog.mock.calls[0].arguments[0].includes("INFO"));
      assert.ok(consoleWarn.mock.calls[0].arguments[0].includes("WARN"));
      assert.ok(consoleError.mock.calls[0].arguments[0].includes("ERROR"));
    });
  });

  describe("output format", function () {
    it("outputs text format with key=value pairs", async function () {
      process.env.LOG_FORMAT = "text";

      const { info } = await import(
        `../../src/backend/logger.js?t=${Date.now()}-5`
      );

      info("test message", { foo: "bar", count: 42 });

      const output = consoleLog.mock.calls[0].arguments[0];
      assert.ok(output.includes("\u001b["));
      const plainOutput = stripAnsi(output);
      assert.ok(plainOutput.includes("INFO"));
      assert.ok(plainOutput.includes("test message"));
      assert.ok(plainOutput.includes("foo=bar"));
      assert.ok(plainOutput.includes("count=42"));
    });

    it("adds ANSI colors in text mode", async function () {
      process.env.LOG_FORMAT = "text";

      const { warn } = await import(
        `../../src/backend/logger.js?t=${Date.now()}-5-color`
      );

      warn("test message", { foo: "bar" });

      const output = consoleWarn.mock.calls[0].arguments[0];
      assert.ok(output.includes("\u001b["));
      assert.ok(output.includes("test message"));
      assert.ok(output.includes("foo"));
    });

    it("outputs JSON format with all fields", async function () {
      process.env.LOG_FORMAT = "json";

      const { info } = await import(
        `../../src/backend/logger.js?t=${Date.now()}-6`
      );

      info("test message", { foo: "bar", count: 42 });

      const output = consoleLog.mock.calls[0].arguments[0];
      const parsed = JSON.parse(output);

      assert.strictEqual(parsed.level, "info");
      assert.strictEqual(parsed.message, "test message");
      assert.strictEqual(parsed.foo, "bar");
      assert.strictEqual(parsed.count, 42);
      assert.ok(parsed.timestamp);
    });
  });

  describe("console method routing", function () {
    it("routes error level to console.error", async function () {
      process.env.LOG_FORMAT = "text";

      const { error } = await import(
        `../../src/backend/logger.js?t=${Date.now()}-10`
      );

      error("error message");

      assert.strictEqual(consoleError.mock.calls.length, 1);
      assert.strictEqual(consoleLog.mock.calls.length, 0);
    });

    it("routes warn level to console.warn", async function () {
      process.env.LOG_FORMAT = "text";

      const { warn } = await import(
        `../../src/backend/logger.js?t=${Date.now()}-11`
      );

      warn("warn message");

      assert.strictEqual(consoleWarn.mock.calls.length, 1);
      assert.strictEqual(consoleLog.mock.calls.length, 0);
    });

    it("routes info and debug to console.log", async function () {
      process.env.LOG_FORMAT = "text";

      const { debug, info } = await import(
        `../../src/backend/logger.js?t=${Date.now()}-12`
      );

      debug("debug message");
      info("info message");

      assert.strictEqual(consoleLog.mock.calls.length, 2);
    });
  });

  describe("createLog and emitLog", function () {
    it("creates a plain object with level, message, timestamp, and context", async function () {
      const { createLog } = await import(
        `../../src/backend/logger.js?t=${Date.now()}-13`
      );

      const log = createLog("test_log");

      assert.strictEqual(log.level, "info");
      assert.strictEqual(log.message, "test_log");
      assert.strictEqual(typeof log.timestamp, "number");
      assert.deepStrictEqual(log.context, {});
    });

    it("accumulates context via Object.assign", async function () {
      process.env.LOG_FORMAT = "json";

      const { createLog, emitLog } = await import(
        `../../src/backend/logger.js?t=${Date.now()}-14`
      );

      const log = createLog("test_log");
      Object.assign(log.context, { foo: "bar" });
      Object.assign(log.context, { count: 42 });
      emitLog(log);

      const output = consoleLog.mock.calls[0].arguments[0];
      const parsed = JSON.parse(output);

      assert.strictEqual(parsed.message, "test_log");
      assert.strictEqual(parsed.foo, "bar");
      assert.strictEqual(parsed.count, 42);
    });

    it("later assigns override earlier context", async function () {
      process.env.LOG_FORMAT = "json";

      const { createLog, emitLog } = await import(
        `../../src/backend/logger.js?t=${Date.now()}-15`
      );

      const log = createLog("test_log");
      log.context.status = "pending";
      log.context.status = "done";
      emitLog(log);

      const parsed = JSON.parse(consoleLog.mock.calls[0].arguments[0]);
      assert.strictEqual(parsed.status, "done");
    });

    it("includes durationMs on emit", async function () {
      process.env.LOG_FORMAT = "json";

      const { createLog, emitLog } = await import(
        `../../src/backend/logger.js?t=${Date.now()}-16`
      );

      const log = createLog("test_log");
      emitLog(log);

      const parsed = JSON.parse(consoleLog.mock.calls[0].arguments[0]);
      assert.strictEqual(typeof parsed.durationMs, "number");
      assert.ok(parsed.durationMs >= 0);
    });

    it("emitLog produces exactly one log line", async function () {
      process.env.LOG_FORMAT = "json";

      const { createLog, emitLog } = await import(
        `../../src/backend/logger.js?t=${Date.now()}-17`
      );

      const log = createLog("test_log");
      log.context.a = 1;
      log.context.b = 2;

      assert.strictEqual(consoleLog.mock.calls.length, 0);
      emitLog(log);
      assert.strictEqual(consoleLog.mock.calls.length, 1);
    });
  });

  describe("session context", function () {
    it("marks users with a verified email as signed in", async function () {
      const { getSessionPlayerLogContext } = await import(
        `../../src/backend/logger.js?t=${Date.now()}-18`
      );

      assert.deepStrictEqual(
        getSessionPlayerLogContext({
          id: "user-1",
          name: "Alice",
          email: "alice@example.com",
          settings: { volume: 0.75 },
        }),
        {
          session: {
            playerId: "user-1",
            playerName: "Alice",
            signedIn: true,
          },
        },
      );
    });
  });
});
