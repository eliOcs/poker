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
      // History state
      historyHand: { type: Object },
      historyHandList: { type: Array },
      historyLoading: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.path = window.location.pathname;
    this.toast = null;
    // History state
    this.historyHand = null;
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
        // Update URL to include hand number
        history.replaceState({}, "", `/history/${gameId}/${targetHand}`);
      }

      // Fetch specific hand data
      if (targetHand) {
        const handRes = await fetch(`/api/history/${gameId}/${targetHand}`);
        if (!handRes.ok) {
          throw new Error("Hand not found");
        }
        const handData = await handRes.json();
        this.historyHand = handData.hand;
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
    } catch (err) {
      // Redirect to game and show error toast
      this.toast = { message: err.message, variant: "error" };
      history.replaceState({}, "", `/games/${this._historyGameId}`);
      this.path = `/games/${this._historyGameId}`;
    }
  }

  render() {
    const gameMatch = this.path.match(/^\/games\/([a-z0-9]+)$/);
    if (gameMatch) {
      return html`${this.renderToast()}<phg-game
          .gameId=${gameMatch[1]}
        ></phg-game>`;
    }

    const historyMatch = this.path.match(
      /^\/history\/([a-z0-9]+)(?:\/(\d+))?$/,
    );
    if (historyMatch) {
      const gameId = historyMatch[1];
      const handNumber = historyMatch[2] ? parseInt(historyMatch[2], 10) : null;

      // Trigger data fetch if needed
      if (
        gameId !== this._historyGameId ||
        handNumber !== this._historyHandNumber
      ) {
        this.fetchHistoryData(gameId, handNumber);
      }

      return html`${this.renderToast()}<phg-history
          .gameId=${gameId}
          .handNumber=${this._historyHandNumber}
          .hand=${this.historyHand}
          .handList=${this.historyHandList}
          .loading=${this.historyLoading}
        ></phg-history>`;
    }

    return html`${this.renderToast()}<phg-home></phg-home>`;
  }
}

customElements.define("phg-app", App);
