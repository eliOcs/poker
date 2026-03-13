import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import { renderAppNavigationDrawer } from "./app-navigation-drawer.js";
import "./navigation-drawer.js";

class AppShell extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        .layout {
          min-height: 100vh;
          display: flex;
          background: var(--color-bg-dark);
        }

        ::slotted(*) {
          flex: 1;
          min-width: 0;
        }
      `,
    ];
  }

  static get properties() {
    return {
      user: { type: Object },
      path: { type: String },
      drawerOpen: { state: true },
    };
  }

  constructor() {
    super();
    this.user = null;
    this.path = "/";
    this.drawerOpen = false;
    this._onMediaChange = (event) => {
      this.drawerOpen = event.matches;
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._mql = window.matchMedia("(min-width: 800px)");
    this._mql.addEventListener("change", this._onMediaChange);
    this.drawerOpen = this._mql.matches;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mql?.removeEventListener("change", this._onMediaChange);
  }

  toggleDrawer() {
    this.drawerOpen = !this.drawerOpen;
  }

  openSettings() {
    if (!this._mql?.matches) {
      this.drawerOpen = false;
    }
    this.dispatchEvent(
      new CustomEvent("open-settings", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  openSignIn() {
    if (!this._mql?.matches) {
      this.drawerOpen = false;
    }
    this.dispatchEvent(
      new CustomEvent("open-sign-in", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const playActive = this.path === "/";
    const releaseNotesActive = this.path === "/release-notes";
    const accountActive =
      !!this.user?.id && this.path === `/players/${this.user.id}`;

    return html`
      <div class="layout">
        ${renderAppNavigationDrawer({
          view: this,
          playActive,
          releaseNotesActive,
          accountActive,
        })}
        <slot></slot>
      </div>
    `;
  }
}

customElements.define("phg-app-shell", AppShell);
