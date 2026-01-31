import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import "./home.js";
import "./index.js";
import "./history.js";
import "./toast.js";

class App extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
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
      gameConnectionStatus: { type: String },
      // History state
      historyHand: { type: Object },
      historyView: { type: Object },
      historyHandList: { type: Array },
      historyLoading: { type: Boolean },
      historyPlayerId: { type: String },
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
    this.gameConnectionStatus = "disconnected";
    this._activeGameId = null;
    this._socket = null;
    // History state
    this.historyHand = null;
    this.historyView = null;
    this.historyHandList = null;
    this.historyLoading = false;
    this.historyPlayerId = null;
    this._historyGameId = null;
    this._historyHandNumber = null;
    this._fetchingHistory = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this._fetchUser();
    window.addEventListener("popstate", () => {
      this.path = window.location.pathname;
    });
    this.addEventListener("navigate", (e) => {
      history.pushState({}, "", e.detail.path);
      this.path = e.detail.path;
    });
    this.addEventListener("toast", (e) => {
      this.toast = e.detail;
    });
    this.addEventListener("hand-select", (e) => {
      this.handleHandSelect(e.detail.handNumber);
    });
    this.addEventListener("game-action", (e) => {
      this.sendToGame(e.detail);
    });
    this.addEventListener("update-user", (e) => {
      this._updateUser(e.detail);
    });
  }

  async _fetchUser() {
    try {
      const res = await fetch("/api/users/me");
      if (res.ok) {
        this.user = await res.json();
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
      }
    } catch {
      // Ignore update errors
    }
  }

  // --- Game WebSocket Management ---

  connectToGame(gameId) {
    // Already connected to this game
    if (this._activeGameId === gameId && this._socket) {
      return;
    }

    // Disconnect from previous game if different
    if (this._activeGameId && this._activeGameId !== gameId) {
      this.disconnectFromGame();
    }

    this._activeGameId = gameId;
    this.game = null;
    this.gameConnectionStatus = "connecting";

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this._socket = new WebSocket(
      `${protocol}//${window.location.host}/games/${gameId}`,
    );

    this._socket.onopen = () => {
      this.gameConnectionStatus = "connected";
    };

    this._socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        this.toast = { message: data.error.message, variant: "error" };
      } else {
        this.game = data;
      }
    };

    this._socket.onerror = () => {
      this.handleGameNotFound();
    };

    this._socket.onclose = (event) => {
      this.gameConnectionStatus = "disconnected";
      // Code 1006 = abnormal closure (connection rejected)
      if (!this.game && event.code === 1006) {
        this.handleGameNotFound();
      }
    };
  }

  disconnectFromGame() {
    if (this._socket) {
      this._socket.close();
      this._socket = null;
    }
    this._activeGameId = null;
    this.game = null;
    this.gameConnectionStatus = "disconnected";
  }

  sendToGame(message) {
    if (this._socket?.readyState === WebSocket.OPEN) {
      this._socket.send(JSON.stringify(message));
    }
  }

  handleGameNotFound() {
    this.toast = { message: "Game not found", variant: "error" };
    this.disconnectFromGame();
    history.replaceState({}, "", "/");
    this.path = "/";
  }

  dismissToast() {
    this.toast = null;
  }

  renderToast() {
    if (!this.toast) return "";
    return html`
      <phg-toast
        variant=${this.toast.variant || "info"}
        .duration=${this.toast.duration || 3000}
        .message=${this.toast.message}
        @dismiss=${this.dismissToast}
      ></phg-toast>
    `;
  }

  // Route: /history/gameId - fetch list and redirect to latest hand
  async _enterHistoryList(gameId) {
    if (this._fetchingHistory) return;
    this._fetchingHistory = true;

    this._historyGameId = gameId;
    this.historyLoading = true;
    this.historyHand = null;
    this.historyView = null;
    this.historyHandList = null;

    try {
      const res = await fetch(`/api/history/${gameId}`);
      if (!res.ok) throw new Error("Failed to load hand history");

      const data = await res.json();
      this.historyHandList = data.hands || [];
      this.historyPlayerId = data.playerId;

      // Redirect to latest hand if available
      if (this.historyHandList.length > 0) {
        const latest =
          this.historyHandList[this.historyHandList.length - 1].hand_number;
        // Only redirect if still on the list route (not already navigated elsewhere)
        if (this.path === `/history/${gameId}`) {
          history.replaceState({}, "", `/history/${gameId}/${latest}`);
          this.path = `/history/${gameId}/${latest}`;
          await this._enterHistoryHand(gameId, latest);
        } else {
          // Path changed during fetch, just finish loading
          this.historyLoading = false;
        }
      } else {
        this.historyLoading = false;
      }
    } catch (err) {
      this.toast = { message: err.message, variant: "error" };
      history.replaceState({}, "", `/games/${gameId}`);
      this.path = `/games/${gameId}`;
    } finally {
      this._fetchingHistory = false;
    }
  }

  // Route: /history/gameId/handNumber - fetch specific hand
  async _enterHistoryHand(gameId, handNumber) {
    if (handNumber === this._historyHandNumber) return;

    this._historyGameId = gameId;
    this._historyHandNumber = handNumber;

    try {
      // Fetch list if not loaded (direct navigation to hand URL)
      // Skip if _enterHistoryList is already fetching
      if (this.historyHandList === null && !this._fetchingHistory) {
        const listRes = await fetch(`/api/history/${gameId}`);
        if (listRes.ok) {
          const listData = await listRes.json();
          this.historyHandList = listData.hands || [];
          this.historyPlayerId = listData.playerId;
        }
      }

      const res = await fetch(`/api/history/${gameId}/${handNumber}`);
      if (!res.ok) throw new Error("Hand not found");

      const data = await res.json();
      this.historyHand = data.hand;
      this.historyView = data.view;
      this.historyLoading = false;
    } catch (err) {
      this.toast = { message: err.message, variant: "error" };
      history.replaceState({}, "", `/games/${gameId}`);
      this.path = `/games/${gameId}`;
    }
  }

  handleHandSelect(handNumber) {
    if (handNumber === this._historyHandNumber) return;
    history.pushState({}, "", `/history/${this._historyGameId}/${handNumber}`);
    this.path = `/history/${this._historyGameId}/${handNumber}`;
  }

  _manageConnection(gameId) {
    if (gameId) {
      this.connectToGame(gameId);
    } else if (this._activeGameId) {
      this.disconnectFromGame();
    }
  }

  _renderGameView(gameMatch) {
    return html`${this.renderToast()}<phg-game
        .gameId=${gameMatch[1]}
        .game=${this.game}
        .user=${this.user}
        .connectionStatus=${this.gameConnectionStatus}
      ></phg-game>`;
  }

  _renderHistoryView(historyMatch) {
    return html`${this.renderToast()}<phg-history
        .gameId=${historyMatch[1]}
        .handNumber=${this._historyHandNumber}
        .hand=${this.historyHand}
        .view=${this.historyView}
        .handList=${this.historyHandList}
        .loading=${this.historyLoading}
        .playerId=${this.historyPlayerId}
      ></phg-history>`;
  }

  _clearHistoryState() {
    this._historyGameId = null;
    this._historyHandNumber = null;
    this.historyHandList = null;
    this.historyHand = null;
    this.historyView = null;
    this.historyLoading = false;
    this._fetchingHistory = false;
  }

  willUpdate(changedProperties) {
    if (changedProperties.has("path")) {
      const historyMatch = this.path.match(
        /^\/history\/([a-z0-9]+)(?:\/(\d+))?$/,
      );
      if (historyMatch) {
        const gameId = historyMatch[1];
        const handNumber = historyMatch[2]
          ? parseInt(historyMatch[2], 10)
          : null;

        if (handNumber === null) {
          this._enterHistoryList(gameId);
        } else {
          this._enterHistoryHand(gameId, handNumber);
        }
      }
    }
  }

  render() {
    const gameMatch = this.path.match(/^\/games\/([a-z0-9]+)$/);
    const historyMatch = this.path.match(
      /^\/history\/([a-z0-9]+)(?:\/(\d+))?$/,
    );
    const gameId = gameMatch?.[1] || historyMatch?.[1] || null;

    this._manageConnection(gameId);

    if (gameMatch) {
      this._clearHistoryState();
      return this._renderGameView(gameMatch);
    }
    if (historyMatch) return this._renderHistoryView(historyMatch);
    this._clearHistoryState();
    return html`${this.renderToast()}<phg-home></phg-home>`;
  }
}

customElements.define("phg-app", App);
