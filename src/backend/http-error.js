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
