import { html } from "lit";
import { renderProfileSettingsModal } from "./app-profile-settings.js";
import {
  renderProfileSignInModal,
  renderProfileSignUpModal,
} from "./app-sign-in-modal.js";
import { DEFAULT_AVATAR } from "./avatar-maker-data.js";
import { openAppModal, closeAppModal } from "./app-navigation.js";
import { isOwnTurn } from "./app-websocket.js";
import { dismissToast } from "./app-toasts.js";

/**
 * Pages away from the table keep its connection, so a player there sees when
 * it is their turn until they act or the turn passes. That toast follows the
 * game state, so it cannot be dismissed and does not expire.
 * @param {any} app
 * @param {boolean} awayFromTable
 */
export function renderToastStack(app, awayFromTable) {
  /** @type {import('./toasts.js').Toast[]} */
  const turnToasts =
    awayFromTable && app.game && isOwnTurn(app.game)
      ? [
          {
            message: "Your turn to act",
            variant: "warning",
            action: { label: "Back to table", href: app._activeGamePath },
          },
        ]
      : [];
  return html`<phg-toasts
    .toasts=${[...turnToasts, ...app.toasts]}
    @dismiss=${(/** @type {CustomEvent} */ event) => {
      dismissToast(app, event.detail);
    }}
  ></phg-toasts>`;
}

/**
 * @param {any} app
 * @param {{ kind: "cash"|"sitngo"|"bots"|"mtt_table", tableId: string, tournamentId?: string }} liveRoute
 */
export function renderGameView(app, liveRoute) {
  const gameKind = liveRoute.kind === "mtt_table" ? "mtt" : liveRoute.kind;
  return html`<phg-game
      .gameId=${liveRoute.tableId}
      .gameKind=${gameKind}
      .tournamentId=${
        "tournamentId" in liveRoute ? liveRoute.tournamentId : undefined
      }
      .mttTournament=${
        liveRoute.kind === "mtt_table" ? app._mttView : undefined
      }
      .tournamentFinishPosition=${
        app._mttView?.currentPlayer?.finishPosition ?? undefined
      }
      .connectionStatus=${app.gameConnectionStatus}
      .actionPending=${
        !!app.gameActionPending ||
        (liveRoute.kind === "mtt_table" && app._mttActionPending)
      }
      .game=${app.game}
      .socialAction=${app.socialAction}
      .user=${app.user}
    ></phg-game
    >${renderProfileSettingsModal(app)}${renderProfileSignInModal(
      app,
    )}${renderProfileSignUpModal(app)}`;
}

/**
 * @param {any} app
 * @param {{ tableId: string }} historyRoute
 */
export function renderHistoryView(app, historyRoute) {
  const listData = app._historyListTask.value;
  const handData = app._historyHandTask.value;

  return html`<phg-history
    .gameId=${historyRoute.tableId}
    .handNumber=${app._historyHandNumber}
    .hand=${handData?.hand}
    .view=${handData?.view}
    .replay=${handData?.replay}
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
export function renderAboutView() {
  return html`<phg-about></phg-about>`;
}

/**
 * @param {any} app
 */
export function renderTournamentsView(app) {
  return html`<phg-tournaments .user=${app.user}></phg-tournaments>`;
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
 */
export function renderAvatarMakerView(app) {
  return html`<phg-avatar-maker
    .avatar=${app._settingsAvatar ?? DEFAULT_AVATAR}
    @avatar-cancel=${app.closeAvatarMaker}
    @avatar-done=${(event) => app.applyAvatarDraft(event.detail.avatar)}
  ></phg-avatar-maker>`;
}

/**
 * @param {any} app
 * @param {import("lit").TemplateResult} content
 * @param {{ navigationRenderer?: ((shell: any) => import("lit").TemplateResult|string) }} [options]
 */
export function renderShellView(app, content, options = {}) {
  return html`<phg-app-shell
      .user=${app.user}
      .path=${app.path}
      .navigationRenderer=${options.navigationRenderer ?? undefined}
      .content=${content}
    ></phg-app-shell
    >${renderProfileSettingsModal(app)}${renderProfileSignInModal(
      app,
    )}${renderProfileSignUpModal(app)}`;
}

/**
 * @param {any} app
 */
export function renderShellPageView(app, page) {
  const pageViews = {
    about: () => renderAboutView(),
    avatar: () => renderAvatarMakerView(app),
    home: () => renderHomeView(),
    learn: () => html`<phg-learn-modes></phg-learn-modes>`,
    learn_preflop: () =>
      html`<phg-learn
        .user=${app.user}
        .rangeOpen=${app._modal === "learn-details"}
        @seat-settings=${() => app.openProfileSettings()}
        @open-details=${() => {
          openAppModal(app, "learn-details");
        }}
        @close-details=${() => {
          closeAppModal(app);
        }}
      ></phg-learn>`,
    mtt_lobby: () => renderMttLobbyView(app),
    play_bots: () => html`<phg-play-bots></phg-play-bots>`,
    player_profile: () => renderPlayerProfileView(app),
    release_notes: () => renderReleaseNotesView(),
    tournaments: () => renderTournamentsView(app),
  };
  const content = (pageViews[page] ?? pageViews.home)();
  return renderShellView(app, content, {
    navigationRenderer: ["avatar", "mtt_lobby"].includes(page)
      ? () => ""
      : undefined,
  });
}
