/**
 * @typedef {import('http').IncomingMessage} Request
 */

import net from "node:net";
import * as logger from "./logger.js";

export const DEFAULT_RATE_LIMIT_MAX_ACTIONS = 100;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const DEFAULT_CLEANUP_INTERVAL = 200;
export const DEFAULT_MONITOR_EVERY = 1_000;
export const DEFAULT_BLOCK_DURATION_MS = 0;
export const DEFAULT_TRUSTED_PROXY_CIDRS = "";

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
 * @param {string} ip
 * @returns {string}
 */
function normalizeIp(ip) {
  const trimmed = ip.trim();
  return trimmed.startsWith("::ffff:") ? trimmed.slice(7) : trimmed;
}

/**
 * @returns {string[]}
 */
export function getTrustedProxyCidrs() {
  return (process.env.TRUSTED_PROXY_CIDRS || DEFAULT_TRUSTED_PROXY_CIDRS)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * @param {string} ip
 * @returns {number|null}
 */
function ipv4ToInt(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  /** @type {number[]} */
  const octets = [];
  for (const part of parts) {
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) return null;
    octets.push(value);
  }

  return (
    ((octets[0] << 24) >>> 0) +
    ((octets[1] << 16) >>> 0) +
    ((octets[2] << 8) >>> 0) +
    octets[3]
  );
}

/**
 * @param {string} ip
 * @param {string} cidr
 * @returns {boolean}
 */
function isIpv4InCidr(ip, cidr) {
  const [network, rawPrefix = "32"] = cidr.split("/");
  const prefix = Number(rawPrefix);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

  const ipInt = ipv4ToInt(ip);
  const networkInt = ipv4ToInt(network);
  if (ipInt === null || networkInt === null) return false;

  if (prefix === 0) return true;
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

/**
 * @param {string} ip
 * @param {string} cidr
 * @returns {boolean}
 */
function isIpv6ExactOr128(ip, cidr) {
  const [network, rawPrefix] = cidr.split("/");
  if (!rawPrefix) {
    return ip === network;
  }

  const prefix = Number(rawPrefix);
  return prefix === 128 && ip === network;
}

/**
 * @param {string} remoteIp
 * @param {string[]} trustedCidrs
 * @returns {boolean}
 */
export function isTrustedProxyIp(
  remoteIp,
  trustedCidrs = getTrustedProxyCidrs(),
) {
  if (!remoteIp) return false;

  const ip = normalizeIp(remoteIp);
  const ipType = net.isIP(ip);
  if (!ipType) return false;

  for (const cidr of trustedCidrs) {
    const normalizedCidr = normalizeIp(cidr);
    const cidrNetwork = normalizedCidr.split("/")[0];
    const cidrType = net.isIP(cidrNetwork);
    if (cidrType !== ipType) continue;

    if (ipType === 4 && isIpv4InCidr(ip, normalizedCidr)) {
      return true;
    }

    if (ipType === 6 && isIpv6ExactOr128(ip, normalizedCidr)) {
      return true;
    }
  }

  return false;
}

/**
 * @param {Request} req
 * @returns {string}
 */
export function getClientIp(req) {
  const remoteIp = normalizeIp(req.socket.remoteAddress || "");
  const trustedCidrs = getTrustedProxyCidrs();
  if (!isTrustedProxyIp(remoteIp, trustedCidrs)) {
    return remoteIp;
  }

  const forwardedFor = req.headers["x-forwarded-for"];
  const forwardedChain =
    typeof forwardedFor === "string"
      ? forwardedFor.split(",")
      : Array.isArray(forwardedFor)
        ? forwardedFor.flatMap((value) => value.split(","))
        : [];

  /** @type {string[]} */
  const forwardedIps = [];
  for (const token of forwardedChain) {
    const ip = normalizeIp(token);
    if (net.isIP(ip)) {
      forwardedIps.push(ip);
    }
  }

  // RFC-style trust walk: start from the closest peer and skip trusted hops.
  const fullChain = [...forwardedIps, remoteIp];
  for (let index = fullChain.length - 1; index >= 0; index -= 1) {
    const ip = fullChain[index];
    if (!isTrustedProxyIp(ip, trustedCidrs)) {
      return ip;
    }
  }

  return remoteIp;
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
