import { html } from "lit";
import { ICONS } from "./icons.js";
import { formatPlayerLabel } from "./player-label.js";
import "./navigation-drawer.js";

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

const iconLobby = html`<svg viewBox="0 0 24 24">
  <path
    d="M10 14v6h4v-6h-4Zm-4-4H4V8h2v2Zm14 0h-2V8h2v2ZM8 8H6V6h2v2Zm10 0h-2V6h2v2Zm-8-2H8V4h2v2Zm6 0h-2V4h2v2Zm-2-2h-4V2h4v2Zm2 16h4V10h2v12H2V10h2v10h4v-8h8v8Z"
  />
</svg>`;

const iconTable = html`<svg viewBox="0 0 24 24">
  <rect x="5" y="6" width="14" height="2" />
  <rect x="3" y="8" width="2" height="8" />
  <rect x="19" y="8" width="2" height="8" />
  <rect x="7" y="10" width="10" height="4" />
  <rect x="5" y="16" width="14" height="2" />
</svg>`;

function drawerItemClass(active = false) {
  return active ? "drawer-item active" : "drawer-item";
}

/**
 * @param {(() => any)|null|undefined} fn
 * @returns {() => void}
 */
function handleAction(fn) {
  return () => {
    if (!fn) return;
    void fn();
  };
}

/**
 * @param {object} params
 * @param {boolean} params.open
 * @param {() => void} params.onToggle
 * @param {any} params.user
 * @param {boolean} [params.lobbyActive]
 * @param {(() => void)|null} [params.onOpenLobby]
 * @param {Array<{ label: string, active?: boolean, isCurrentPlayerTable?: boolean, onOpen: () => void }>} [params.tableItems]
 * @param {(() => void)|null} [params.onOpenHistory]
 * @param {boolean} [params.historyDisabled]
 * @param {(() => void)|null} [params.onCopyLink]
 * @param {boolean} [params.copied]
 * @param {(() => void)|null} [params.onShare]
 * @param {Array<import("lit").TemplateResult|string>} [params.extraMainItems]
 * @param {() => void} params.onOpenSettings
 * @param {() => void} params.onOpenSignIn
 * @returns {import("lit").TemplateResult}
 */
// eslint-disable-next-line complexity
export function renderMttNavigationDrawer({
  open,
  onToggle,
  user,
  lobbyActive = false,
  onOpenLobby = null,
  tableItems = [],
  onOpenHistory = null,
  historyDisabled = false,
  onCopyLink = null,
  copied = false,
  onShare = null,
  extraMainItems = [],
  onOpenSettings,
  onOpenSignIn,
}) {
  const accountLabel = formatPlayerLabel(user?.name, user?.id, "Sign in");
  const isSignedIn = !!user?.email;

  return html`
    <phg-navigation-drawer ?open=${open} @drawer-toggle=${onToggle}>
      <button
        slot="main"
        class=${drawerItemClass(lobbyActive)}
        ?disabled=${!onOpenLobby}
        @click=${handleAction(onOpenLobby)}
      >
        ${iconLobby}
        <span>Lobby</span>
      </button>
      ${tableItems.map(
        (table) =>
          html`<button
            slot="main"
            class=${drawerItemClass(table.active)}
            @click=${handleAction(table.onOpen)}
          >
            ${iconTable}
            <span>${table.label}</span>
            ${table.isCurrentPlayerTable
              ? html`<span
                  aria-hidden="true"
                  style="width: 8px; height: 8px; border-radius: 999px; background: var(--color-secondary); flex: none;"
                ></span>`
              : ""}
          </button>`,
      )}
      <button
        slot="main"
        ?disabled=${historyDisabled || !onOpenHistory}
        @click=${handleAction(onOpenHistory)}
      >
        ${iconHistory}
        <span>History</span>
      </button>
      ${extraMainItems}
      <button
        slot="main"
        ?disabled=${!onCopyLink}
        @click=${handleAction(onCopyLink)}
      >
        ${iconCopyLink}
        <span>${copied ? "Copied!" : "Copy Link"}</span>
      </button>
      ${onShare
        ? html`<button slot="main" @click=${handleAction(onShare)}>
            ${iconShare}
            <span>Share</span>
          </button>`
        : ""}
      ${isSignedIn
        ? html`<a
            slot="footer"
            class="drawer-account"
            href=${`/players/${user.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            ${ICONS.signIn}
            <span>${accountLabel}</span>
          </a>`
        : html`<button
            slot="footer"
            class="drawer-sign-in"
            @click=${handleAction(onOpenSignIn)}
          >
            ${ICONS.signIn}
            <span>Sign in</span>
          </button>`}
      <button slot="footer" @click=${handleAction(onOpenSettings)}>
        ${ICONS.settings}
        <span>Settings</span>
      </button>
    </phg-navigation-drawer>
  `;
}
