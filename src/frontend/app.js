import { css, LitElement } from "lit";
import { Task, TaskStatus } from "@lit/task";
import { baseStyles } from "./styles.js";
import { appModalStyles } from "./app-modal-styles.js";
import { appAuthStatusStyles } from "./app-auth-status.js";
import "./home.js";
import "./tournaments.js";
import "./index.js";
import "./history.js";
import "./mtt-lobby.js";
import "./player-profile.js";
import "./release-notes.js";
import "./app-shell.js";
import "./toast.js";
import "./modal.js";
import "./button.js";
import {
  connectAppEventHandlers,
  disconnectAppEventHandlers,
  initAppEventHandlers,
} from "./app-event-handlers.js";
import {
  renderGameView,
  renderHistoryView,
  renderPlayerProfileView,
  renderHomeView,
  renderTournamentsView,
  renderMttLobbyView,
  renderReleaseNotesView,
  renderAuthStatusView,
  renderShellView,
} from "./app-render.js";
import {
  getHistoryApiBase,
  getHistoryPath,
  getLivePathFromHistory,
  isTableLiveRoute,
  parseAppPath,
  syncAppRouteState,
} from "./app-route-state.js";
import * as ws from "./app-websocket.js";
import * as mttRouting from "./app-mtt-routing.js";
import { appSignInActions } from "./app-sign-in-actions.js";
import { appProfileActions } from "./app-profile-actions.js";

class App extends LitElement {
  static get styles() {
    return [
      baseStyles,
      appModalStyles,
      appAuthStatusStyles,
      css`
        :host {
          display: block;
          height: 100%;
        }
      `,
    ];
  }

  static get properties() {
    return {
      path: { type: String },
      toast: { type: Object },
      // User state (fetched via HTTP)
      user: { type: Object },
      // Game state (managed here, passed to phg-game)
      game: { type: Object },
      // Latest social websocket message for live game view
      socialAction: { type: Object },
      gameConnectionStatus: { type: String },
      // History route params (triggers tasks)
      _historyKind: { state: true },
      _historyTableId: { state: true },
      _historyTournamentId: { state: true },
      _historyHandNumber: { state: true },
      _historyListRefreshNonce: { state: true },
      _mttTournamentId: { state: true },
      _mttView: { state: true },
      _mttLoading: { state: true },
      _mttError: { state: true },
      _mttActionPending: { state: true },
      _playerProfileId: { state: true },
      _showProfileSettings: { state: true },
      _showProfileSignIn: { state: true },
      _showProfileSignUp: { state: true },
      _settingsVolume: { state: true },
      _settingsVibration: { state: true },
    };
  }

  constructor() {
    super();
    this.path = window.location.pathname;
    this.toast = null;
    // User state
    this.user = null;
    // Game state
    this.game = null;
    this.socialAction = null;
    this.gameConnectionStatus = "disconnected";
    this._activeGameId = null;
    this._activeGamePath = null;
    this._socket = null;
    this._socketHealthCheck = null;
    this._intentionalSocketCloses = new WeakSet();
    // History route params
    this._historyKind = undefined;
    this._historyTableId = undefined;
    this._historyTournamentId = undefined;
    this._historyHandNumber = undefined;
    this._historyListRefreshNonce = 0;
    this._mttTournamentId = null;
    this._mttView = null;
    this._mttLoading = false;
    this._mttError = "";
    this._mttActionPending = false;
    this._allowMttLobby = false;
    this._playerProfileId = undefined;
    this._showProfileSettings = false;
    this._showProfileSignIn = false;
    this._showProfileSignUp = false;
    this._tournamentSignUpPrompted = false;
    this._settingsVolume = 0.75;
    this._settingsVibration = true;
    this._signInCallbackHandled = false;
    initAppEventHandlers(this);
  }

  _normalizeCallbackReturnPath(value) {
    if (typeof value !== "string" || !value.startsWith("/")) {
      return "/";
    }
    if (value.startsWith("//")) {
      return "/";
    }
    return value;
  }

  _isSignInCallbackRoute() {
    return window.location.pathname === "/auth/email-sign-in/callback";
  }

  async _handleSignInCallback() {
    if (this._signInCallbackHandled) return;
    this._signInCallbackHandled = true;

    const url = new URL(window.location.href);
    if (!this._isSignInCallbackRoute()) return;

    const token = url.searchParams.get("token") ?? "";
    if (!token) {
      this.toast = { message: "Unable to sign in", variant: "error" };
      history.replaceState({}, "", "/");
      this.path = "/";
      return;
    }

    let returnTo = "/";
    try {
      const res = await fetch("/api/sign-in-links/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("Invalid or expired sign-in link");
      const data = await res.json();
      returnTo = this._normalizeCallbackReturnPath(data?.returnPath ?? "/");
      this.toast = { message: "Signed in successfully", variant: "success" };
      await this._fetchUser();
    } catch {
      this.toast = { message: "Unable to sign in", variant: "error" };
    }

    const nextUrl = new URL(returnTo, window.location.origin);
    const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
    history.replaceState({}, "", nextPath);
    this.path = nextUrl.pathname;
  }

  // --- History Tasks ---

  // Getters for backward compatibility with tests
  get historyHandList() {
    if (this._historyListTask.status !== TaskStatus.COMPLETE) return null;
    return this._historyListTask.value?.hands ?? [];
  }

  _historyListTask = new Task(this, {
    task: async ([historyApiBase], { signal }) => {
      if (!historyApiBase) return null;
      const res = await fetch(historyApiBase, { signal });
      if (!res.ok) throw new Error("Failed to load hand history");
      return res.json();
    },
    args: () => [this._historyApiBase(), this._historyListRefreshNonce],
  });

  _historyHandTask = new Task(this, {
    task: async ([historyApiBase, handNumber], { signal }) => {
      if (!historyApiBase || !handNumber) return null;
      const res = await fetch(`${historyApiBase}/${handNumber}`, { signal });
      if (!res.ok) throw new Error("Hand not found");
      return res.json();
    },
    args: () => [this._historyApiBase(), this._historyHandNumber],
  });

  _playerProfileTask = new Task(this, {
    task: async ([playerId], { signal }) => {
      if (!playerId) return null;
      const res = await fetch(`/api/players/${playerId}`, { signal });
      if (!res.ok) throw new Error("Player not found");
      return res.json();
    },
    args: () => [this._playerProfileId],
  });

  connectedCallback() {
    super.connectedCallback();
    if (this._isSignInCallbackRoute()) {
      void this._handleSignInCallback();
    } else {
      this._fetchUser();
    }
    connectAppEventHandlers(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    disconnectAppEventHandlers(this);
    this.disconnectFromGame();
  }

  async _fetchUser() {
    try {
      const res = await fetch("/api/users/me");
      if (res.ok) {
        this.user = await res.json();
        this._settingsVolume = this.user.settings.volume;
        this._settingsVibration = this.user.settings.vibration;
      }
    } catch {
      // Ignore fetch errors - user will be created on next request
    }
  }

  _getHomeRedirectPath() {
    if (this.path !== "/") return null;

    const nextPath = this._activeGamePath || this.user?.activeGamePath || null;
    return nextPath && nextPath !== "/" ? nextPath : null;
  }

  _maybeRedirectHomeRoute() {
    const nextPath = this._getHomeRedirectPath();
    if (!nextPath || nextPath === this.path) return false;

    history.replaceState({}, "", nextPath);
    this.path = nextPath;
    return true;
  }

  async _updateUser(updates) {
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        this.user = await res.json();
        this._settingsVolume = this.user.settings.volume;
        this._settingsVibration = this.user.settings.vibration;
      }
    } catch {
      // Ignore update errors
    }
  }

  // --- Game WebSocket Management ---

  connectToGame(path) {
    ws.connectToGame(this, path);
  }

  _reconnectIfNeeded() {
    ws.reconnectIfNeeded(this);
  }

  _resumeConnectionIfNeeded() {
    ws.resumeConnectionIfNeeded(this);
  }

  disconnectFromGame() {
    ws.disconnectFromGame(this);
  }

  sendToGame(message) {
    ws.sendToGame(this, message);
  }

  reportFrontendError(error) {
    ws.reportFrontendError(this, error);
  }

  handleGameNotFound() {
    ws.handleGameNotFound(this);
  }

  dismissToast() {
    this.toast = null;
  }

  handleHandSelect(handNumber) {
    if (handNumber === this._historyHandNumber) return;
    const nextPath = this._getHistoryPath(handNumber);
    history.replaceState({}, "", nextPath);
    this.path = nextPath;
  }

  _clearHistoryState() {
    this._historyKind = undefined;
    this._historyTableId = undefined;
    this._historyTournamentId = undefined;
    this._historyHandNumber = undefined;
  }

  _hasHistoryRoute() {
    return !!this._historyKind && !!this._historyTableId;
  }

  _historyApiBase() {
    return this._hasHistoryRoute() ? this._getHistoryApiBase() : undefined;
  }

  _assertHistoryRouteState() {
    if (!this._historyKind || !this._historyTableId) {
      throw new Error("Expected active history route state");
    }
  }

  _getHistoryApiBase() {
    this._assertHistoryRouteState();
    return getHistoryApiBase(
      this._historyKind,
      this._historyTableId,
      this._historyTournamentId,
    );
  }

  _getHistoryPath(handNumber = undefined) {
    this._assertHistoryRouteState();
    return getHistoryPath(
      this._historyKind,
      this._historyTableId,
      handNumber,
      this._historyTournamentId,
    );
  }

  _getLivePathFromHistory() {
    this._assertHistoryRouteState();
    return getLivePathFromHistory(
      this._historyKind,
      this._historyTableId,
      this._historyTournamentId,
    );
  }

  // --- MTT Routing ---

  _syncMttRoute(liveRoute) {
    mttRouting.syncMttRoute(this, liveRoute);
  }

  _setMttLobbyOverride(allowMttLobby) {
    mttRouting.setMttLobbyOverride(this, allowMttLobby);
  }

  _maybeRedirectMttRoute() {
    mttRouting.maybeRedirectMttRoute(this);
  }

  async performMttAction(action) {
    return mttRouting.performMttAction(this, action);
  }

  async renameMttTournament(name) {
    return mttRouting.renameMttTournament(this, name);
  }

  willUpdate(changedProperties) {
    if (changedProperties.has("path")) {
      syncAppRouteState(this, parseAppPath(this.path));
    }
  }

  _syncMttRouteFromPath() {
    const { liveRoute } = parseAppPath(this.path);
    if (liveRoute) {
      this._syncMttRoute(liveRoute);
    } else if (this._mttTournamentId) {
      this._syncMttRoute(null);
    }
  }

  _redirectToLatestHandIfNeeded() {
    if (!this._hasHistoryRoute()) return;
    if (this._historyListTask.status !== TaskStatus.COMPLETE) return;
    const hands = this._historyListTask.value?.hands || [];
    if (
      this._historyHandNumber === undefined &&
      hands.length > 0 &&
      this.path === this._getHistoryPath()
    ) {
      const latest = hands[hands.length - 1].hand_number;
      const nextPath = this._getHistoryPath(latest);
      history.replaceState({}, "", nextPath);
      this.path = nextPath;
    }
  }

  _handleTaskErrors() {
    if (this._historyListTask.status === TaskStatus.ERROR) {
      const error = /** @type {Error} */ (this._historyListTask.error);
      this.toast = { message: error.message, variant: "error" };
      const livePath = this._getLivePathFromHistory();
      history.replaceState({}, "", livePath);
      this.path = livePath;
    }

    if (this._historyHandTask.status === TaskStatus.ERROR) {
      const error = /** @type {Error} */ (this._historyHandTask.error);
      this.toast = { message: error.message, variant: "error" };
      const livePath = this._getLivePathFromHistory();
      history.replaceState({}, "", livePath);
      this.path = livePath;
    }

    if (this._playerProfileTask.status === TaskStatus.ERROR) {
      const error = /** @type {Error} */ (this._playerProfileTask.error);
      this.toast = { message: error.message, variant: "error" };
      history.replaceState({}, "", "/");
      this.path = "/";
    }
  }

  _maybePromptTournamentSignUp() {
    if (this.path !== "/mtt") {
      this._tournamentSignUpPrompted = false;
      return;
    }
    if (!this.user || this.user.email || this._tournamentSignUpPrompted) {
      return;
    }

    this._tournamentSignUpPrompted = true;
    this._showProfileSignUp = true;
  }

  updated() {
    if (this._maybeRedirectHomeRoute()) {
      return;
    }
    this._syncMttRouteFromPath();
    this._redirectToLatestHandIfNeeded();
    this._handleTaskErrors();
    this._maybeRedirectMttRoute();
    this._maybePromptTournamentSignUp();
  }

  _renderShellPage(route) {
    const shellViews = {
      home: () => renderHomeView(),
      mtt_lobby: () => renderMttLobbyView(this),
      player_profile: () => renderPlayerProfileView(this),
      release_notes: () => renderReleaseNotesView(),
      tournaments: () => renderTournamentsView(this),
    };
    const shellContent = (shellViews[route.page] ?? shellViews.home)();
    return renderShellView(this, shellContent, {
      navigationRenderer: route.page === "mtt_lobby" ? () => "" : undefined,
    });
  }

  _renderRoute(route) {
    if (route.page === "history") {
      return renderHistoryView(this, route.historyRoute);
    }
    if (route.page === "game" && isTableLiveRoute(route.liveRoute)) {
      return renderGameView(this, route.liveRoute);
    }
    return this._renderShellPage(route);
  }

  render() {
    const currentPath = this._getHomeRedirectPath() || this.path;
    const route = parseAppPath(currentPath);

    ws.manageConnection(this, route.resourcePath);

    if (this._isSignInCallbackRoute()) {
      return renderAuthStatusView(this);
    }

    return this._renderRoute(route);
  }
}

Object.assign(App.prototype, appProfileActions);
Object.assign(App.prototype, appSignInActions);

customElements.define("phg-app", App);
