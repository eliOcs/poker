import crypto from "node:crypto";

export const EMAIL_SIGN_IN_TTL_MINUTES = Number.parseInt(
  process.env.EMAIL_SIGN_IN_TTL_MINUTES || "30",
  10,
);

/** @type {Map<string, { token: string, userId: string, email: string, expiresAt: number, returnPath: string }>} */
const tokensByUserId = new Map();

/** @type {Map<string, { userId: string, email: string, expiresAt: number, returnPath: string }>} */
const tokensByValue = new Map();

/**
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

/**
 * Pragmatic validation for sign-in emails without overfitting to edge cases.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createEmailSignInToken() {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeReturnPath(value) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/";
  }
  if (value.startsWith("//")) {
    return "/";
  }
  return value;
}

/**
 * @param {Date} [now]
 * @returns {{ expiresAt: string, expiresInMinutes: number }}
 */
export function getEmailSignInExpiry(now = new Date()) {
  const expiresAt = new Date(
    now.getTime() + EMAIL_SIGN_IN_TTL_MINUTES * 60 * 1000,
  );
  return {
    expiresAt: expiresAt.toISOString(),
    expiresInMinutes: EMAIL_SIGN_IN_TTL_MINUTES,
  };
}

/**
 * @param {string} origin
 * @param {string} token
 * @returns {string}
 */
export function buildEmailSignInUrl(origin, token) {
  const url = new URL("/auth/email-sign-in/verify", origin);
  url.searchParams.set("token", token);
  return url.toString();
}

/**
 * @param {{ token: string, userId: string, email: string, expiresAt: string, returnPath: string }} params
 */
export function saveEmailSignInToken({
  token,
  userId,
  email,
  expiresAt,
  returnPath,
}) {
  const existing = tokensByUserId.get(userId);
  if (existing) {
    tokensByValue.delete(existing.token);
  }

  const entry = {
    token,
    userId,
    email,
    expiresAt: Date.parse(expiresAt),
    returnPath,
  };
  tokensByUserId.set(userId, entry);
  tokensByValue.set(token, {
    userId,
    email,
    expiresAt: entry.expiresAt,
    returnPath,
  });
}

/**
 * @param {string} token
 * @returns {{ userId: string, email: string, returnPath: string }|null}
 */
export function consumeEmailSignInToken(token) {
  const entry = tokensByValue.get(token);
  if (!entry) return null;

  tokensByValue.delete(token);
  const current = tokensByUserId.get(entry.userId);
  if (current?.token === token) {
    tokensByUserId.delete(entry.userId);
  }

  if (entry.expiresAt <= Date.now()) {
    return null;
  }

  return {
    userId: entry.userId,
    email: entry.email,
    returnPath: entry.returnPath,
  };
}

export function clearEmailSignInTokens() {
  tokensByUserId.clear();
  tokensByValue.clear();
}
