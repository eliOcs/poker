import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import { ICONS as buttonIcons } from "./icons.js";

class Button extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          display: inline-block;
        }

        :host([full-width]) {
          display: block;
          width: 100%;
          height: 100%;
        }

        button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-md) var(--space-lg);
          min-height: 44px;
          font-family: inherit;
          font-size: var(--font-md);
          cursor: pointer;
          border: 3px solid var(--color-bg-dark);
          color: var(--color-fg-white);
          background-color: var(--color-secondary);
          box-shadow:
            3px 3px 0 var(--color-bg-dark),
            inset -2px -2px 0 rgba(0, 0, 0, 0.2),
            inset 2px 2px 0 rgba(255, 255, 255, 0.2);
        }

        .content {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--button-content-gap, var(--space-sm));
          max-width: 100%;
        }

        .content.no-icon {
          gap: 0;
        }

        .icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          flex-shrink: 0;
        }

        .icon svg {
          width: var(--button-icon-size, 1em);
          height: var(--button-icon-size, 1em);
          image-rendering: pixelated;
          display: block;
        }

        .label {
          display: block;
          max-width: 100%;
          text-align: center;
        }

        :host([full-width]) button {
          width: 100%;
          height: 100%;
        }

        button:hover {
          filter: brightness(1.1);
        }

        button:active {
          box-shadow:
            1px 1px 0 var(--color-bg-dark),
            inset 2px 2px 0 rgba(0, 0, 0, 0.2),
            inset -2px -2px 0 rgba(255, 255, 255, 0.2);
          transform: translate(2px, 2px);
        }

        /* Variants */
        :host([variant="primary"]) button {
          background-color: var(--color-primary);
        }

        :host([variant="success"]) button {
          background-color: var(--color-success);
        }

        :host([variant="danger"]) button {
          background-color: var(--color-error);
        }

        :host([variant="action"]) button {
          background-color: var(--color-accent);
        }

        :host([variant="secondary"]) button {
          background-color: var(--color-secondary);
        }

        :host([variant="muted"]) button {
          background-color: var(--color-bg-disabled);
        }

        :host([variant="warning"]) button {
          background-color: var(--color-warning);
        }

        /* Sizes */
        :host([size="compact"]) button {
          padding: var(--space-md) var(--space-lg);
          min-height: 38px;
        }

        :host([size="large"]) button {
          padding: calc(var(--space-lg) * 1.25) calc(var(--space-lg) * 2.5);
          min-height: 56px;
          font-size: var(--font-lg);
          border-width: var(--space-sm);
          box-shadow:
            4px 4px 0 var(--color-bg-dark),
            inset -2px -2px 0 rgba(0, 0, 0, 0.2),
            inset 2px 2px 0 rgba(255, 255, 255, 0.2);
        }

        :host([size="large"]) button:active {
          box-shadow:
            2px 2px 0 var(--color-bg-dark),
            inset 2px 2px 0 rgba(0, 0, 0, 0.2),
            inset -2px -2px 0 rgba(255, 255, 255, 0.2);
        }

        /* Disabled state */
        button:disabled {
          background-color: var(--color-bg-disabled);
          color: var(--color-fg-muted);
          cursor: not-allowed;
        }

        button:disabled:hover {
          filter: none;
        }
      `,
    ];
  }

  static get properties() {
    return {
      variant: { type: String, reflect: true },
      size: { type: String, reflect: true },
      fullWidth: { type: Boolean, attribute: "full-width", reflect: true },
      disabled: { type: Boolean, reflect: true },
      icon: { type: String, reflect: true },
    };
  }

  constructor() {
    super();
    this.variant = "secondary";
    this.size = "normal";
    this.fullWidth = false;
    this.disabled = false;
    this.icon = "";
  }

  render() {
    const iconTemplate = this.icon ? buttonIcons[this.icon] : null;
    const hasIcon = Boolean(iconTemplate);
    return html`
      <button ?disabled=${this.disabled}>
        <span class="content ${hasIcon ? "with-icon" : "no-icon"}">
          ${hasIcon ? html`<span class="icon">${iconTemplate}</span>` : null}
          <span class="label"><slot></slot></span>
        </span>
      </button>
    `;
  }
}

customElements.define("phg-button", Button);
