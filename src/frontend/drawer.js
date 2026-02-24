import { html } from "lit";

const iconHamburger = html`<svg viewBox="0 0 16 16">
  <path d="M1 2h14v2H1zm0 5h14v2H1zm0 5h14v2H1z" />
</svg>`;

const iconClose = html`<svg viewBox="0 0 16 16">
  <path d="M11 3h2v2h-2zM9 5h2v2H9zM7 7h2v2H7zM9 9h2v2H9zm2 2h2v2h-2z" />
</svg>`;

const iconSettings = html`<svg viewBox="0 0 24 24">
  <rect x="9" width="6" height="2" />
  <rect x="9" y="22" width="6" height="2" />
  <rect y="9" width="2" height="6" />
  <rect x="22" y="9" width="2" height="6" />
  <rect x="9" y="2" width="2" height="4" />
  <rect x="13" y="2" width="2" height="4" />
  <rect x="9" y="18" width="2" height="4" />
  <rect x="13" y="18" width="2" height="4" />
  <rect y="9" width="4" height="2" />
  <rect y="13" width="4" height="2" />
  <rect x="20" y="9" width="4" height="2" />
  <rect x="20" y="13" width="4" height="2" />
  <rect x="7" y="4" width="2" height="2" />
  <rect x="15" y="4" width="2" height="2" />
  <rect x="7" y="18" width="2" height="2" />
  <rect x="15" y="18" width="2" height="2" />
  <rect x="2" y="2" width="5" height="2" />
  <rect x="17" y="2" width="5" height="2" />
  <rect x="2" y="20" width="5" height="2" />
  <rect x="17" y="20" width="5" height="2" />
  <rect x="2" y="2" width="2" height="5" />
  <rect x="20" y="2" width="2" height="5" />
  <rect x="2" y="17" width="2" height="5" />
  <rect x="20" y="17" width="2" height="5" />
  <rect x="4" y="7" width="2" height="2" />
  <rect x="18" y="7" width="2" height="2" />
  <rect x="4" y="15" width="2" height="2" />
  <rect x="18" y="15" width="2" height="2" />
  <rect x="10" y="8" width="4" height="2" />
  <rect x="10" y="14" width="4" height="2" />
  <rect x="8" y="10" width="2" height="4" />
  <rect x="14" y="10" width="2" height="4" />
</svg>`;

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

const canShare = typeof navigator.share === "function";

export function renderDrawer(game) {
  return html`
    <div id="drawer" class=${game._drawerOpen ? "open" : ""}>
      <button id="drawer-toggle" @click=${game.toggleDrawer}>
        ${game._drawerOpen ? iconClose : iconHamburger}
      </button>
      <div id="drawer-panel">
        <nav id="drawer-nav">
          <button class="drawer-btn" @click=${game.openSettings}>
            ${iconSettings} Settings
          </button>
          <button class="drawer-btn" @click=${game.openRanking}>
            ${iconRankings} Rankings
          </button>
          <button class="drawer-btn" @click=${game.openHistory}>
            ${iconHistory} History
          </button>
          <button class="drawer-btn" @click=${game.copyGameLink}>
            ${iconCopyLink} ${game._copied ? "Copied!" : "Copy Link"}
          </button>
          ${canShare
            ? html`<button class="drawer-btn" @click=${game.shareGameLink}>
                ${iconShare} Share
              </button>`
            : ""}
        </nav>
      </div>
    </div>
  `;
}
