/**
 * @typedef {object} HttpErrorOptions
 * @property {Record<string, unknown>} [body]
 * @property {Record<string, string>} [headers]
 */

export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {HttpErrorOptions} [options]
   */
  constructor(status, message, options = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = options.body;
    this.headers = options.headers;
  }
}

/**
 * @param {import('http').ServerResponse} res
 * @param {import('./logger.js').Log} log
 * @param {unknown} err
 */
export function handleRequestError(res, log, err) {
  if (err instanceof HttpError) {
    log.context.error = { message: err.message };
    if (!res.headersSent) {
      res.writeHead(err.status, {
        "content-type": "application/json",
        ...(err.headers ?? {}),
      });
      res.end(
        JSON.stringify(err.body ?? { error: err.message, status: err.status }),
      );
    }
    return;
  }

  if (err instanceof Error) {
    log.context.error = { message: err.message };
  }
  if (!res.headersSent) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}
