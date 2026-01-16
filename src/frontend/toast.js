import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";

class Toast extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          position: fixed;
          top: var(--space-lg);
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          display: block;
        }

        .toast {
          padding: var(--space-md) var(--space-lg);
          font-size: var(--font-sm);
          color: var(--color-fg-white);
          border: 3px solid var(--color-bg-dark);
          box-shadow: var(--space-sm) var(--space-sm) 0 var(--color-bg-dark);
          max-width: 90vw;
          text-align: center;
        }

        /* Variants */
        :host([variant="error"]) .toast {
          background-color: var(--color-error);
        }

        :host([variant="success"]) .toast {
          background-color: var(--color-success);
        }

        :host([variant="warning"]) .toast {
          background-color: var(--color-warning);
        }

        :host([variant="info"]) .toast {
          background-color: var(--color-accent);
        }
      `,
    ];
  }

  static get properties() {
    return {
      variant: { type: String, reflect: true },
      duration: { type: Number },
      message: { type: String },
    };
  }

  constructor() {
    super();
    this.variant = "info";
    this.duration = 3000;
    this.message = "";
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.duration > 0) {
      this.dismissTimer = setTimeout(() => this.dismiss(), this.duration);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }
  }

  dismiss() {
    this.dispatchEvent(
      new CustomEvent("dismiss", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <div class="toast" @click=${this.dismiss}>
        <slot>${this.message}</slot>
      </div>
    `;
  }
}

customElements.define("phg-toast", Toast);
