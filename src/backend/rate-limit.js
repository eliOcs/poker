/**
 * @typedef {import('http').IncomingMessage} Request
 */

import * as logger from "./logger.js";

export const DEFAULT_RATE_LIMIT_MAX_ACTIONS = 100;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const DEFAULT_CLEANUP_INTERVAL = 200;
export const DEFAULT_MONITOR_EVERY = 1_000;
export const DEFAULT_BLOCK_DURATION_MS = 0;

/**
 * @param {string|undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function parsePositiveInt(value, fallback) {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * @returns {number}
 */
export function getTimerSpeedMultiplier() {
  return parsePositiveInt(process.env.TIMER_SPEED, 1);
}

/**
 * @param {number} [baseWindowMs]
 * @returns {number}
 */
export function getRateLimitWindowMs(
  baseWindowMs = DEFAULT_RATE_LIMIT_WINDOW_MS,
) {
  const timerSpeed = getTimerSpeedMultiplier();
  return Math.max(1, Math.floor(baseWindowMs / timerSpeed));
}

/**
 * @param {Request} req
 * @returns {string}
 */
export function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const forwarded =
    typeof forwardedFor === "string"
      ? forwardedFor
      : Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : null;

  const ip = forwarded?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

/**
 * @typedef {object} RateLimitResult
 * @property {boolean} allowed
 * @property {number} limit
 * @property {number} remaining
 * @property {number} retryAfterMs
 * @property {number} windowMs
 */

/**
 * @typedef {object} TrackedIp
 * @property {number[]} timestamps
 * @property {number} lastSeen
 * @property {number} blockedUntil
 */

/**
 * @typedef {object} RateLimiter
 * @property {(ip: string, nowOrContext?: number|{ now?: number, source?: string }, sourceArg?: string) => RateLimitResult} check
 * @property {() => number} getEntryCount
 * @property {() => void} clear
 */

/**
 * Creates an in-memory per-IP sliding-window limiter.
 *
 * @param {object} [options]
 * @param {number} [options.maxActions]
 * @param {number} [options.windowMs]
 * @param {number} [options.cleanupInterval]
 * @param {number} [options.monitorEvery]
 * @param {number} [options.blockDurationMs]
 * @param {(message: string, context?: Record<string, unknown>) => void} [options.logInfo]
 * @param {(message: string, context?: Record<string, unknown>) => void} [options.logWarn]
 * @returns {RateLimiter}
 */
export function createRateLimiter({
  maxActions = DEFAULT_RATE_LIMIT_MAX_ACTIONS,
  windowMs = getRateLimitWindowMs(),
  cleanupInterval = DEFAULT_CLEANUP_INTERVAL,
  monitorEvery = DEFAULT_MONITOR_EVERY,
  blockDurationMs = DEFAULT_BLOCK_DURATION_MS,
  logInfo = logger.info,
  logWarn = logger.warn,
} = {}) {
  /** @type {Map<string, TrackedIp>} */
  const trackedByIp = new Map();
  let callsSinceCleanup = 0;
  let totalChecks = 0;
  let totalBlocked = 0;

  logInfo("rate limiter initialized", {
    maxActions,
    windowMs,
    cleanupInterval,
    monitorEvery,
    blockDurationMs,
  });

  /**
   * @param {number|{ now?: number, source?: string }|undefined} nowOrContext
   * @param {string|undefined} sourceArg
   * @returns {{ now: number, source: string }}
   */
  function resolveCheckContext(nowOrContext, sourceArg) {
    if (typeof nowOrContext === "number") {
      return {
        now: nowOrContext,
        source: sourceArg || "unknown",
      };
    }

    if (typeof nowOrContext === "object" && nowOrContext !== null) {
      return {
        now:
          typeof nowOrContext.now === "number" ? nowOrContext.now : Date.now(),
        source:
          typeof nowOrContext.source === "string"
            ? nowOrContext.source
            : "unknown",
      };
    }

    return {
      now: Date.now(),
      source: sourceArg || "unknown",
    };
  }

  /**
   * @param {number} now
   */
  function maybeLogStats(now) {
    if (!monitorEvery || monitorEvery <= 0) return;
    if (totalChecks % monitorEvery !== 0) return;

    logInfo("rate limiter stats", {
      totalChecks,
      totalBlocked,
      blockRate:
        totalChecks > 0 ? Number((totalBlocked / totalChecks).toFixed(4)) : 0,
      trackedIps: trackedByIp.size,
      maxActions,
      windowMs,
      timestampMs: now,
    });
  }

  /**
   * @param {TrackedIp} tracked
   * @param {number} now
   */
  function trimWindow(tracked, now) {
    const cutoff = now - windowMs;
    while (tracked.timestamps.length > 0 && tracked.timestamps[0] <= cutoff) {
      tracked.timestamps.shift();
    }
  }

  /**
   * @param {number} now
   */
  function cleanup(now) {
    callsSinceCleanup += 1;
    if (callsSinceCleanup < cleanupInterval) return;
    callsSinceCleanup = 0;

    for (const [ip, tracked] of trackedByIp) {
      trimWindow(tracked, now);
      if (
        tracked.timestamps.length === 0 &&
        tracked.blockedUntil <= now &&
        now - tracked.lastSeen >= windowMs
      ) {
        trackedByIp.delete(ip);
      }
    }
  }

  return {
    check(ip, nowOrContext, sourceArg) {
      const { now, source } = resolveCheckContext(nowOrContext, sourceArg);
      totalChecks += 1;

      if (!ip) {
        maybeLogStats(now);
        return {
          allowed: true,
          limit: maxActions,
          remaining: maxActions,
          retryAfterMs: 0,
          windowMs,
        };
      }

      let tracked = trackedByIp.get(ip);
      if (!tracked) {
        tracked = { timestamps: [], lastSeen: now, blockedUntil: 0 };
        trackedByIp.set(ip, tracked);
      }

      if (tracked.blockedUntil > now) {
        const retryAfterMs = tracked.blockedUntil - now;
        totalBlocked += 1;
        logWarn("rate limit exceeded", {
          ip,
          source,
          retryAfterMs,
          maxActions,
          windowMs,
          blockedUntil: tracked.blockedUntil,
        });
        cleanup(now);
        maybeLogStats(now);
        return {
          allowed: false,
          limit: maxActions,
          remaining: 0,
          retryAfterMs,
          windowMs,
        };
      }

      trimWindow(tracked, now);
      tracked.lastSeen = now;

      if (tracked.timestamps.length >= maxActions) {
        const rollingRetryAfterMs = Math.max(
          0,
          tracked.timestamps[0] + windowMs - now,
        );
        if (blockDurationMs > 0) {
          tracked.blockedUntil = Math.max(
            tracked.blockedUntil,
            now + blockDurationMs,
          );
        }
        const retryAfterMs = Math.max(
          rollingRetryAfterMs,
          tracked.blockedUntil > now ? tracked.blockedUntil - now : 0,
        );
        totalBlocked += 1;
        logWarn("rate limit exceeded", {
          ip,
          source,
          retryAfterMs,
          maxActions,
          windowMs,
          blockedUntil: tracked.blockedUntil || undefined,
        });
        cleanup(now);
        maybeLogStats(now);
        return {
          allowed: false,
          limit: maxActions,
          remaining: 0,
          retryAfterMs,
          windowMs,
        };
      }

      tracked.timestamps.push(now);
      cleanup(now);
      maybeLogStats(now);

      return {
        allowed: true,
        limit: maxActions,
        remaining: maxActions - tracked.timestamps.length,
        retryAfterMs: 0,
        windowMs,
      };
    },
    getEntryCount() {
      return trackedByIp.size;
    },
    clear() {
      trackedByIp.clear();
      callsSinceCleanup = 0;
    },
  };
}
