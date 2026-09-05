/**
 * @typedef {{ allowMttLobby?: boolean, modalEntry?: boolean }} AppNavigationState
 * @typedef {{ path: string, allowMttLobby?: boolean }} AppNavigationDetail
 */

const APP_MODALS = new Set(["settings", "sign-in", "sign-up"]);
const handledNavigationRoutes = new Map();

function browserNavigation() {
  return /** @type {any} */ (globalThis).navigation;
}

export function supportsNavigationApi() {
  const navigation = browserNavigation();
  return (
    typeof navigation?.addEventListener === "function" &&
    typeof navigation?.navigate === "function"
  );
}

function routeUrl(url) {
  return `${url.pathname}${url.search}${url.hash}`;
}

function normalizeUrl(path) {
  return new URL(path, window.location.origin);
}

/**
 * @param {URL|string} url
 * @returns {"settings"|"sign-in"|"sign-up"|undefined}
 */
export function getAppModal(url) {
  const parsedUrl = typeof url === "string" ? normalizeUrl(url) : url;
  const value = parsedUrl.searchParams.get("modal");
  return value && APP_MODALS.has(value)
    ? /** @type {any} */ (value)
    : undefined;
}

function rememberHandledNavigation(route) {
  handledNavigationRoutes.set(
    route,
    (handledNavigationRoutes.get(route) ?? 0) + 1,
  );
}

function consumeHandledNavigation(route) {
  const count = handledNavigationRoutes.get(route) ?? 0;
  if (count <= 0) return false;

  if (count === 1) {
    handledNavigationRoutes.delete(route);
  } else {
    handledNavigationRoutes.set(route, count - 1);
  }
  return true;
}

/**
 * @param {any} app
 * @param {URL|string} url
 * @param {AppNavigationState|null|undefined} [state]
 */
export function applyAppRoute(app, url, state = {}) {
  const nextUrl = typeof url === "string" ? normalizeUrl(url) : url;
  const navigationState = state ?? {};
  app._setMttLobbyOverride(Boolean(navigationState.allowMttLobby));
  app.path = nextUrl.pathname;
  app._modal = getAppModal(nextUrl);
  app._modalHistoryEntry = navigationState.modalEntry === true;
}

/**
 * @param {any} app
 * @param {string} path
 * @param {{ replace?: boolean, allowMttLobby?: boolean, modalEntry?: boolean }} [options]
 */
export function navigateApp(app, path, options = {}) {
  const url = normalizeUrl(path);
  const state = {
    allowMttLobby: options.allowMttLobby === true,
    modalEntry: options.modalEntry === true,
  };

  if (supportsNavigationApi()) {
    const route = routeUrl(url);
    rememberHandledNavigation(route);
    try {
      const navigationResult = browserNavigation().navigate(route, {
        history: options.replace ? "replace" : "push",
        state,
      });
      void navigationResult?.finished
        ?.catch(() => {})
        ?.finally(() => {
          consumeHandledNavigation(route);
        });
    } catch {
      consumeHandledNavigation(route);
      if (options.replace) {
        history.replaceState(state, "", route);
      } else {
        history.pushState(state, "", route);
      }
    }
    applyAppRoute(app, url, state);
    return;
  }

  if (options.replace) {
    history.replaceState(state, "", routeUrl(url));
  } else {
    history.pushState(state, "", routeUrl(url));
  }
  applyAppRoute(app, url, state);
}

/**
 * @param {any} app
 * @param {"settings"|"sign-in"|"sign-up"} modal
 * @param {{ replace?: boolean }} [options]
 */
export function openAppModal(app, modal, options = {}) {
  const url = new URL(window.location.href);
  const currentModal = getAppModal(url);
  url.searchParams.set("modal", modal);
  const replace = options.replace === true || currentModal !== undefined;
  navigateApp(app, routeUrl(url), {
    replace,
    allowMttLobby: app._allowMttLobby,
    modalEntry: replace ? app._modalHistoryEntry : true,
  });
}

/**
 * @param {any} app
 */
export function closeAppModal(app) {
  if (!app._modal) return;

  if (app._modalHistoryEntry) {
    app._modalHistoryEntry = false;
    window.history.back();
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("modal");
  navigateApp(app, routeUrl(url), {
    replace: true,
    allowMttLobby: app._allowMttLobby,
  });
}

/**
 * @param {MouseEvent} event
 * @returns {HTMLAnchorElement|undefined}
 */
function findAnchor(event) {
  return (
    event
      .composedPath()
      .find((target) => target instanceof HTMLAnchorElement) ?? undefined
  );
}

/**
 * @param {MouseEvent} event
 */
function isPlainLeftClick(event) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * @param {HTMLAnchorElement} anchor
 */
function isAppAnchor(anchor) {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download") || !anchor.href) return false;
  const url = new URL(anchor.href);
  return (
    url.origin === window.location.origin &&
    (url.pathname !== window.location.pathname || !url.hash)
  );
}

/**
 * @param {MouseEvent} event
 * @param {HTMLAnchorElement} anchor
 */
function shouldHandleAnchorClick(event, anchor) {
  return isPlainLeftClick(event) && isAppAnchor(anchor);
}

/**
 * @param {any} event
 */
export function shouldInterceptNavigation(event) {
  if (!event.canIntercept) return false;
  if (event.hashChange || event.downloadRequest || event.formData) {
    return false;
  }

  const url = new URL(event.destination.url);
  if (url.origin !== window.location.origin) return false;

  return (
    event.navigationType !== "reload" && event.navigationType !== "replace"
  );
}

/**
 * @param {any} app
 * @param {any} event
 */
export function interceptNavigation(app, event) {
  const destinationUrl = new URL(event.destination.url);
  if (consumeHandledNavigation(routeUrl(destinationUrl))) {
    if (event.canIntercept) {
      event.intercept({ handler() {} });
    }
    return;
  }
  if (!shouldInterceptNavigation(event)) return;

  const destinationState =
    /** @type {AppNavigationState} */ (event.destination.getState?.()) ?? {};

  event.intercept({
    handler() {
      applyAppRoute(app, destinationUrl, destinationState);
    },
  });
}

/**
 * @param {any} app
 * @param {MouseEvent} event
 */
export function handleAppLinkClick(app, event) {
  const anchor = findAnchor(event);
  if (!anchor || !shouldHandleAnchorClick(event, anchor)) return;

  event.preventDefault();
  navigateApp(app, anchor.href, {
    replace: anchor.dataset.appHistory === "replace",
  });
}
