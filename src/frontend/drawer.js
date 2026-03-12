import { html } from "lit";
import { ICONS } from "./icons.js";
import { formatPlayerLabel } from "./player-label.js";
import "./navigation-drawer.js";

const iconRankings = html`<svg viewBox="0 0 24 24">
  <rect x="6" y="3" width="12" height="2" />
  <rect x="6" y="3" width="2" height="12" />
  <rect x="16" y="3" width="2" height="12" />
  <rect x="16" y="5" width="6" height="2" />
  <rect x="2" y="5" width="6" height="2" />
  <rect x="2" y="7" width="2" height="4" />
  <rect x="4" y="11" width="2" height="2" />
  <rect x="18" y="11" width="2" height="2" />
  <rect x="20" y="7" width="2" height="4" />
  <rect x="8" y="15" width="8" height="2" />
  <rect x="11" y="17" width="2" height="4" />
  <rect x="9" y="19" width="6" height="2" />
</svg>`;

const iconHistory = html`<svg viewBox="0 0 24 24">
  <rect x="17" y="5" width="2" height="2" />
  <rect x="5" y="17" width="2" height="2" />
  <rect x="11" y="3" width="2" height="6" />
  <rect x="9" y="1" width="2" height="8" />
  <rect x="9" y="9" width="2" height="2" />
  <rect x="9" y="17" width="10" height="2" />
  <rect x="3" y="7" width="2" height="10" />
  <rect x="11" y="15" width="2" height="6" />
  <rect x="13" y="13" width="2" height="8" />
  <rect x="13" y="21" width="2" height="2" />
  <rect x="5" y="5" width="10" height="2" />
  <rect x="19" y="7" width="2" height="10" />
</svg>`;

const iconCopyLink = html`<svg viewBox="0 0 24 24">
  <rect x="4" y="6" width="7" height="2" />
  <rect x="4" y="16" width="7" height="2" />
  <rect x="2" y="8" width="2" height="8" />
  <rect x="13" y="6" width="7" height="2" />
  <rect x="13" y="16" width="7" height="2" />
  <rect x="20" y="8" width="2" height="8" />
  <rect x="7" y="11" width="10" height="2" />
</svg>`;

const iconShare = html`<svg viewBox="0 0 24 24">
  <path d="M11 5H5v2h6V5z" />
  <path d="M5 7H3v12h2V7z" />
  <path d="M17 19H5v2h12v-2z" />
  <path d="M19 13h-2v6h2v-6z" />
  <path d="M11 13H9v2h2v-2z" />
  <path d="M13 11h-2v2h2v-2z" />
  <path d="M15 9h-2v2h2V9z" />
  <path d="M17 7h-2v2h2V7z" />
  <path d="M19 5h-2v2h2V5z" />
  <path d="M21 3h-2v8h2V3z" />
  <path d="M21 3h-8v2h8V3z" />
</svg>`;

const iconSitOut = html`<svg viewBox="0 0 24 24">
  <rect x="8" y="11" width="12" height="2" />
  <rect x="16" y="9" width="2" height="2" />
  <rect x="14" y="7" width="2" height="10" />
  <rect x="16" y="13" width="2" height="2" />
  <rect x="4" y="2" width="16" height="2" />
  <rect x="4" y="20" width="16" height="2" />
  <rect x="4" y="4" width="2" height="16" />
  <rect x="18" y="4" width="2" height="3" />
  <rect x="18" y="17" width="2" height="3" />
</svg>`;

const canShare = typeof navigator.share === "function";

function renderSitOutButton(game) {
  const state = game._getSitOutState();
  if (state === "active") {
    return html`<button @click=${game.toggleSitOut}>
      ${iconSitOut} Sit Out
    </button>`;
  }
  if (state === "pendingSitOut") {
    return html`<button class="active" @click=${game.toggleSitOut}>
      ${iconSitOut} Sitting Out
    </button>`;
  }
  if (state === "sittingOut") {
    const canLeave = !game.game?.tournament || game.game?.handNumber === 0;
    if (!canLeave) return "";
    return html`<button @click=${game.leaveTable}>${iconSitOut} Leave</button>`;
  }
  return "";
}

export function renderDrawer(game) {
  const hasRecordedHands = game.hasRecordedHands();
  const accountLabel = formatPlayerLabel(
    game.user?.name,
    game.user?.id,
    "Sign in",
  );
  const isSignedIn = !!game.user?.email;

  return html`
    <phg-navigation-drawer
      ?open=${game._drawerOpen}
      @drawer-toggle=${game.toggleDrawer}
    >
      <button ?disabled=${!hasRecordedHands} @click=${game.openRanking}>
        ${iconRankings} Rankings
      </button>
      <button ?disabled=${!hasRecordedHands} @click=${game.openHistory}>
        ${iconHistory} History
      </button>
      ${renderSitOutButton(game)}
      <button @click=${game.copyGameLink}>
        ${iconCopyLink} ${game._copied ? "Copied!" : "Copy Link"}
      </button>
      ${canShare
        ? html`<button @click=${game.shareGameLink}>${iconShare} Share</button>`
        : ""}
      ${isSignedIn
        ? html`<a
            class="drawer-account"
            href=${`/players/${game.user.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            ${ICONS.signIn} ${accountLabel}
          </a>`
        : html`<button class="drawer-sign-in" @click=${game.openSignIn}>
            ${ICONS.signIn} Sign in
          </button>`}
      <button @click=${game.openSettings}>${ICONS.settings} Settings</button>
    </phg-navigation-drawer>
  `;
}
