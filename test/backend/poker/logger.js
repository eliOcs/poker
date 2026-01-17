import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "assert";

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

  describe("log level filtering", function () {
    it("filters out debug messages when level is info", async function () {
      process.env.LOG_LEVEL = "info";
      process.env.LOG_FORMAT = "text";

      // Re-import to pick up new env
      const { debug, info } = await import(
        `../../../src/backend/logger.js?t=${Date.now()}-1`
      );

      debug("debug message");
      info("info message");

      // debug should be filtered out, info should be logged
      const calls = consoleLog.mock.calls;
      assert.strictEqual(calls.length, 1);
      assert.ok(calls[0].arguments[0].includes("INFO"));
      assert.ok(calls[0].arguments[0].includes("info message"));
    });

    it("shows debug messages when level is debug", async function () {
      process.env.LOG_LEVEL = "debug";
      process.env.LOG_FORMAT = "text";

      const { debug, info } = await import(
        `../../../src/backend/logger.js?t=${Date.now()}-2`
      );

      debug("debug message");
      info("info message");

      const calls = consoleLog.mock.calls;
      assert.strictEqual(calls.length, 2);
      assert.ok(calls[0].arguments[0].includes("DEBUG"));
      assert.ok(calls[1].arguments[0].includes("INFO"));
    });

    it("filters info and debug when level is warn", async function () {
      process.env.LOG_LEVEL = "warn";
      process.env.LOG_FORMAT = "text";

      const { debug, info, warn } = await import(
        `../../../src/backend/logger.js?t=${Date.now()}-3`
      );

      debug("debug message");
      info("info message");
      warn("warn message");

      const warnCalls = consoleWarn.mock.calls;
      assert.strictEqual(consoleLog.mock.calls.length, 0);
      assert.strictEqual(warnCalls.length, 1);
      assert.ok(warnCalls[0].arguments[0].includes("WARN"));
    });

    it("only shows error when level is error", async function () {
      process.env.LOG_LEVEL = "error";
      process.env.LOG_FORMAT = "text";

      const { debug, info, warn, error } = await import(
        `../../../src/backend/logger.js?t=${Date.now()}-4`
      );

      debug("debug message");
      info("info message");
      warn("warn message");
      error("error message");

      assert.strictEqual(consoleLog.mock.calls.length, 0);
      assert.strictEqual(consoleWarn.mock.calls.length, 0);
      assert.strictEqual(consoleError.mock.calls.length, 1);
      assert.ok(consoleError.mock.calls[0].arguments[0].includes("ERROR"));
    });
  });

  describe("output format", function () {
    it("outputs text format with key=value pairs", async function () {
      process.env.LOG_LEVEL = "info";
      process.env.LOG_FORMAT = "text";

      const { info } = await import(
        `../../../src/backend/logger.js?t=${Date.now()}-5`
      );

      info("test message", { foo: "bar", count: 42 });

      const output = consoleLog.mock.calls[0].arguments[0];
      assert.ok(output.includes("INFO"));
      assert.ok(output.includes("test message"));
      assert.ok(output.includes("foo=bar"));
      assert.ok(output.includes("count=42"));
    });

    it("outputs JSON format with all fields", async function () {
      process.env.LOG_LEVEL = "info";
      process.env.LOG_FORMAT = "json";

      const { info } = await import(
        `../../../src/backend/logger.js?t=${Date.now()}-6`
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

  describe("child logger", function () {
    it("includes base context in all log calls", async function () {
      process.env.LOG_LEVEL = "info";
      process.env.LOG_FORMAT = "json";

      const { child } = await import(
        `../../../src/backend/logger.js?t=${Date.now()}-7`
      );

      const gameLogger = child({ gameId: "abc123", handNumber: 5 });

      gameLogger.info("player action", { action: "bet" });

      const output = consoleLog.mock.calls[0].arguments[0];
      const parsed = JSON.parse(output);

      assert.strictEqual(parsed.gameId, "abc123");
      assert.strictEqual(parsed.handNumber, 5);
      assert.strictEqual(parsed.action, "bet");
      assert.strictEqual(parsed.message, "player action");
    });

    it("allows call-time context to override base context", async function () {
      process.env.LOG_LEVEL = "info";
      process.env.LOG_FORMAT = "json";

      const { child } = await import(
        `../../../src/backend/logger.js?t=${Date.now()}-8`
      );

      const gameLogger = child({ gameId: "abc123", value: "original" });

      gameLogger.info("test", { value: "overridden" });

      const output = consoleLog.mock.calls[0].arguments[0];
      const parsed = JSON.parse(output);

      assert.strictEqual(parsed.value, "overridden");
    });

    it("child logger respects log levels", async function () {
      process.env.LOG_LEVEL = "warn";
      process.env.LOG_FORMAT = "text";

      const { child } = await import(
        `../../../src/backend/logger.js?t=${Date.now()}-9`
      );

      const gameLogger = child({ gameId: "abc123" });

      gameLogger.debug("debug");
      gameLogger.info("info");
      gameLogger.warn("warn");
      gameLogger.error("error");

      assert.strictEqual(consoleLog.mock.calls.length, 0);
      assert.strictEqual(consoleWarn.mock.calls.length, 1);
      assert.strictEqual(consoleError.mock.calls.length, 1);
    });
  });

  describe("console method routing", function () {
    it("routes error level to console.error", async function () {
      process.env.LOG_LEVEL = "debug";
      process.env.LOG_FORMAT = "text";

      const { error } = await import(
        `../../../src/backend/logger.js?t=${Date.now()}-10`
      );

      error("error message");

      assert.strictEqual(consoleError.mock.calls.length, 1);
      assert.strictEqual(consoleLog.mock.calls.length, 0);
    });

    it("routes warn level to console.warn", async function () {
      process.env.LOG_LEVEL = "debug";
      process.env.LOG_FORMAT = "text";

      const { warn } = await import(
        `../../../src/backend/logger.js?t=${Date.now()}-11`
      );

      warn("warn message");

      assert.strictEqual(consoleWarn.mock.calls.length, 1);
      assert.strictEqual(consoleLog.mock.calls.length, 0);
    });

    it("routes info and debug to console.log", async function () {
      process.env.LOG_LEVEL = "debug";
      process.env.LOG_FORMAT = "text";

      const { debug, info } = await import(
        `../../../src/backend/logger.js?t=${Date.now()}-12`
      );

      debug("debug message");
      info("info message");

      assert.strictEqual(consoleLog.mock.calls.length, 2);
    });
  });
});
