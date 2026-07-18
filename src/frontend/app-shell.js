import { html, LitElement } from "lit";
import { renderAppNavigationDrawer } from "./app-navigation-drawer.js";
import "./navigation-drawer.js";

class AppShell extends LitElement {
  static get properties() {
    return {
      user: { type: Object },
      path: { type: String },
      content: { attribute: false },
      navigationRenderer: { attribute: false },
      drawerOpen: { state: true },
    };
  }

  constructor() {
    super();
    this.user = undefined;
    this.path = "/";
    this.content = "";
    this.navigationRenderer = undefined;
    this.drawerOpen = false;
    this._onMediaChange = (event) => {
      this.drawerOpen = event.matches;
    };
  }

  createRenderRoot() {
    return this;
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

  _closeMobileDrawer() {
    if (!this._mql?.matches) this.drawerOpen = false;
  }

  openSettings() {
    this._closeMobileDrawer();
    this.dispatchEvent(new CustomEvent("open-settings", { bubbles: true }));
  }

  openSignIn() {
    this._closeMobileDrawer();
    this.dispatchEvent(new CustomEvent("open-sign-in", { bubbles: true }));
  }

  openSignUp() {
    this._closeMobileDrawer();
    this.dispatchEvent(new CustomEvent("open-sign-up", { bubbles: true }));
  }

  render() {
    const playActive = this.path === "/";
    const tournamentsActive = this.path === "/mtt";
    const releaseNotesActive = this.path === "/release-notes";
    const accountActive =
      !!this.user?.id && this.path === `/players/${this.user.id}`;
    const navigation = this.navigationRenderer
      ? this.navigationRenderer(this)
      : renderAppNavigationDrawer({
          view: this,
          playActive,
          tournamentsActive,
          releaseNotesActive,
          accountActive,
        });

    return html`<div class="app-shell-layout">
      ${navigation}
      <main class="app-shell-content">${this.content}</main>
    </div>`;
  }
}

customElements.define("phg-app-shell", AppShell);
