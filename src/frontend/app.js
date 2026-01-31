import { html, css, LitElement } from "lit";
import { Task, TaskStatus } from "@lit/task";
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
      // History route params (triggers tasks)
      _historyGameId: { state: true },
      _historyHandNumber: { state: true },
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
    // History route params
    this._historyGameId = null;
    this._historyHandNumber = null;
  }

  // --- History Tasks ---

  // Getters for backward compatibility with tests
  get historyHandList() {
    // Return null if task hasn't completed, otherwise return hands array (or empty array)
    if (this._historyListTask.status !== TaskStatus.COMPLETE) return null;
    return this._historyListTask.value?.hands ?? [];
  }

  get historyLoading() {
    return (
      this._historyListTask.status === TaskStatus.PENDING ||
      this._historyHandTask.status === TaskStatus.PENDING
    );
  }

  _historyListTask = new Task(this, {
    task: async ([gameId], { signal }) => {
      if (!gameId) return null;
      const res = await fetch(`/api/history/${gameId}`, { signal });
      if (!res.ok) throw new Error("Failed to load hand history");
      return res.json();
    },
    args: () => [this._historyGameId],
  });

  _historyHandTask = new Task(this, {
    task: async ([gameId, handNumber], { signal }) => {
      if (!gameId || !handNumber) return null;
      const res = await fetch(`/api/history/${gameId}/${handNumber}`, {
        signal,
      });
      if (!res.ok) throw new Error("Hand not found");
      return res.json();
    },
    args: () => [this._historyGameId, this._historyHandNumber],
  });

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
    const listData = this._historyListTask.value;
    const handData = this._historyHandTask.value;
    const isLoading =
      this._historyListTask.status === TaskStatus.PENDING ||
      this._historyHandTask.status === TaskStatus.PENDING;

    return html`${this.renderToast()}<phg-history
        .gameId=${historyMatch[1]}
        .handNumber=${this._historyHandNumber}
        .hand=${handData?.hand}
        .view=${handData?.view}
        .handList=${listData?.hands}
        .loading=${isLoading}
        .playerId=${listData?.playerId}
      ></phg-history>`;
  }

  _clearHistoryState() {
    this._historyGameId = null;
    this._historyHandNumber = null;
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

        // Set gameId - this triggers list task if changed
        if (gameId !== this._historyGameId) {
          this._historyGameId = gameId;
          this._historyHandNumber = null; // Reset hand when game changes
        }

        // Set handNumber - this triggers hand task if changed
        if (handNumber !== null && handNumber !== this._historyHandNumber) {
          this._historyHandNumber = handNumber;
        }
      } else {
        // Clear history state when navigating away from history
        this._clearHistoryState();
      }
    }
  }

  updated() {
    // Handle redirect to latest hand when list loads
    if (this._historyListTask.status === TaskStatus.COMPLETE) {
      const listData = this._historyListTask.value;
      const hands = listData?.hands || [];

      // Redirect if on list route (no hand number) and hands exist
      if (
        this._historyHandNumber === null &&
        hands.length > 0 &&
        this.path === `/history/${this._historyGameId}`
      ) {
        const latest = hands[hands.length - 1].hand_number;
        history.replaceState(
          {},
          "",
          `/history/${this._historyGameId}/${latest}`,
        );
        this.path = `/history/${this._historyGameId}/${latest}`;
      }
    }

    // Handle task errors
    if (this._historyListTask.status === TaskStatus.ERROR) {
      this.toast = {
        message: this._historyListTask.error.message,
        variant: "error",
      };
      history.replaceState({}, "", `/games/${this._historyGameId}`);
      this.path = `/games/${this._historyGameId}`;
    }

    if (this._historyHandTask.status === TaskStatus.ERROR) {
      this.toast = {
        message: this._historyHandTask.error.message,
        variant: "error",
      };
      history.replaceState({}, "", `/games/${this._historyGameId}`);
      this.path = `/games/${this._historyGameId}`;
    }
  }

  render() {
    const gameMatch = this.path.match(/^\/games\/([a-z0-9]+)$/);
    const historyMatch = this.path.match(
      /^\/history\/([a-z0-9]+)(?:\/(\d+))?$/,
    );
    const gameId = gameMatch?.[1] || historyMatch?.[1] || null;

    this._manageConnection(gameId);

    if (gameMatch) return this._renderGameView(gameMatch);
    if (historyMatch) return this._renderHistoryView(historyMatch);
    return html`${this.renderToast()}<phg-home></phg-home>`;
  }
}

customElements.define("phg-app", App);
