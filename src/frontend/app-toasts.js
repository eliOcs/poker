const TOAST_DURATION_MS = 3000;
// Older toasts give way so a burst of errors cannot fill the screen.
const MAX_TOASTS = 3;

/** @typedef {import('./toasts.js').Toast} Toast */

/**
 * Shows a toast below any already shown until it expires or is clicked.
 * @param {any} app
 * @param {Toast} toast
 */
export function showToast(app, toast) {
  const shown = { ...toast };
  app.toasts = [...app.toasts, shown].slice(-MAX_TOASTS);
  setTimeout(() => {
    dismissToast(app, shown);
  }, TOAST_DURATION_MS);
}

/**
 * Removes a toast if it is still shown: it may have expired after a click, and
 * toasts derived from state are not in the list.
 * @param {any} app
 * @param {Toast} toast
 */
export function dismissToast(app, toast) {
  app.toasts = app.toasts.filter((shown) => shown !== toast);
}
