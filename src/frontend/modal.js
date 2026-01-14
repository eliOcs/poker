import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";

class Modal extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
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
          background: var(--color-bg-light);
          border: var(--space-sm) solid var(--color-fg-muted);
          padding: var(--space-lg);
          z-index: 200;
          box-shadow: var(--space-md) var(--space-md) 0 var(--color-bg-dark);
          min-width: 280px;
          max-width: 90vw;
          max-height: 90vh;
          overflow: auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-lg);
        }

        h3 {
          margin: 0;
          font-size: var(--font-md);
          color: var(--color-fg-white);
          font-family: inherit;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--color-fg-muted);
          font-size: var(--font-lg);
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .close-btn:hover {
          color: var(--color-fg-white);
        }
      `,
    ];
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
