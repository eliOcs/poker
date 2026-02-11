import { afterEach, describe, it } from "node:test";
import assert from "node:assert";
import {
  createRateLimiter,
  getClientIp,
  getRateLimitWindowMs,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  isTrustedProxyIp,
} from "../../src/backend/rate-limit.js";

const originalTimerSpeed = process.env.TIMER_SPEED;
const originalTrustedProxyCidrs = process.env.TRUSTED_PROXY_CIDRS;

afterEach(() => {
  if (originalTimerSpeed === undefined) {
    delete process.env.TIMER_SPEED;
  } else {
    process.env.TIMER_SPEED = originalTimerSpeed;
  }

  if (originalTrustedProxyCidrs === undefined) {
    delete process.env.TRUSTED_PROXY_CIDRS;
  } else {
    process.env.TRUSTED_PROXY_CIDRS = originalTrustedProxyCidrs;
  }
});

function silentLogger() {
  return {
    logInfo: () => {},
    logWarn: () => {},
    monitorEvery: 0,
  };
}

describe("rate-limit", () => {
  describe("createRateLimiter", () => {
    it("allows up to max actions within the window and blocks the next one", () => {
      const limiter = createRateLimiter({
        maxActions: 3,
        windowMs: 1_000,
        cleanupInterval: 10_000,
        ...silentLogger(),
      });

      assert.strictEqual(limiter.check("127.0.0.1", 0).allowed, true);
      assert.strictEqual(limiter.check("127.0.0.1", 100).allowed, true);
      assert.strictEqual(limiter.check("127.0.0.1", 200).allowed, true);

      const blocked = limiter.check("127.0.0.1", 300);
      assert.strictEqual(blocked.allowed, false);
      assert.ok(blocked.retryAfterMs > 0);
    });

    it("allows requests again after the window expires", () => {
      const limiter = createRateLimiter({
        maxActions: 2,
        windowMs: 1_000,
        cleanupInterval: 10_000,
        ...silentLogger(),
      });

      assert.strictEqual(limiter.check("127.0.0.1", 0).allowed, true);
      assert.strictEqual(limiter.check("127.0.0.1", 100).allowed, true);
      assert.strictEqual(limiter.check("127.0.0.1", 200).allowed, false);

      assert.strictEqual(limiter.check("127.0.0.1", 1_101).allowed, true);
    });

    it("cleans up stale IP entries over time", () => {
      const limiter = createRateLimiter({
        maxActions: 1,
        windowMs: 100,
        cleanupInterval: 1,
        ...silentLogger(),
      });

      limiter.check("10.0.0.1", 0);
      limiter.check("10.0.0.2", 0);
      assert.strictEqual(limiter.getEntryCount(), 2);

      limiter.check("10.0.0.3", 500);
      assert.strictEqual(limiter.getEntryCount(), 1);
    });

    it("logs monitor stats and blocked actions", () => {
      /** @type {Array<{ message: string, context?: Record<string, unknown> }>} */
      const infoLogs = [];
      /** @type {Array<{ message: string, context?: Record<string, unknown> }>} */
      const warnLogs = [];

      const limiter = createRateLimiter({
        maxActions: 1,
        windowMs: 1_000,
        cleanupInterval: 100,
        monitorEvery: 2,
        logInfo: (message, context) => infoLogs.push({ message, context }),
        logWarn: (message, context) => warnLogs.push({ message, context }),
      });

      limiter.check("127.0.0.1", { now: 0, source: "http" });
      limiter.check("127.0.0.1", { now: 1, source: "ws-action" });

      assert.strictEqual(warnLogs.length, 1);
      assert.strictEqual(warnLogs[0].message, "rate limit exceeded");
      assert.strictEqual(warnLogs[0].context?.source, "ws-action");

      const statsLog = infoLogs.find(
        (entry) => entry.message === "rate limiter stats",
      );
      assert.ok(statsLog);
      assert.strictEqual(statsLog.context?.totalChecks, 2);
      assert.strictEqual(statsLog.context?.totalBlocked, 1);
    });

    it("keeps an offender blocked for the configured lockout duration", () => {
      const limiter = createRateLimiter({
        maxActions: 1,
        windowMs: 1_000,
        blockDurationMs: 30_000,
        cleanupInterval: 100,
        ...silentLogger(),
      });

      assert.strictEqual(
        limiter.check("127.0.0.1", { now: 0, source: "http" }).allowed,
        true,
      );
      const blocked = limiter.check("127.0.0.1", { now: 1, source: "http" });
      assert.strictEqual(blocked.allowed, false);
      assert.ok(blocked.retryAfterMs >= 30_000 - 1);

      // Still blocked even after the 1s rolling window has expired.
      assert.strictEqual(
        limiter.check("127.0.0.1", { now: 2_000, source: "http" }).allowed,
        false,
      );

      // Unblocked after lockout duration.
      assert.strictEqual(
        limiter.check("127.0.0.1", { now: 30_002, source: "http" }).allowed,
        true,
      );
    });
  });

  describe("getRateLimitWindowMs", () => {
    it("uses TIMER_SPEED to shorten the limiter window", () => {
      process.env.TIMER_SPEED = "10";
      assert.strictEqual(getRateLimitWindowMs(), 6_000);
    });

    it("falls back to default window when TIMER_SPEED is invalid", () => {
      process.env.TIMER_SPEED = "invalid";
      assert.strictEqual(getRateLimitWindowMs(), DEFAULT_RATE_LIMIT_WINDOW_MS);
    });
  });

  describe("getClientIp", () => {
    it("uses x-forwarded-for when the peer is trusted", () => {
      process.env.TRUSTED_PROXY_CIDRS = "127.0.0.1/32,::1/128,172.16.0.0/12";
      const req = {
        headers: { "x-forwarded-for": "203.0.113.10" },
        socket: { remoteAddress: "::ffff:127.0.0.1" },
      };
      assert.strictEqual(getClientIp(req), "203.0.113.10");
    });

    it("uses the first untrusted hop from the right to prevent spoofing", () => {
      process.env.TRUSTED_PROXY_CIDRS = "127.0.0.1/32,::1/128,172.16.0.0/12";
      const req = {
        headers: { "x-forwarded-for": "198.51.100.123, 203.0.113.10" },
        socket: { remoteAddress: "::ffff:127.0.0.1" },
      };
      assert.strictEqual(getClientIp(req), "203.0.113.10");
    });

    it("skips trusted proxy hops in the forwarded chain", () => {
      process.env.TRUSTED_PROXY_CIDRS = "172.16.0.0/12";
      const req = {
        headers: { "x-forwarded-for": "198.51.100.123, 172.18.0.4" },
        socket: { remoteAddress: "::ffff:172.18.0.5" },
      };
      assert.strictEqual(getClientIp(req), "198.51.100.123");
    });

    it("ignores invalid forwarded entries", () => {
      process.env.TRUSTED_PROXY_CIDRS = "127.0.0.1/32";
      const req = {
        headers: { "x-forwarded-for": "unknown, 203.0.113.10" },
        socket: { remoteAddress: "::ffff:127.0.0.1" },
      };
      assert.strictEqual(getClientIp(req), "203.0.113.10");
    });

    it("ignores x-forwarded-for when peer is untrusted", () => {
      process.env.TRUSTED_PROXY_CIDRS = "127.0.0.1/32";
      const req = {
        headers: { "x-forwarded-for": "203.0.113.10, 70.41.3.18" },
        socket: { remoteAddress: "::ffff:198.51.100.25" },
      };
      assert.strictEqual(getClientIp(req), "198.51.100.25");
    });

    it("falls back to socket remote address", () => {
      process.env.TRUSTED_PROXY_CIDRS = "127.0.0.1/32";
      const req = {
        headers: {},
        socket: { remoteAddress: "::ffff:127.0.0.1" },
      };
      assert.strictEqual(getClientIp(req), "127.0.0.1");
    });
  });

  describe("isTrustedProxyIp", () => {
    it("supports ipv4 cidr ranges", () => {
      assert.strictEqual(
        isTrustedProxyIp("172.18.0.4", ["172.16.0.0/12"]),
        true,
      );
      assert.strictEqual(
        isTrustedProxyIp("198.51.100.4", ["172.16.0.0/12"]),
        false,
      );
    });

    it("supports exact ipv6 matches", () => {
      assert.strictEqual(isTrustedProxyIp("::1", ["::1/128"]), true);
      assert.strictEqual(isTrustedProxyIp("::1", ["fe80::1/128"]), false);
    });
  });
});
