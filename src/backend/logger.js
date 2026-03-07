/**
 * Structured logger for production monitoring
 * Uses native console with configurable format and level
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel =
  LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS.info;

// Default to JSON in production (NODE_ENV=production), text otherwise
const defaultFormat = process.env.NODE_ENV === "production" ? "json" : "text";
const format = process.env.LOG_FORMAT?.toLowerCase() || defaultFormat;

/**
 * @typedef {object} Log
 * @property {string} level - Log level
 * @property {string} message - Log message
 * @property {number} timestamp - Epoch ms when log was created
 * @property {Record<string, unknown>} context - Accumulated context
 */

/**
 * Creates a log. A plain data object that accumulates context.
 * For one-shot logs, pass directly to info/warn/error/debug.
 * For deferred canonical logs, accumulate context and call emitLog().
 * @param {string} message
 * @returns {Log}
 */
export function createLog(message) {
  return { level: "info", message, timestamp: Date.now(), context: {} };
}

/**
 * Formats a Log as text
 * @param {Log} log
 * @returns {string}
 */
function formatText({ timestamp, level, message, context }) {
  const contextStr = Object.entries(context)
    .map(
      ([k, v]) =>
        `${k}=${typeof v === "object" && v !== null ? JSON.stringify(v) : v}`,
    )
    .join(" ");
  return `[${new Date(timestamp).toISOString()}] ${level.toUpperCase()} ${message}${contextStr ? " " + contextStr : ""}`;
}

/**
 * Formats a Log as JSON
 * @param {Log} log
 * @returns {string}
 */
function formatJson({ timestamp, level, message, context }) {
  return JSON.stringify({
    timestamp: new Date(timestamp).toISOString(),
    level,
    message,
    ...context,
  });
}

/**
 * Core log function — formats a Log and writes it
 * @param {Log} log
 */
function emit(log) {
  if (LOG_LEVELS[log.level] < currentLevel) return;

  const output = format === "json" ? formatJson(log) : formatText(log);

  if (log.level === "error") {
    console.error(output);
  } else if (log.level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

/**
 * Log a debug message
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
export function debug(message, context = {}) {
  emit({ level: "debug", message, timestamp: Date.now(), context });
}

/**
 * Log an info message
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
export function info(message, context = {}) {
  emit({ level: "info", message, timestamp: Date.now(), context });
}

/**
 * Log a warning message
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
export function warn(message, context = {}) {
  emit({ level: "warn", message, timestamp: Date.now(), context });
}

/**
 * Log an error message
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
export function error(message, context = {}) {
  emit({ level: "error", message, timestamp: Date.now(), context });
}

/**
 * Emits a deferred log as a single structured log line.
 * Adds durationMs computed from the log's timestamp.
 * @param {Log} log
 */
export function emitLog(log) {
  log.context.durationMs = Date.now() - log.timestamp;
  emit(log);
}

// Export for testing
export { LOG_LEVELS, currentLevel, format };
