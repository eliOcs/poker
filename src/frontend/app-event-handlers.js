import {
  getUnhandledRejectionDetails,
  getWindowErrorDetails,
} from "./error-reporting.js";

/**
 * Initializes event handler callbacks on the app instance
 * @param {any} app
 */
export function initAppEventHandlers(app) {
  app._handlePopState = () => {
    app.path = window.location.pathname;
  };
  app._handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      app._reconnectIfNeeded();
    }
  };
  app._handleNavigate = (e) => {
    const detail = /** @type {CustomEvent<{ path: string }>} */ (e).detail;
    history.pushState({}, "", detail.path);
    app.path = detail.path;
  };
  app._handleToast = (e) => {
    app.toast = /** @type {CustomEvent<object>} */ (e).detail;
  };
  app._handleHandSelect = (e) => {
    const detail = /** @type {CustomEvent<{ handNumber: number }>} */ (e)
      .detail;
    app.handleHandSelect(detail.handNumber);
  };
  app._handleGameAction = (e) => {
    app.sendToGame(/** @type {CustomEvent<object>} */ (e).detail);
  };
  app._handleUpdateUser = (e) => {
    app._updateUser(/** @type {CustomEvent<object>} */ (e).detail);
  };
  app._handleOpenSettings = () => {
    app.openProfileSettings();
  };
  app._handleWindowError = (event) => {
    app.reportFrontendError(getWindowErrorDetails(event));
  };
  app._handleUnhandledRejection = (event) => {
    app.reportFrontendError(getUnhandledRejectionDetails(event));
  };
}

/**
 * Attaches global and component event listeners for the app
 * @param {any} app
 */
export function connectAppEventHandlers(app) {
  window.addEventListener("popstate", app._handlePopState);
  window.addEventListener("error", app._handleWindowError);
  window.addEventListener("unhandledrejection", app._handleUnhandledRejection);
  document.addEventListener("visibilitychange", app._handleVisibilityChange);
  app.addEventListener("navigate", app._handleNavigate);
  app.addEventListener("toast", app._handleToast);
  app.addEventListener("hand-select", app._handleHandSelect);
  app.addEventListener("game-action", app._handleGameAction);
  app.addEventListener("update-user", app._handleUpdateUser);
  app.addEventListener("open-settings", app._handleOpenSettings);
}

/**
 * Detaches global and component event listeners for the app
 * @param {any} app
 */
export function disconnectAppEventHandlers(app) {
  window.removeEventListener("popstate", app._handlePopState);
  window.removeEventListener("error", app._handleWindowError);
  window.removeEventListener(
    "unhandledrejection",
    app._handleUnhandledRejection,
  );
  document.removeEventListener("visibilitychange", app._handleVisibilityChange);
  app.removeEventListener("navigate", app._handleNavigate);
  app.removeEventListener("toast", app._handleToast);
  app.removeEventListener("hand-select", app._handleHandSelect);
  app.removeEventListener("game-action", app._handleGameAction);
  app.removeEventListener("update-user", app._handleUpdateUser);
  app.removeEventListener("open-settings", app._handleOpenSettings);
}
