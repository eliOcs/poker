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
      // Game state (managed here, passed to phg-game)
      game: { type: Object },
      gameConnectionStatus: { type: String },
      // History state
      historyHand: { type: Object },
      historyView: { type: Object },
      historyHandList: { type: Array },
      historyLoading: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.path = window.location.pathname;
    this.toast = null;
    // Game state
    this.game = null;
    this.gameConnectionStatus = "disconnected";
    this._activeGameId = null;
    this._socket = null;
    // History state
    this.historyHand = null;
    this.historyView = null;
    this.historyHandList = null;
    this.historyLoading = true;
    this._historyGameId = null;
    this._historyHandNumber = null;
  }

  connectedCallback() {
    super.connectedCallback();
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

  async fetchHistoryData(gameId, handNumber) {
    // Reset state for new game
    if (gameId !== this._historyGameId) {
      this.historyHand = null;
      this.historyView = null;
      this.historyHandList = null;
      this._historyGameId = gameId;
    }

    this.historyLoading = true;
    this._historyHandNumber = handNumber;

    try {
      // Fetch hand list if not loaded for this game
      if (!this.historyHandList) {
        const listRes = await fetch(`/api/history/${gameId}`);
        if (!listRes.ok) {
          throw new Error("Failed to load hand history");
        }
        const listData = await listRes.json();
        this.historyHandList = listData.hands || [];
      }

      // Determine which hand to load
      let targetHand = handNumber;
      if (!targetHand && this.historyHandList.length > 0) {
        targetHand =
          this.historyHandList[this.historyHandList.length - 1].hand_number;
        this._historyHandNumber = targetHand;
        // Update URL and path to include hand number
        const newPath = `/history/${gameId}/${targetHand}`;
        history.replaceState({}, "", newPath);
        this.path = newPath;
      }

      // Fetch specific hand data
      if (targetHand) {
        const handRes = await fetch(`/api/history/${gameId}/${targetHand}`);
        if (!handRes.ok) {
          throw new Error("Hand not found");
        }
        const handData = await handRes.json();
        this.historyHand = handData.hand;
        this.historyView = handData.view;
      }

      this.historyLoading = false;
    } catch (err) {
      // Redirect to game and show error toast
      this.toast = { message: err.message, variant: "error" };
      history.replaceState({}, "", `/games/${gameId}`);
      this.path = `/games/${gameId}`;
    }
  }

  handleHandSelect(handNumber) {
    if (handNumber === this._historyHandNumber) return;

    // Update URL
    history.pushState({}, "", `/history/${this._historyGameId}/${handNumber}`);
    this.path = `/history/${this._historyGameId}/${handNumber}`;

    // Fetch the selected hand (list is already loaded)
    this.fetchHistoryHand(handNumber);
  }

  async fetchHistoryHand(handNumber) {
    this._historyHandNumber = handNumber;

    try {
      const res = await fetch(
        `/api/history/${this._historyGameId}/${handNumber}`,
      );
      if (!res.ok) {
        throw new Error("Hand not found");
      }
      const data = await res.json();
      this.historyHand = data.hand;
      this.historyView = data.view;
    } catch (err) {
      // Redirect to game and show error toast
      this.toast = { message: err.message, variant: "error" };
      history.replaceState({}, "", `/games/${this._historyGameId}`);
      this.path = `/games/${this._historyGameId}`;
    }
  }

  render() {
    const gameMatch = this.path.match(/^\/games\/([a-z0-9]+)$/);
    const historyMatch = this.path.match(
      /^\/history\/([a-z0-9]+)(?:\/(\d+))?$/,
    );

    // Determine gameId from either route
    const gameId = gameMatch?.[1] || historyMatch?.[1] || null;

    // Manage WebSocket connection based on current route
    if (gameId) {
      this.connectToGame(gameId);
    } else if (this._activeGameId) {
      this.disconnectFromGame();
    }

    // Render game view
    if (gameMatch) {
      return html`${this.renderToast()}<phg-game
          .gameId=${gameMatch[1]}
          .game=${this.game}
          .connectionStatus=${this.gameConnectionStatus}
        ></phg-game>`;
    }

    // Render history view (connection stays alive for same gameId)
    if (historyMatch) {
      const handNumber = historyMatch[2] ? parseInt(historyMatch[2], 10) : null;

      // Trigger data fetch if needed
      if (
        historyMatch[1] !== this._historyGameId ||
        handNumber !== this._historyHandNumber
      ) {
        this.fetchHistoryData(historyMatch[1], handNumber);
      }

      return html`${this.renderToast()}<phg-history
          .gameId=${historyMatch[1]}
          .handNumber=${this._historyHandNumber}
          .hand=${this.historyHand}
          .view=${this.historyView}
          .handList=${this.historyHandList}
          .loading=${this.historyLoading}
        ></phg-history>`;
    }

    return html`${this.renderToast()}<phg-home></phg-home>`;
  }
}

customElements.define("phg-app", App);
