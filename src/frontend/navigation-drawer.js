import { html, LitElement } from "lit";
import { ICONS } from "./icons.js";

class NavigationDrawer extends LitElement {
  static get properties() {
    return {
      open: { type: Boolean, reflect: true },
      mainItems: { attribute: false },
      footerItems: { attribute: false },
    };
  }

  constructor() {
    super();
    this.open = false;
    this.mainItems = [];
    this.footerItems = [];
  }

  createRenderRoot() {
    return this;
  }

  toggle() {
    this.dispatchEvent(new CustomEvent("drawer-toggle", { bubbles: true }));
  }

  render() {
    return html`
      <div class="drawer-backdrop" @click=${this.toggle}></div>
      <button type="button" class="drawer-toggle" @click=${this.toggle}>
        ${this.open ? ICONS.close : ICONS.menu}
      </button>
      <div class="drawer-panel">
        <nav>
          <a
            class="drawer-home-link"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Pluton Poker homepage in a new tab"
          >
            <img class="drawer-home-logo" src="/logo.webp" alt="Pluton Poker" />
          </a>
          <hr class="drawer-section-divider" />
          <div class="drawer-section drawer-main">${this.mainItems}</div>
          <hr class="drawer-footer-divider" />
          <div class="drawer-section drawer-footer">${this.footerItems}</div>
        </nav>
      </div>
    `;
  }
}

customElements.define("phg-navigation-drawer", NavigationDrawer);
