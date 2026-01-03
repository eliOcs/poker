import * as COLORS from "./colors.js";
import { html, css, unsafeCSS, LitElement } from "lit";

class Button extends LitElement {
  static get styles() {
    return css`
      :host {
        display: inline-block;
      }

      :host([full-width]) {
        display: block;
        width: 100%;
      }

      button {
        padding: 8px 16px;
        font-family: "Press Start 2P", monospace;
        font-size: 0.6em;
        cursor: pointer;
        border: 3px solid ${unsafeCSS(COLORS.bgDark)};
        color: ${unsafeCSS(COLORS.fgWhite)};
        background-color: ${unsafeCSS(COLORS.purple)};
        box-shadow:
          3px 3px 0 ${unsafeCSS(COLORS.bgDark)},
          inset -2px -2px 0 rgba(0, 0, 0, 0.2),
          inset 2px 2px 0 rgba(255, 255, 255, 0.2);
      }

      :host([full-width]) button {
        width: 100%;
      }

      button:hover {
        filter: brightness(1.1);
      }

      button:active {
        box-shadow:
          1px 1px 0 ${unsafeCSS(COLORS.bgDark)},
          inset 2px 2px 0 rgba(0, 0, 0, 0.2),
          inset -2px -2px 0 rgba(255, 255, 255, 0.2);
        transform: translate(2px, 2px);
      }

      /* Variants */
      :host([variant="primary"]) button {
        background-color: ${unsafeCSS(COLORS.gold)};
      }

      :host([variant="success"]) button {
        background-color: ${unsafeCSS(COLORS.greenLight)};
      }

      :host([variant="danger"]) button {
        background-color: ${unsafeCSS(COLORS.red)};
      }

      :host([variant="action"]) button {
        background-color: ${unsafeCSS(COLORS.blue)};
      }

      :host([variant="secondary"]) button {
        background-color: ${unsafeCSS(COLORS.bgDisabled)};
      }

      /* Sizes */
      :host([size="large"]) button {
        padding: 20px 40px;
        font-size: 1em;
        border-width: 4px;
        box-shadow:
          4px 4px 0 ${unsafeCSS(COLORS.bgDark)},
          inset -2px -2px 0 rgba(0, 0, 0, 0.2),
          inset 2px 2px 0 rgba(255, 255, 255, 0.2);
      }

      :host([size="large"]) button:active {
        box-shadow:
          2px 2px 0 ${unsafeCSS(COLORS.bgDark)},
          inset 2px 2px 0 rgba(0, 0, 0, 0.2),
          inset -2px -2px 0 rgba(255, 255, 255, 0.2);
      }

      /* Disabled state */
      button:disabled {
        background-color: ${unsafeCSS(COLORS.bgDisabled)};
        color: ${unsafeCSS(COLORS.fgDark)};
        cursor: not-allowed;
      }

      button:disabled:hover {
        filter: none;
      }
    `;
  }

  static get properties() {
    return {
      variant: { type: String, reflect: true },
      size: { type: String, reflect: true },
      fullWidth: { type: Boolean, attribute: "full-width", reflect: true },
      disabled: { type: Boolean, reflect: true },
    };
  }

  render() {
    return html`
      <button ?disabled=${this.disabled}>
        <slot></slot>
      </button>
    `;
  }
}

customElements.define("phg-button", Button);
