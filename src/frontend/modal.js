import * as COLORS from "./colors.js";
import { html, css, unsafeCSS, LitElement } from "lit";

class Modal extends LitElement {
  static get styles() {
    return css`
      :host {
        display: block;
      }

      .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 199;
      }

      .modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${unsafeCSS(COLORS.bgLight)};
        border: 4px solid ${unsafeCSS(COLORS.fgDark)};
        padding: 20px;
        z-index: 200;
        box-shadow: 8px 8px 0 ${unsafeCSS(COLORS.bgDark)};
        min-width: 280px;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }

      h3 {
        margin: 0;
        font-size: 0.7em;
        color: ${unsafeCSS(COLORS.fgWhite)};
        font-family: "Press Start 2P", monospace;
      }

      .close-btn {
        background: none;
        border: none;
        color: ${unsafeCSS(COLORS.fgDark)};
        font-size: 1.2em;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }

      .close-btn:hover {
        color: ${unsafeCSS(COLORS.fgWhite)};
      }
    `;
  }

  static get properties() {
    return {
      title: { type: String },
    };
  }

  constructor() {
    super();
    this.title = "";
  }

  close() {
    this.dispatchEvent(
      new CustomEvent("close", { bubbles: true, composed: true }),
    );
  }

  render() {
    return html`
      <div class="overlay" @click=${this.close}></div>
      <div class="modal">
        <div class="header">
          <h3>${this.title}</h3>
          <button class="close-btn" @click=${this.close} title="Close">
            ✕
          </button>
        </div>
        <slot></slot>
      </div>
    `;
  }
}

customElements.define("phg-modal", Modal);
