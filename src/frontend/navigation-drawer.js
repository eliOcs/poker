import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import { ICONS } from "./icons.js";

class NavigationDrawer extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 50;
          pointer-events: none;
        }

        @media (width >= 800px) {
          :host {
            position: relative;
            z-index: auto;
          }
        }

        #backdrop {
          display: none;
        }

        :host([open]) #backdrop {
          display: block;
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: auto;
        }

        @media (width >= 800px) {
          #backdrop {
            display: none !important;
          }
        }

        #toggle {
          position: absolute;
          top: var(--space-md);
          left: 0;
          background: var(--color-bg-dark);
          border: 2px solid var(--color-bg-light);
          border-left: none;
          color: var(--color-fg-medium);
          cursor: pointer;
          padding: var(--space-md);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0 4px 4px 0;
          transition: left 0.2s ease;
          pointer-events: auto;
        }

        :host([open]) #toggle {
          left: clamp(140px, 12vw, 200px);
          border-left: none;
        }

        @media (width >= 800px) {
          #toggle {
            display: none;
          }
        }

        #toggle:hover {
          color: var(--color-fg-white);
        }

        #toggle svg {
          width: 20px;
          height: 20px;
          fill: currentcolor;
        }

        #panel {
          width: clamp(140px, 12vw, 200px);
          height: 100%;
          background: var(--color-bg-dark);
          border-right: 2px solid var(--color-bg-light);
          display: flex;
          flex-direction: column;
          transform: translateX(-100%);
          transition: transform 0.2s ease;
          pointer-events: auto;
        }

        :host([open]) #panel {
          transform: translateX(0);
        }

        nav {
          display: flex;
          flex-direction: column;
          padding: var(--space-md);
          padding-top: var(--space-lg);
          gap: var(--space-sm);
        }

        .home-link {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: var(--space-sm) var(--space-md) var(--space-md);
          margin-bottom: var(--space-sm);
          border-bottom: 1px solid var(--color-bg-light);
          text-decoration: none;
        }

        .home-link:hover {
          background: var(--color-bg-light);
        }

        .home-logo {
          width: 100%;
          max-width: 140px;
          height: auto;
          image-rendering: pixelated;
        }

        ::slotted(.drawer-btn),
        ::slotted(.drawer-item) {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          width: 100%;
          padding: var(--space-md);
          border: 0;
          background: none;
          color: var(--color-fg-medium);
          font: inherit;
          font-size: var(--font-sm);
          text-align: left;
          cursor: pointer;
          white-space: nowrap;
        }

        ::slotted(.drawer-btn:hover),
        ::slotted(.drawer-item:hover) {
          color: var(--color-fg-white);
          background: var(--color-bg-light);
        }

        ::slotted(.drawer-btn.active),
        ::slotted(.drawer-item.active) {
          color: var(--color-primary);
        }

        ::slotted(.drawer-btn:disabled),
        ::slotted(.drawer-item:disabled) {
          color: var(--color-fg-muted);
          opacity: 0.5;
          cursor: default;
        }

        ::slotted(.drawer-btn:disabled:hover),
        ::slotted(.drawer-item:disabled:hover) {
          color: var(--color-fg-muted);
          background: none;
        }

        ::slotted(.drawer-btn svg),
        ::slotted(.drawer-item svg) {
          width: 20px;
          height: 20px;
          min-width: 20px;
          fill: currentcolor;
        }
      `,
    ];
  }

  static get properties() {
    return {
      open: { type: Boolean, reflect: true },
    };
  }

  constructor() {
    super();
    this.open = false;
  }

  toggle() {
    this.dispatchEvent(
      new CustomEvent("drawer-toggle", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <div id="backdrop" @click=${this.toggle}></div>
      <button id="toggle" @click=${this.toggle}>
        ${this.open ? ICONS.close : ICONS.menu}
      </button>
      <div id="panel">
        <nav>
          <a
            class="home-link"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Pluton Poker homepage in a new tab"
          >
            <img class="home-logo" src="/logo.webp" alt="Pluton Poker" />
          </a>
          <slot></slot>
        </nav>
      </div>
    `;
  }
}

customElements.define("phg-navigation-drawer", NavigationDrawer);
