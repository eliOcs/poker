import { html } from "lit";
import { ICONS } from "./icons.js";
import { formatPlayerLabel } from "./player-label.js";

/**
 * @param {any} profile
 */
export function renderPlayerProfileDrawer(profile) {
  const isSignedIn = !!profile.user?.email;
  const accountPath = profile.user?.id ? `/players/${profile.user.id}` : null;
  const accountLabel = formatPlayerLabel(
    profile.user?.name,
    profile.user?.id,
    "Sign in",
  );
  const isAccountActive = !!accountPath && profile.path === accountPath;

  return html`
    <phg-navigation-drawer
      ?open=${profile.drawerOpen}
      @drawer-toggle=${profile.toggleDrawer}
    >
      <a href="/">
        ${ICONS.play}
        <span>Play</span>
      </a>
      ${renderAccountEntry(
        isSignedIn,
        accountPath,
        accountLabel,
        isAccountActive,
        profile.openSignIn,
      )}
      <button @click=${profile.openSettings}>
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
  isAccountActive,
  openSignIn,
) {
  if (isSignedIn && accountPath) {
    return html`<a
      class=${`drawer-account${isAccountActive ? " active" : ""}`}
      href=${accountPath}
      target="_blank"
      rel="noopener noreferrer"
    >
      ${ICONS.signIn}
      <span>${accountLabel}</span>
    </a>`;
  }

  return html`<button class="drawer-sign-in" @click=${openSignIn}>
    ${ICONS.signIn}
    <span>Sign in</span>
  </button>`;
}
