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
 * @param {RegExpMatchArray} gameMatch
 */
export function renderGameView(app, gameMatch) {
  return html`${renderToast(app)}<phg-game
      .gameId=${gameMatch[1]}
      .game=${app.game}
      .socialAction=${app.socialAction}
      .user=${app.user}
    ></phg-game>`;
}

/**
 * @param {any} app
 * @param {RegExpMatchArray} historyMatch
 */
export function renderHistoryView(app, historyMatch) {
  const listData = app._historyListTask.value;
  const handData = app._historyHandTask.value;

  return html`${renderToast(app)}<phg-history
      .gameId=${historyMatch[1]}
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
 */
export function renderReleaseNotesView() {
  return html`<phg-release-notes></phg-release-notes>`;
}

/**
 * @param {any} app
 * @param {import("lit").TemplateResult} content
 */
export function renderShellView(app, content) {
  return html`${renderToast(app)}<phg-app-shell
      .user=${app.user}
      .path=${app.path}
      >${content}</phg-app-shell
    >${renderProfileSettingsModal(app)}${renderProfileSignInModal(app)}`;
}

/**
 * @param {any} app
 */
export function renderAuthStatusView(app) {
  return html`${renderToast(app)}${renderAuthStatus()}`;
}
