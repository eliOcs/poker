import { css, LitElement } from "lit";
import { Task, TaskStatus } from "@lit/task";
import { designTokens, baseStyles } from "./styles.js";
import { appModalStyles } from "./app-modal-styles.js";
import { appAuthStatusStyles } from "./app-auth-status.js";
import "./home.js";
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
  renderMttLobbyView,
  renderReleaseNotesView,
  renderAuthStatusView,
  renderShellView,
} from "./app-render.js";
import {
  getHistoryApiBase,
  getHistoryPath,
  getLivePathFromHistory,
  isConnectableLiveRoute,
  parseAppPath,
  syncAppHistoryState,
} from "./app-route-state.js";
import * as ws from "./app-websocket.js";
import * as mttRouting from "./app-mtt-routing.js";

class App extends LitElement {
  static get styles() {
    return [
      designTokens,
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
      _settingsVolume: { state: true },
      _profileSignInInvalid: { state: true },
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
    this._intentionalSocketCloses = new WeakSet();
    // History route params
    this._historyKind = null;
    this._historyTableId = null;
    this._historyTournamentId = null;
    this._historyHandNumber = null;
    this._historyListRefreshNonce = 0;
    this._mttTournamentId = null;
    this._mttView = null;
    this._mttLoading = false;
    this._mttError = "";
    this._mttActionPending = false;
    this._allowMttLobby = false;
    this._playerProfileId = null;
    this._showProfileSettings = false;
    this._showProfileSignIn = false;
    this._settingsVolume = 0.75;
    this._profileSignInInvalid = false;
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
    args: () => [this._getHistoryApiBase(), this._historyListRefreshNonce],
  });

  _historyHandTask = new Task(this, {
    task: async ([historyApiBase, handNumber], { signal }) => {
      if (!historyApiBase || !handNumber) return null;
      const res = await fetch(`${historyApiBase}/${handNumber}`, { signal });
      if (!res.ok) throw new Error("Hand not found");
      return res.json();
    },
    args: () => [this._getHistoryApiBase(), this._historyHandNumber],
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
        this._settingsVolume = this.user?.settings?.volume ?? 0.75;
      }
    } catch {
      // Ignore fetch errors - user will be created on next request
    }
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
        this._settingsVolume = this.user?.settings?.volume ?? 0.75;
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

  openProfileSettings() {
    this._settingsVolume = this.user?.settings?.volume ?? 0.75;
    this._showProfileSettings = true;
  }

  closeProfileSettings() {
    this._showProfileSettings = false;
  }

  openProfileSignIn() {
    this._profileSignInInvalid = false;
    this._showProfileSignIn = true;
  }

  closeProfileSignIn() {
    this._profileSignInInvalid = false;
    this._showProfileSignIn = false;
  }

  clearProfileSignInValidation() {
    this._profileSignInInvalid = false;
  }

  requestProfileSignIn() {
    const input = /** @type {HTMLInputElement|null} */ (
      this.shadowRoot?.querySelector("#profile-sign-in-email")
    );
    const email = input?.value.trim() || "";
    if (!email || !input?.checkValidity()) {
      this._profileSignInInvalid = true;
      input?.focus();
      return;
    }
    this._profileSignInInvalid = false;
    this.dispatchEvent(
      new CustomEvent("request-sign-in", {
        detail: { email },
        bubbles: true,
        composed: true,
      }),
    );
    this._showProfileSignIn = false;
  }

  async saveProfileSettings() {
    const input = /** @type {HTMLInputElement|null} */ (
      this.shadowRoot?.querySelector("#profile-settings-name-input")
    );
    const name = input?.value.trim() || "";
    await this._updateUser({
      name,
      settings: { volume: this._settingsVolume },
    });
    this._showProfileSettings = false;
    this.toast = { message: "Settings saved", variant: "success" };
  }

  handleHandSelect(handNumber) {
    if (handNumber === this._historyHandNumber) return;
    const nextPath = this._getHistoryPath(handNumber);
    history.replaceState({}, "", nextPath);
    this.path = nextPath;
  }

  _clearHistoryState() {
    this._historyKind = null;
    this._historyTableId = null;
    this._historyTournamentId = null;
    this._historyHandNumber = null;
  }

  _getHistoryApiBase() {
    return getHistoryApiBase(
      this._historyKind,
      this._historyTableId,
      this._historyTournamentId,
    );
  }

  _getHistoryPath(handNumber = null) {
    return getHistoryPath(
      this._historyKind,
      this._historyTableId,
      handNumber,
      this._historyTournamentId,
    );
  }

  _getLivePathFromHistory() {
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

  willUpdate(changedProperties) {
    if (changedProperties.has("path")) {
      const { liveRoute, historyRoute, playerProfileId } = parseAppPath(
        this.path,
      );
      if (!isConnectableLiveRoute(liveRoute)) {
        this.socialAction = null;
      }
      syncAppHistoryState(this, historyRoute);
      this._playerProfileId = playerProfileId;
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
    if (this._historyListTask.status !== TaskStatus.COMPLETE) return;
    const hands = this._historyListTask.value?.hands || [];
    if (
      this._historyHandNumber === null &&
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

  updated() {
    this._syncMttRouteFromPath();
    this._redirectToLatestHandIfNeeded();
    this._handleTaskErrors();
    this._maybeRedirectMttRoute();
  }

  _resolveShellContent(liveRoute, playerProfileId, releaseNotesMatch) {
    if (playerProfileId) return renderPlayerProfileView(this);
    if (liveRoute?.kind === "mtt") return renderMttLobbyView(this);
    if (releaseNotesMatch) return renderReleaseNotesView();
    return renderHomeView();
  }

  _isTableRoute(liveRoute) {
    const tableKinds = ["cash", "sitngo", "mtt_table"];
    return liveRoute != null && tableKinds.includes(liveRoute.kind);
  }

  _renderParsedPath(liveRoute, historyRoute, playerProfileId) {
    if (historyRoute) return renderHistoryView(this, historyRoute);
    if (this._isTableRoute(liveRoute)) return renderGameView(this, liveRoute);
    const releaseNotesMatch = this.path === "/release-notes";
    const shellContent = this._resolveShellContent(
      liveRoute,
      playerProfileId,
      releaseNotesMatch,
    );
    return renderShellView(this, shellContent, {
      navigationRenderer: liveRoute?.kind === "mtt" ? () => "" : undefined,
    });
  }

  render() {
    const { liveRoute, historyRoute, playerProfileId, resourcePath } =
      parseAppPath(this.path);

    ws.manageConnection(this, resourcePath);

    if (this._isSignInCallbackRoute()) {
      return renderAuthStatusView(this);
    }

    return this._renderParsedPath(liveRoute, historyRoute, playerProfileId);
  }
}

customElements.define("phg-app", App);
