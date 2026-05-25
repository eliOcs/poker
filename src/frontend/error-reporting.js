/**
 * Builds a normalized frontend error report payload
 * @param {object} error
 * @param {string} route
 * @param {string|undefined} gameId
 * @param {string} connectionStatus
 * @returns {Record<string, unknown>}
 */
export function createFrontendErrorReport(
  error,
  route,
  gameId,
  connectionStatus,
) {
  return {
    level: error.level === "warn" ? "warn" : "error",
    type: error.type ?? "error",
    message: error.message ?? "Unknown frontend error",
    stack: error.stack ?? undefined,
    filename: error.filename ?? undefined,
    line: typeof error.line === "number" ? error.line : undefined,
    column: typeof error.column === "number" ? error.column : undefined,
    source: error.source ?? undefined,
    rejection: error.rejection ?? undefined,
    route,
    gameId,
    connectionStatus,
    userAgent: navigator.userAgent,
  };
}

/**
 * Builds a report payload from a window error event
 * @param {ErrorEvent|{error?: Error, message?: string, filename?: string, lineno?: number, colno?: number}} event
 * @returns {Record<string, unknown>}
 */
export function getWindowErrorDetails(event) {
  return {
    type: "error",
    message: event.error?.message ?? event.message ?? "Unknown error",
    stack: event.error?.stack,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
    source: "window.error",
  };
}

/**
 * Builds a report payload from an unhandled rejection event
 * @param {PromiseRejectionEvent|{reason?: unknown}} event
 * @returns {Record<string, unknown>}
 */
export function getUnhandledRejectionDetails(event) {
  const reason =
    event.reason instanceof Error
      ? {
          message: event.reason.message,
          stack: event.reason.stack,
          rejection: String(event.reason),
        }
      : {
          message: String(event.reason ?? "Unhandled promise rejection"),
          stack: undefined,
          rejection: String(event.reason),
        };

  return {
    level: "error",
    type: "unhandledrejection",
    message: reason.message,
    stack: reason.stack,
    rejection: reason.rejection,
    source: "window.unhandledrejection",
  };
}
