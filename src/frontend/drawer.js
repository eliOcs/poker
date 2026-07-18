import { html } from "lit";
import { getHistoryPath } from "../shared/routes.js";
import { ICONS } from "./icons.js";
import { formatPlayerLabel } from "./player-label.js";
import {
  renderHistoryItem,
  renderMttNavigationDrawer,
} from "./mtt-navigation-drawer.js";
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

function handleDrawerAction(game, action) {
  return () => {
    game.closeMobileDrawer();
    void action();
  };
}

function renderSitOutButton(game) {
  const state = game._getSitOutState();
  if (state === "active") {
    return html`<button
      type="button"
      @click=${handleDrawerAction(game, () => game.toggleSitOut())}
    >
      ${iconSitOut} Sit Out
    </button>`;
  }
  if (state === "pendingSitOut") {
    return html`<button
      type="button"
      class="active"
      @click=${handleDrawerAction(game, () => game.toggleSitOut())}
    >
      ${iconSitOut} Sitting Out
    </button>`;
  }
  if (state === "sittingOut") {
    const canLeave = !game.game?.tournament || game.game?.handNumber === 0;
    if (!canLeave) return "";
    return html`<button
      type="button"
      @click=${handleDrawerAction(game, () => game.leaveTable())}
    >
      ${iconSitOut} Leave
    </button>`;
  }
  return "";
}

function renderMttDrawer(game) {
  const activeTables =
    game.mttTournament?.tables.filter((table) => !table.closed) ?? [];
  const hasRecordedHands = game.hasRecordedHands();
  const historyPath = getHistoryPath(game.gameId);
  return renderMttNavigationDrawer({
    open: game._drawerOpen,
    onToggle: () => game.toggleDrawer(),
    user: game.user,
    onOpenLobby: handleDrawerAction(game, () => game.openTournamentLobby()),
    tableItems: activeTables.map((table) => ({
      label: table.tableName,
      active: table.tableId === game.gameId,
      isCurrentPlayerTable:
        table.tableId === game.mttTournament?.currentPlayer?.tableId,
      onOpen: handleDrawerAction(game, () =>
        game.openTournamentTable(table.tableId),
      ),
    })),
    showHistory: true,
    historyPath: hasRecordedHands ? historyPath : undefined,
    onOpenLevels: handleDrawerAction(game, () => game.openTournamentLevels()),
    onCopyLink: handleDrawerAction(game, () => game.copyGameLink()),
    copied: game._copied,
    onShare: canShare
      ? handleDrawerAction(game, () => game.shareGameLink())
      : undefined,
    extraMainItems: [renderSitOutButton(game)],
    onOpenSettings: handleDrawerAction(game, () => game.openSettings()),
    onOpenSignIn: handleDrawerAction(game, () => game.openSignIn()),
    onOpenSignUp: handleDrawerAction(game, () => game.openSignUp()),
  });
}

function renderCashDrawer(game) {
  const hasRecordedHands = game.hasRecordedHands();
  const historyPath = getHistoryPath(game.gameId);
  const accountLabel = formatPlayerLabel(
    game.user?.name,
    game.user?.id,
    "Sign in",
  );
  const isSignedIn = !!game.user?.email;
  const mainItems = html`
    <button
      type="button"
      ?disabled=${!hasRecordedHands}
      @click=${handleDrawerAction(game, () => game.openRanking())}
    >
      ${iconRankings} Rankings
    </button>
    ${renderHistoryItem(hasRecordedHands ? historyPath : undefined)}
    ${game.game?.tournament
      ? html`<button
          type="button"
          @click=${handleDrawerAction(game, () => game.openTournamentLevels())}
        >
          ${ICONS.levels} Levels
        </button>`
      : ""}
    ${renderSitOutButton(game)}
    <button
      type="button"
      @click=${handleDrawerAction(game, () => game.copyGameLink())}
    >
      ${iconCopyLink} ${game._copied ? "Copied!" : "Copy Link"}
    </button>
    ${canShare
      ? html`<button
          type="button"
          @click=${handleDrawerAction(game, () => game.shareGameLink())}
        >
          ${iconShare} Share
        </button>`
      : ""}
  `;
  const footerItems = html`
    ${isSignedIn
      ? html`<a
          class="drawer-account"
          href=${`/players/${game.user.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          ${ICONS.signIn} ${accountLabel}
        </a>`
      : html`<button
            type="button"
            class="drawer-primary"
            @click=${handleDrawerAction(game, () => game.openSignUp())}
          >
            ${ICONS.signUp} Sign up</button
          ><button
            type="button"
            class="drawer-entry"
            @click=${handleDrawerAction(game, () => game.openSignIn())}
          >
            ${ICONS.signIn} Sign in
          </button>`}
    <button
      type="button"
      @click=${handleDrawerAction(game, () => game.openSettings())}
    >
      ${ICONS.settings} Settings
    </button>
  `;

  return html`<phg-navigation-drawer
    ?open=${game._drawerOpen}
    .mainItems=${mainItems}
    .footerItems=${footerItems}
    @drawer-toggle=${() => game.toggleDrawer()}
  ></phg-navigation-drawer>`;
}

export function renderDrawer(game) {
  if (game.gameKind === "mtt") {
    return renderMttDrawer(game);
  }
  return renderCashDrawer(game);
}
