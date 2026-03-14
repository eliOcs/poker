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

        #drawer-toggle {
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

        :host([open]) #drawer-toggle {
          left: clamp(180px, 16vw, 240px);
          border-left: none;
        }

        @media (width >= 800px) {
          #drawer-toggle {
            display: none;
          }
        }

        #drawer-toggle:hover {
          color: var(--color-fg-white);
        }

        #drawer-toggle svg {
          width: 20px;
          height: 20px;
          fill: currentcolor;
        }

        #drawer-nav {
          width: clamp(180px, 16vw, 240px);
          height: 100%;
          background: var(--color-bg-dark);
          border-right: 2px solid var(--color-bg-light);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform: translateX(-100%);
          transition: transform 0.2s ease;
          pointer-events: auto;
        }

        :host([open]) #drawer-nav {
          transform: translateX(0);
        }

        nav {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: var(--space-lg) 0 var(--space-md);
        }

        .section {
          display: flex;
          flex-direction: column;
          min-width: 0;
          box-sizing: border-box;
          padding-inline: var(--space-md);
          gap: var(--space-sm);
        }

        .section.main {
          flex: 1;
        }

        .section.footer {
          padding-top: var(--space-lg);
        }

        .home-link {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-inline: var(--space-md);
          padding: var(--space-md) var(--space-md) var(--space-lg);
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

        hr {
          width: 100%;
          margin: 0;
          border: 0;
          border-top: 1px solid var(--color-bg-light);
        }

        .section-divider {
          margin: 0 var(--space-md) var(--space-md);
        }

        .footer-divider {
          margin: var(--space-lg) var(--space-md) 0;
        }

        ::slotted(.drawer-entry),
        ::slotted(.drawer-btn),
        ::slotted(.drawer-item) {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          width: 100%;
          max-width: 100%;
          min-width: 0;
          align-self: stretch;
          box-sizing: border-box;
          padding: var(--space-md);
          border: 0;
          background: none;
          color: var(--color-fg-medium);
          font: inherit;
          font-size: var(--font-sm);
          text-align: left;
          cursor: pointer;
          white-space: nowrap;
          text-decoration: none;
          appearance: none;
        }

        ::slotted(.drawer-entry:hover),
        ::slotted(.drawer-btn:hover),
        ::slotted(.drawer-item:hover) {
          color: var(--color-fg-white);
          background: var(--color-bg-light);
        }

        ::slotted(a.drawer-entry:visited),
        ::slotted(a.drawer-item:visited) {
          color: var(--color-fg-medium);
        }

        ::slotted(.drawer-entry.active),
        ::slotted(.drawer-btn.active),
        ::slotted(.drawer-item.active) {
          color: var(--color-primary);
        }

        ::slotted(a.drawer-entry.active:visited),
        ::slotted(a.drawer-item.active:visited) {
          color: var(--color-primary);
        }

        ::slotted(.drawer-sign-in) {
          color: var(--color-primary);
        }

        ::slotted(.drawer-sign-in:hover) {
          color: var(--color-primary);
        }

        ::slotted(.drawer-entry:disabled),
        ::slotted(.drawer-btn:disabled),
        ::slotted(.drawer-item:disabled) {
          color: var(--color-fg-muted);
          opacity: 0.5;
          cursor: default;
        }

        ::slotted(.drawer-entry:disabled:hover),
        ::slotted(.drawer-btn:disabled:hover),
        ::slotted(.drawer-item:disabled:hover) {
          color: var(--color-fg-muted);
          background: none;
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

  firstUpdated() {
    this._syncSlottedItems();
  }

  toggle() {
    this.dispatchEvent(
      new CustomEvent("drawer-toggle", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  _syncSlottedItems() {
    const slots = Array.from(this.shadowRoot?.querySelectorAll("slot") ?? []);
    for (const slot of slots) {
      const items = slot.assignedElements({ flatten: true });
      for (const item of items) {
        if (!(item instanceof HTMLElement)) continue;
        if (item.matches("a, button")) {
          item.classList.add("drawer-entry");
        }

        for (const icon of Array.from(item.querySelectorAll("svg"))) {
          icon.style.width = "20px";
          icon.style.height = "20px";
          icon.style.minWidth = "20px";
          icon.style.fill = "currentColor";
        }
      }
    }
  }

  render() {
    return html`
      <div id="backdrop" @click=${this.toggle}></div>
      <button id="drawer-toggle" @click=${this.toggle}>
        ${this.open ? ICONS.close : ICONS.menu}
      </button>
      <div id="drawer-nav">
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
          <hr class="section-divider" />
          <div class="section main">
            <slot name="main" @slotchange=${this._syncSlottedItems}></slot>
          </div>
          <hr class="footer-divider" />
          <div class="section footer">
            <slot name="footer" @slotchange=${this._syncSlottedItems}></slot>
          </div>
        </nav>
      </div>
    `;
  }
}

customElements.define("phg-navigation-drawer", NavigationDrawer);
