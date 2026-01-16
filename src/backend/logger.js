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
 * Formats a log entry as text
 * @param {string} level
 * @param {string} message
 * @param {Record<string, unknown>} context
 * @returns {string}
 */
function formatText(level, message, context) {
  const timestamp = new Date().toISOString();
  const contextStr = Object.entries(context)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  return `[${timestamp}] ${level.toUpperCase()} ${message}${contextStr ? " " + contextStr : ""}`;
}

/**
 * Formats a log entry as JSON
 * @param {string} level
 * @param {string} message
 * @param {Record<string, unknown>} context
 * @returns {string}
 */
function formatJson(level, message, context) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  });
}

/**
 * Core log function
 * @param {string} level
 * @param {string} message
 * @param {Record<string, unknown>} context
 */
function log(level, message, context = {}) {
  if (LOG_LEVELS[level] < currentLevel) return;

  const output =
    format === "json"
      ? formatJson(level, message, context)
      : formatText(level, message, context);

  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
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
export function debug(message, context) {
  log("debug", message, context);
}

/**
 * Log an info message
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
export function info(message, context) {
  log("info", message, context);
}

/**
 * Log a warning message
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
export function warn(message, context) {
  log("warn", message, context);
}

/**
 * Log an error message
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
export function error(message, context) {
  log("error", message, context);
}

/**
 * Creates a child logger with preset context
 * @param {Record<string, unknown>} baseContext
 * @returns {{ debug: typeof debug, info: typeof info, warn: typeof warn, error: typeof error }}
 */
export function child(baseContext) {
  return {
    debug: (message, context) => debug(message, { ...baseContext, ...context }),
    info: (message, context) => info(message, { ...baseContext, ...context }),
    warn: (message, context) => warn(message, { ...baseContext, ...context }),
    error: (message, context) => error(message, { ...baseContext, ...context }),
  };
}

// Export for testing
export { LOG_LEVELS, currentLevel, format };
