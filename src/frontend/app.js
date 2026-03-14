/* eslint-disable max-lines */
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
import { createFrontendErrorReport } from "./error-reporting.js";
import { getTablePath, matchLiveRoute } from "../shared/routes.js";
import {
  getHistoryApiBase,
  getHistoryPath,
  getLivePathFromHistory,
  isConnectableLiveRoute,
  isHistoryRouteForLivePath,
  parseAppPath,
  syncAppHistoryState,
} from "./app-route-state.js";

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
      this.toast = {
        message: "Unable to sign in",
        variant: "error",
      };
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
      if (!res.ok) {
        throw new Error("Invalid or expired sign-in link");
      }
      const data = await res.json();
      returnTo = this._normalizeCallbackReturnPath(data?.returnPath ?? "/");
      this.toast = {
        message: "Signed in successfully",
        variant: "success",
      };
      await this._fetchUser();
    } catch {
      this.toast = {
        message: "Unable to sign in",
        variant: "error",
      };
    }

    const nextUrl = new URL(returnTo, window.location.origin);
    const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
    history.replaceState({}, "", nextPath);
    this.path = nextUrl.pathname;
  }

  // --- History Tasks ---

  // Getters for backward compatibility with tests
  get historyHandList() {
    // Return null if task hasn't completed, otherwise return hands array (or empty array)
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
    const liveRoute = matchLiveRoute(path);
    if (!liveRoute) {
      return;
    }

    // Already connected to this game
    if (this._activeGamePath === path && this._socket) {
      return;
    }

    // Disconnect from previous game if different
    if (this._activeGamePath && this._activeGamePath !== path) {
      this.disconnectFromGame();
    }

    this._activeGameId =
      liveRoute.kind === "mtt" ? liveRoute.tournamentId : liveRoute.tableId;
    this._activeGamePath = path;
    this.game = null;
    this.socialAction = null;
    this.gameConnectionStatus = "connecting";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}${path}`);
    this._socket = socket;

    socket.onopen = () => {
      if (this._socket !== socket) return;
      this.gameConnectionStatus = "connected";
    };

    socket.onmessage = (event) => {
      if (this._socket !== socket) return;
      const data = JSON.parse(event.data);
      if (data.error) {
        this.toast = { message: data.error.message, variant: "error" };
        return;
      }

      if (data.type === "social") {
        if (!matchLiveRoute(this.path)) return;
        this.socialAction = data;
        return;
      }

      if (data.type === "history") {
        if (
          data.event === "handRecorded" &&
          isHistoryRouteForLivePath(this.path, this._activeGamePath)
        ) {
          this._historyListRefreshNonce += 1;
        }
        return;
      }

      if (data.type === "tournamentState") {
        this._mttView = data.tournament;
        this._mttLoading = false;
        this._mttError = "";
        this._maybeRedirectMttRoute();
        return;
      }

      // Ignore any typed envelope that is not a direct player-view payload.
      if (data.type) return;

      this.game = data;
    };

    socket.onerror = () => {
      if (this._socket !== socket) return;
      this.handleGameNotFound();
    };

    socket.onclose = (event) => {
      const intentionallyClosed =
        this._intentionalSocketCloses.has(socket) || this._socket !== socket;
      this._intentionalSocketCloses.delete(socket);

      if (this._socket !== socket) {
        return;
      }

      this._socket = null;
      this.gameConnectionStatus = "disconnected";
      // Code 1006 = abnormal closure (connection rejected before game loaded)
      if (!this.game && !this._mttView && event.code === 1006) {
        this.handleGameNotFound();
        return;
      }
      // Reconnect automatically unless we closed intentionally
      if (!intentionallyClosed && this._activeGamePath === path) {
        setTimeout(() => {
          if (!this._socket && this._activeGamePath === path) {
            this._reconnectIfNeeded();
          }
        }, 1000);
      }
    };
  }

  _reconnectIfNeeded() {
    if (
      this._activeGamePath &&
      (!this._socket || this._socket.readyState === WebSocket.CLOSED)
    ) {
      const path = this._activeGamePath;
      this._activeGameId = null;
      this._activeGamePath = null;
      this.connectToGame(path);
    }
  }

  disconnectFromGame() {
    if (this._socket) {
      this._intentionalSocketCloses.add(this._socket);
      this._socket.close();
      this._socket = null;
    }
    this._activeGameId = null;
    this._activeGamePath = null;
    this.game = null;
    this.socialAction = null;
    this.gameConnectionStatus = "disconnected";
  }

  sendToGame(message) {
    if (this._socket?.readyState === WebSocket.OPEN) {
      this._socket.send(JSON.stringify(message));
    }
  }

  reportFrontendError(error) {
    const payload = createFrontendErrorReport(
      error,
      window.location.pathname,
      this._activeGameId,
      this.gameConnectionStatus,
    );

    void fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }

  handleGameNotFound() {
    const liveRoute = matchLiveRoute(this.path);
    this.toast = {
      message:
        liveRoute?.kind === "mtt" ? "Tournament not found" : "Game not found",
      variant: "error",
    };
    this.disconnectFromGame();
    history.replaceState({}, "", "/");
    this.path = "/";
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
    this.toast = {
      message: "Settings saved",
      variant: "success",
    };
  }

  handleHandSelect(handNumber) {
    if (handNumber === this._historyHandNumber) return;
    const nextPath = this._getHistoryPath(handNumber);
    history.replaceState({}, "", nextPath);
    this.path = nextPath;
  }

  _manageConnection(path) {
    if (path) {
      if (this._activeGamePath === path && !this._socket) {
        return;
      }
      this.connectToGame(path);
    } else if (this._activeGamePath) {
      this.disconnectFromGame();
    }
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

  _syncMttRoute(liveRoute) {
    const tournamentId =
      liveRoute?.kind === "mtt" || liveRoute?.kind === "mtt_table"
        ? liveRoute.tournamentId
        : null;
    if (tournamentId === this._mttTournamentId) return;

    this._mttTournamentId = tournamentId;
    this._mttView = null;
    this._mttLoading = tournamentId !== null;
    this._mttError = "";
    this._mttActionPending = false;
  }

  _resolveMttRedirectPath(liveRoute) {
    if (!liveRoute || !this._mttTournamentId || !this._mttView) {
      return null;
    }

    const nextTableId = this._mttView.currentPlayer?.tableId;
    if (this._mttView.status !== "running" || !nextTableId) {
      return null;
    }

    if (liveRoute.kind === "mtt") {
      return getTablePath("mtt", nextTableId, this._mttTournamentId);
    }

    if (liveRoute.kind === "mtt_table" && liveRoute.tableId !== nextTableId) {
      return getTablePath("mtt", nextTableId, this._mttTournamentId);
    }

    return null;
  }

  _maybeRedirectMttRoute() {
    const { liveRoute } = parseAppPath(this.path);
    const nextPath = this._resolveMttRedirectPath(liveRoute);
    if (!nextPath || nextPath === this.path) return;

    if (liveRoute?.kind === "mtt_table") {
      const tableName =
        this._mttView?.tables.find(
          (table) => table.tableId === this._mttView?.currentPlayer?.tableId,
        )?.tableName || "your new table";
      this.toast = {
        message: `Moved to ${tableName}`,
        variant: "info",
      };
    }

    history.replaceState({}, "", nextPath);
    this.path = nextPath;
  }

  async performMttAction(action) {
    if (!this._mttTournamentId || this._mttActionPending) return;

    this._mttActionPending = true;
    try {
      const res = await fetch(`/api/mtt/${this._mttTournamentId}/${action}`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Failed to ${action}`);
      }
      this._mttView = data;
      this._mttError = "";
      this._maybeRedirectMttRoute();
    } catch (err) {
      const error = /** @type {Error} */ (err);
      this.toast = { message: error.message, variant: "error" };
    } finally {
      this._mttActionPending = false;
    }
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

  // eslint-disable-next-line complexity
  updated() {
    if (parseAppPath(this.path).liveRoute) {
      this._syncMttRoute(parseAppPath(this.path).liveRoute);
    } else if (this._mttTournamentId) {
      this._syncMttRoute(null);
    }

    // Handle redirect to latest hand when list loads
    if (this._historyListTask.status === TaskStatus.COMPLETE) {
      const listData = this._historyListTask.value;
      const hands = listData?.hands || [];

      // Redirect if on list route (no hand number) and hands exist
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

    // Handle task errors
    if (this._historyListTask.status === TaskStatus.ERROR) {
      const error = /** @type {Error} */ (this._historyListTask.error);
      this.toast = {
        message: error.message,
        variant: "error",
      };
      const livePath = this._getLivePathFromHistory();
      history.replaceState({}, "", livePath);
      this.path = livePath;
    }

    if (this._historyHandTask.status === TaskStatus.ERROR) {
      const error = /** @type {Error} */ (this._historyHandTask.error);
      this.toast = {
        message: error.message,
        variant: "error",
      };
      const livePath = this._getLivePathFromHistory();
      history.replaceState({}, "", livePath);
      this.path = livePath;
    }

    if (this._playerProfileTask.status === TaskStatus.ERROR) {
      const error = /** @type {Error} */ (this._playerProfileTask.error);
      this.toast = {
        message: error.message,
        variant: "error",
      };
      history.replaceState({}, "", "/");
      this.path = "/";
    }

    this._maybeRedirectMttRoute();
  }

  // eslint-disable-next-line complexity
  render() {
    const { liveRoute, historyRoute, playerProfileId, resourcePath } =
      parseAppPath(this.path);
    const releaseNotesMatch = this.path === "/release-notes";

    this._manageConnection(resourcePath);

    if (this._isSignInCallbackRoute()) {
      return renderAuthStatusView(this);
    }
    if (
      liveRoute &&
      (liveRoute.kind === "cash" ||
        liveRoute.kind === "sitngo" ||
        liveRoute.kind === "mtt_table")
    ) {
      return renderGameView(this, liveRoute);
    }
    if (historyRoute) return renderHistoryView(this, historyRoute);

    // All shell routes use the same template so phg-app-shell stays alive
    const shellContent = playerProfileId
      ? renderPlayerProfileView(this)
      : liveRoute?.kind === "mtt"
        ? renderMttLobbyView(this)
        : releaseNotesMatch
          ? renderReleaseNotesView()
          : renderHomeView();

    return renderShellView(this, shellContent);
  }
}

customElements.define("phg-app", App);
