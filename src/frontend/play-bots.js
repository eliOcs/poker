import { html, LitElement } from "lit";
import { getTablePath } from "../shared/routes.js";
import { dispatchNavigate } from "./dispatch-navigate.js";

/** Opens a new bot table and moves to it, or says why it cannot. */
class PlayBots extends LitElement {
  static properties = {
    error: { state: true },
  };

  constructor() {
    super();
    this.error = "";
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    void this.openTable();
  }

  async openTable() {
    this.error = "";
    try {
      const response = await fetch("/api/learn/bots", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!this.isConnected) return;
      dispatchNavigate(this, getTablePath("bots", data.id), { replace: true });
    } catch (error) {
      this.error =
        error instanceof Error && error.message
          ? `${error.message}. Please try again later.`
          : "Could not open a bot table. Please try again later.";
    }
  }

  render() {
    return html`<main class="main">
      <article class="static-article">
        <h1>Play vs bots</h1>
        ${
          this.error
            ? html`<p role="alert">${this.error}</p>
                <button class="button" @click=${() => this.openTable()}>
                  Try again
                </button>`
            : html`<p role="status">Dealing you in…</p>`
        }
      </article>
    </main>`;
  }
}

customElements.define("phg-play-bots", PlayBots);
