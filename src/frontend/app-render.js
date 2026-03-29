import { html } from "lit";
import { renderAuthStatus } from "./app-auth-status.js";
import { renderProfileSettingsModal } from "./app-profile-settings.js";
import { renderProfileSignInModal } from "./app-sign-in-modal.js";

/**
 * @param {any} app
 */
export function renderToast(app) {
  if (!app.toast) return "";
  return html`
    <phg-toast
      variant=${app.toast.variant || "info"}
      .duration=${app.toast.duration || 3000}
      .message=${app.toast.message}
      @dismiss=${app.dismissToast}
    ></phg-toast>
  `;
}

/**
 * @param {any} app
 * @param {{ kind: "cash"|"sitngo"|"mtt_table", tableId: string, tournamentId?: string }} liveRoute
 */
export function renderGameView(app, liveRoute) {
  const gameKind = liveRoute.kind === "mtt_table" ? "mtt" : liveRoute.kind;
  return html`${renderToast(app)}<phg-game
      .gameId=${liveRoute.tableId}
      .gameKind=${gameKind}
      .tournamentId=${"tournamentId" in liveRoute
        ? liveRoute.tournamentId
        : null}
      .tournamentFinishPosition=${app._mttView?.currentPlayer?.finishPosition ??
      null}
      .connectionStatus=${app.gameConnectionStatus}
      .game=${app.game}
      .socialAction=${app.socialAction}
      .user=${app.user}
    ></phg-game>`;
}

/**
 * @param {any} app
 * @param {{ kind: string, tableId: string, tournamentId?: string }} historyRoute
 */
export function renderHistoryView(app, historyRoute) {
  const listData = app._historyListTask.value;
  const handData = app._historyHandTask.value;

  return html`${renderToast(app)}<phg-history
      .gameId=${historyRoute.tableId}
      .gameKind=${historyRoute.kind}
      .tournamentId=${historyRoute.kind === "mtt_table"
        ? historyRoute.tournamentId
        : null}
      .handNumber=${app._historyHandNumber}
      .hand=${handData?.hand}
      .view=${handData?.view}
      .handList=${listData?.hands}
      .playerId=${listData?.playerId}
    ></phg-history>`;
}

/**
 * @param {any} app
 */
export function renderPlayerProfileView(app) {
  return html`<phg-player-profile
    .profile=${app._playerProfileTask.value}
    .user=${app.user}
  ></phg-player-profile>`;
}

/**
 */
export function renderHomeView() {
  return html`<phg-home></phg-home>`;
}

/**
 * @param {any} app
 */
export function renderMttLobbyView(app) {
  return html`<phg-mtt-lobby
    .tournamentId=${app._mttTournamentId}
    .tournament=${app._mttView}
    .user=${app.user}
    .loading=${app._mttLoading}
    .error=${app._mttError}
    .actionPending=${app._mttActionPending}
  ></phg-mtt-lobby>`;
}

/**
 */
export function renderReleaseNotesView() {
  return html`<phg-release-notes></phg-release-notes>`;
}

/**
 * @param {any} app
 * @param {import("lit").TemplateResult} content
 * @param {{ navigationRenderer?: ((shell: any) => import("lit").TemplateResult|string) }} [options]
 */
export function renderShellView(app, content, options = {}) {
  return html`${renderToast(app)}<phg-app-shell
      .user=${app.user}
      .path=${app.path}
      .navigationRenderer=${options.navigationRenderer ?? null}
      >${content}</phg-app-shell
    >${renderProfileSettingsModal(app)}${renderProfileSignInModal(app)}`;
}

/**
 * @param {any} app
 */
export function renderAuthStatusView(app) {
  return html`${renderToast(app)}${renderAuthStatus()}`;
}
