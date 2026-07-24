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

const iconAbout = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  fill="currentColor"
  viewBox="0 0 24 24"
>
  <path
    d="M18 22H6V20H18V22ZM6 20H4V18H6V20ZM20 20H18V18H20V20ZM4 18H2V6H4V18ZM22 18H20V6H22V18ZM13 17H11V11H13V17ZM13 9H11V7H13V9ZM6 6H4V4H6V6ZM20 6H18V4H20V6ZM18 4H6V2H18V4Z"
  ></path>
</svg>`;

/**
 * @param {boolean} active
 */
function drawerItemClass(active) {
  return active ? "drawer-item active" : "drawer-item";
}

export function renderAppNavigationDrawer({
  view,
  playActive,
  aboutActive = false,
  tournamentsActive = false,
  releaseNotesActive = false,
  accountActive = false,
}) {
  const isSignedIn = !!view.user?.email;
  const accountPath = view.user?.id ? `/players/${view.user.id}` : undefined;
  const accountLabel = formatPlayerLabel(
    view.user?.name,
    view.user?.id,
    "Sign in",
  );
  const mainItems = html`
    <a class=${drawerItemClass(playActive)} href="/">
      ${ICONS.play}
      <span>Quick play</span>
    </a>
    <a class=${drawerItemClass(tournamentsActive)} href="/mtt">
      ${ICONS.tournament}
      <span>Tournaments</span>
    </a>
    <a class=${drawerItemClass(releaseNotesActive)} href="/release-notes">
      ${iconReleaseNotes}
      <span>Release Notes</span>
    </a>
    <a class=${drawerItemClass(aboutActive)} href="/about">
      ${iconAbout}
      <span>About</span>
    </a>
  `;
  const footerItems = html`
    ${renderAccountEntry(
      isSignedIn,
      accountPath,
      accountLabel,
      accountActive,
      view,
    )}
    <button type="button" @click=${() => view.openSettings()}>
      ${ICONS.settings}
      <span>Settings</span>
    </button>
  `;

  return html`<phg-navigation-drawer
    ?open=${view.drawerOpen}
    .mainItems=${mainItems}
    .footerItems=${footerItems}
    @drawer-toggle=${() => view.toggleDrawer()}
  ></phg-navigation-drawer>`;
}

function renderAccountEntry(
  isSignedIn,
  accountPath,
  accountLabel,
  accountActive,
  view,
) {
  if (isSignedIn && accountPath) {
    return html`<a
      class=${`drawer-item drawer-account${accountActive ? " active" : ""}`}
      href=${accountPath}
    >
      ${ICONS.signIn}
      <span>${accountLabel}</span>
    </a>`;
  }

  return html`<button
      type="button"
      class="drawer-item drawer-primary"
      @click=${() => view.openSignUp()}
    >
      ${ICONS.signUp}
      <span>Sign up</span></button
    ><button
      type="button"
      class="drawer-item"
      @click=${() => view.openSignIn()}
    >
      ${ICONS.signIn}
      <span>Sign in</span>
    </button>`;
}
