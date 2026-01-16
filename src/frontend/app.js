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
    };
  }

  constructor() {
    super();
    this.path = window.location.pathname;
    this.toast = null;
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
      const handNumber = historyMatch[2] ? parseInt(historyMatch[2], 10) : null;
      return html`${this.renderToast()}<phg-history
          .gameId=${historyMatch[1]}
          .handNumber=${handNumber}
        ></phg-history>`;
    }

    return html`${this.renderToast()}<phg-home></phg-home>`;
  }
}

customElements.define("phg-app", App);
