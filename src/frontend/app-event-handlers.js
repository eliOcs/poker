import {
  getUnhandledRejectionDetails,
  getWindowErrorDetails,
} from "./error-reporting.js";
import { requestSignIn } from "./app-auth.js";
import {
  applyAppRoute,
  handleAppLinkClick,
  interceptNavigation,
  navigateApp,
  supportsNavigationApi,
} from "./app-navigation.js";

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
    applyAppRoute(app, window.location.href, state);
  };
  app._handleNavigation = (event) => {
    interceptNavigation(app, event);
  };
  app._handleAppLinkClick = (event) => {
    handleAppLinkClick(app, /** @type {MouseEvent} */ (event));
  };
  app._handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      app._resumeConnectionIfNeeded();
    }
  };
  app._handleNavigate = (e) => {
    const detail =
      /** @type {CustomEvent<{ path: string, allowMttLobby?: boolean }>} */ (e)
        .detail;
    navigateApp(app, detail.path, {
      allowMttLobby: detail.allowMttLobby === true,
    });
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
  app._handleRequestSignIn = async (e) => {
    const detail =
      /** @type {CustomEvent<{ email: string, name?: string }>} */ (e).detail;
    if (detail.name !== undefined) {
      await app._updateUser({ name: detail.name });
    }
    requestSignIn(app, detail.email, getCurrentReturnPath());
  };
  app._handleOpenSettings = () => {
    app.openProfileSettings();
  };
  app._handleOpenSignIn = () => {
    app.openProfileSignIn();
  };
  app._handleOpenSignUp = () => {
    app.openProfileSignUp();
  };
  app._handleMttAction = (e) => {
    const detail = /** @type {CustomEvent<{ action: string }>} */ (e).detail;
    app.performMttAction(detail.action);
  };
  app._handleMttRename = (e) => {
    const detail = /** @type {CustomEvent<{ name: string }>} */ (e).detail;
    app.renameMttTournament(detail.name);
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
  if (supportsNavigationApi()) {
    /** @type {any} */ (globalThis).navigation.addEventListener(
      "navigate",
      app._handleNavigation,
    );
  } else {
    window.addEventListener("popstate", app._handlePopState);
  }
  window.addEventListener("error", app._handleWindowError);
  window.addEventListener("unhandledrejection", app._handleUnhandledRejection);
  document.addEventListener("visibilitychange", app._handleVisibilityChange);
  app.addEventListener("click", app._handleAppLinkClick);
  app.addEventListener("navigate", app._handleNavigate);
  app.addEventListener("toast", app._handleToast);
  app.addEventListener("hand-select", app._handleHandSelect);
  app.addEventListener("game-action", app._handleGameAction);
  app.addEventListener("update-user", app._handleUpdateUser);
  app.addEventListener("request-sign-in", app._handleRequestSignIn);
  app.addEventListener("open-settings", app._handleOpenSettings);
  app.addEventListener("open-sign-in", app._handleOpenSignIn);
  app.addEventListener("open-sign-up", app._handleOpenSignUp);
  app.addEventListener("mtt-action", app._handleMttAction);
  app.addEventListener("mtt-rename", app._handleMttRename);
}

/**
 * Detaches global and component event listeners for the app
 * @param {any} app
 */
export function disconnectAppEventHandlers(app) {
  if (supportsNavigationApi()) {
    /** @type {any} */ (globalThis).navigation.removeEventListener(
      "navigate",
      app._handleNavigation,
    );
  } else {
    window.removeEventListener("popstate", app._handlePopState);
  }
  window.removeEventListener("error", app._handleWindowError);
  window.removeEventListener(
    "unhandledrejection",
    app._handleUnhandledRejection,
  );
  document.removeEventListener("visibilitychange", app._handleVisibilityChange);
  app.removeEventListener("click", app._handleAppLinkClick);
  app.removeEventListener("navigate", app._handleNavigate);
  app.removeEventListener("toast", app._handleToast);
  app.removeEventListener("hand-select", app._handleHandSelect);
  app.removeEventListener("game-action", app._handleGameAction);
  app.removeEventListener("update-user", app._handleUpdateUser);
  app.removeEventListener("request-sign-in", app._handleRequestSignIn);
  app.removeEventListener("open-settings", app._handleOpenSettings);
  app.removeEventListener("open-sign-in", app._handleOpenSignIn);
  app.removeEventListener("open-sign-up", app._handleOpenSignUp);
  app.removeEventListener("mtt-action", app._handleMttAction);
  app.removeEventListener("mtt-rename", app._handleMttRename);
}
