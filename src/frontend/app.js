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

  async _fetchHandList(gameId) {
    const listRes = await fetch(`/api/history/${gameId}`);
    if (!listRes.ok) {
      throw new Error("Failed to load hand history");
    }
    const listData = await listRes.json();
    this.historyHandList = listData.hands || [];
    this.historyPlayerId = listData.playerId;
  }

  async _fetchHand(gameId, handNumber) {
    const handRes = await fetch(`/api/history/${gameId}/${handNumber}`);
    if (!handRes.ok) {
      throw new Error("Hand not found");
    }
    const handData = await handRes.json();
    this.historyHand = handData.hand;
    this.historyView = handData.view;
  }

  _shouldFetchHistory(gameId, handNumber) {
    const isEntering = handNumber === null;
    const isNewHand = handNumber !== this._historyHandNumber;

    // Skip if already fetching
    if (this.historyLoading) return false;

    // Skip if we already fetched for this game (list is loaded, even if empty)
    if (isEntering && gameId === this._historyGameId && this.historyHandList !== null) {
      return false;
    }

    // Skip if just navigating to same hand
    if (!isEntering && !isNewHand) return false;

    return true;
  }

  _getTargetHand(gameId, handNumber) {
    if (handNumber) return handNumber;
    if (this.historyHandList.length === 0) return null;

    const targetHand =
      this.historyHandList[this.historyHandList.length - 1].hand_number;
    const newPath = `/history/${gameId}/${targetHand}`;
    history.replaceState({}, "", newPath);
    this.path = newPath;
    return targetHand;
  }

  async fetchHistoryData(gameId, handNumber) {
    if (!this._shouldFetchHistory(gameId, handNumber)) return;

    const isEntering = handNumber === null;
    this._historyGameId = gameId;

    try {
      if (isEntering) {
        this.historyLoading = true;
        this.historyHand = null;
        this.historyView = null;
        this.historyHandList = null;
        await this._fetchHandList(gameId);
      }

      const targetHand = this._getTargetHand(gameId, handNumber);
      this._historyHandNumber = targetHand;

      if (targetHand) {
        await this._fetchHand(gameId, targetHand);
      }

      this.historyLoading = false;
    } catch (err) {
      this.toast = { message: err.message, variant: "error" };
      history.replaceState({}, "", `/games/${gameId}`);
      this.path = `/games/${gameId}`;
    }
  }

  handleHandSelect(handNumber) {
    if (handNumber === this._historyHandNumber) return;

    // Update URL - fetchHistoryData will be called via _renderHistoryView
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
    if (this._historyGameId !== null) {
      this._historyGameId = null;
      this._historyHandNumber = null;
      this.historyHandList = null;
      this.historyHand = null;
      this.historyView = null;
      this.historyLoading = false;
    }
  }

  updated(changedProperties) {
    if (changedProperties.has("path")) {
      const historyMatch = this.path.match(
        /^\/history\/([a-z0-9]+)(?:\/(\d+))?$/,
      );
      if (historyMatch) {
        const handNumber = historyMatch[2]
          ? parseInt(historyMatch[2], 10)
          : null;
        this.fetchHistoryData(historyMatch[1], handNumber);
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
