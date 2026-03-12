import { html } from "lit";
import { ICONS } from "./icons.js";
import { formatPlayerLabel } from "./player-label.js";
import "./navigation-drawer.js";

const iconReleaseNotes = html`<svg viewBox="0 0 24 24">
  <rect x="8" y="2" width="12" height="2" />
  <rect x="6" y="4" width="2" height="16" />
  <rect x="20" y="4" width="2" height="16" />
  <rect x="4" y="20" width="16" height="2" />
  <rect x="2" y="11" width="2" height="9" />
  <rect x="4" y="9" width="2" height="2" />
  <rect x="10" y="6" width="8" height="2" />
  <rect x="10" y="10" width="8" height="2" />
  <rect x="10" y="8" width="2" height="2" />
  <rect x="16" y="8" width="2" height="2" />
  <rect x="10" y="13" width="8" height="2" />
  <rect x="10" y="16" width="4" height="2" />
</svg>`;

/**
 * @param {object} params
 * @param {any} params.view
 * @param {boolean} params.playActive
 * @param {boolean} [params.releaseNotesActive]
 * @param {boolean} [params.accountActive]
 * @returns {import("lit").TemplateResult}
 */
export function renderAppNavigationDrawer({
  view,
  playActive,
  releaseNotesActive = false,
  accountActive = false,
}) {
  const isSignedIn = !!view.user?.email;
  const accountPath = view.user?.id ? `/players/${view.user.id}` : null;
  const accountLabel = formatPlayerLabel(
    view.user?.name,
    view.user?.id,
    "Sign in",
  );

  return html`
    <phg-navigation-drawer
      ?open=${view.drawerOpen}
      @drawer-toggle=${view.toggleDrawer}
    >
      <a
        slot="main"
        class=${playActive ? "drawer-item active" : "drawer-item"}
        href="/"
      >
        ${ICONS.play}
        <span>Play</span>
      </a>
      <a
        slot="main"
        class=${releaseNotesActive ? "drawer-item active" : "drawer-item"}
        href="/release-notes"
      >
        ${iconReleaseNotes}
        <span>Release Notes</span>
      </a>
      ${renderAccountEntry(
        isSignedIn,
        accountPath,
        accountLabel,
        accountActive,
        view.openSignIn,
      )}
      <button slot="footer" @click=${view.openSettings}>
        ${ICONS.settings}
        <span>Settings</span>
      </button>
    </phg-navigation-drawer>
  `;
}

function renderAccountEntry(
  isSignedIn,
  accountPath,
  accountLabel,
  accountActive,
  openSignIn,
) {
  if (isSignedIn && accountPath) {
    return html`<a
      slot="footer"
      class=${`drawer-item drawer-account${accountActive ? " active" : ""}`}
      href=${accountPath}
    >
      ${ICONS.signIn}
      <span>${accountLabel}</span>
    </a>`;
  }

  return html`<button
    slot="footer"
    class="drawer-item drawer-sign-in"
    @click=${openSignIn}
  >
    ${ICONS.signIn}
    <span>Sign in</span>
  </button>`;
}
