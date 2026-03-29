import {
  getUnhandledRejectionDetails,
  getWindowErrorDetails,
} from "./error-reporting.js";
import { requestSignIn } from "./app-auth.js";

function getCurrentReturnPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/**
 * Initializes event handler callbacks on the app instance
 * @param {any} app
 */
export function initAppEventHandlers(app) {
  app._handlePopState = (event) => {
    const state = /** @type {PopStateEvent} */ (event).state;
    app._setMttLobbyOverride(Boolean(state?.allowMttLobby));
    app.path = window.location.pathname;
  };
  app._handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      app._reconnectIfNeeded();
    }
  };
  app._handleNavigate = (e) => {
    const detail =
      /** @type {CustomEvent<{ path: string, allowMttLobby?: boolean }>} */ (e)
        .detail;
    const allowMttLobby = detail.allowMttLobby === true;
    history.pushState({ allowMttLobby }, "", detail.path);
    app._setMttLobbyOverride(allowMttLobby);
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
  app._handleRequestSignIn = (e) => {
    const detail = /** @type {CustomEvent<{ email: string }>} */ (e).detail;
    requestSignIn(app, detail.email, getCurrentReturnPath());
  };
  app._handleOpenSettings = () => {
    app.openProfileSettings();
  };
  app._handleOpenSignIn = () => {
    app.openProfileSignIn();
  };
  app._handleMttAction = (e) => {
    const detail = /** @type {CustomEvent<{ action: string }>} */ (e).detail;
    app.performMttAction(detail.action);
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
  app.addEventListener("request-sign-in", app._handleRequestSignIn);
  app.addEventListener("open-settings", app._handleOpenSettings);
  app.addEventListener("open-sign-in", app._handleOpenSignIn);
  app.addEventListener("mtt-action", app._handleMttAction);
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
  app.removeEventListener("request-sign-in", app._handleRequestSignIn);
  app.removeEventListener("open-settings", app._handleOpenSettings);
  app.removeEventListener("open-sign-in", app._handleOpenSignIn);
  app.removeEventListener("mtt-action", app._handleMttAction);
}
