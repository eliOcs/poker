import { HttpError } from "./http-error.js";
import { getSessionPlayerLogContext } from "./logger.js";
import * as logger from "./logger.js";

/**
 * Trims a string value to a safe loggable form
 * @param {unknown} value
 * @param {number} maxLength
 * @returns {string|void}
 */
function trimLogString(value, maxLength) {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (!trimmed) return;
  return trimmed.slice(0, maxLength);
}

/**
 * Logs a frontend error report received from the client
 * @param {import('http').IncomingMessage} req
 * @param {import('./user.js').User} user
 * @param {unknown} data
 */
export function logFrontendErrorReport(req, user, data) {
  if (!data || typeof data !== "object") {
    throw new HttpError(400, "Invalid frontend error payload", {
      body: { error: "Invalid frontend error payload", status: 400 },
    });
  }
  const payload = /** @type {Record<string, unknown>} */ (data);

  const message = trimLogString(payload.message, 500);
  if (!message) {
    throw new HttpError(400, "Frontend error message is required", {
      body: { error: "Frontend error message is required", status: 400 },
    });
  }

  const level = payload.level === "warn" ? "warn" : "error";
  const type = trimLogString(payload.type, 100);
  const clientError = {
    type: typeof type === "string" ? type : "error",
    message,
    stack: trimLogString(payload.stack, 4000),
    filename: trimLogString(payload.filename, 500),
    source: trimLogString(payload.source, 200),
    route: trimLogString(payload.route, 500),
    gameId: trimLogString(payload.gameId, 100),
    userAgent: trimLogString(payload.userAgent, 500),
    rejection: trimLogString(payload.rejection, 2000),
    line: typeof payload.line === "number" ? payload.line : undefined,
    column: typeof payload.column === "number" ? payload.column : undefined,
    connectionStatus: trimLogString(payload.connectionStatus, 50),
  };

  logger[level]("frontend_error", {
    ...getSessionPlayerLogContext(user),
    request: { path: req.url ?? "", method: req.method ?? "POST" },
    frontend: clientError,
  });
}
