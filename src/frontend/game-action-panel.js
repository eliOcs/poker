import { html } from "lit";
import { getMttPath } from "../shared/routes.js";

function registerTournament(host) {
  host.dispatchEvent(
    new CustomEvent(host.user?.email ? "mtt-action" : "navigate", {
      detail: host.user?.email
        ? { action: "register" }
        : {
            path: `${getMttPath(host.tournamentId)}?action=register`,
            allowMttLobby: true,
          },
      bubbles: true,
    }),
  );
}

/**
 * @param {object} game - The game state object
 * @param {number} seatIndex
 * @returns {boolean}
 */
function isInHand(game, seatIndex) {
  if (seatIndex === -1) return false;
  const seat = game.seats[seatIndex];
  if (!seat || seat.empty) return false;
  if (seat.folded || seat.allIn || seat.sittingOut) return false;
  return ["preflop", "flop", "turn", "river"].includes(game.hand?.phase);
}

/**
 * @param {object} game - The game state object
 * @param {number} seatIndex
 * @returns {object}
 */
function getPreActionProps(game, seatIndex) {
  const seat = seatIndex !== -1 ? game.seats[seatIndex] : {};
  const hand = game.hand ?? {};
  return {
    phase: hand.phase,
    preAction: seat.preAction,
    currentBet: hand.currentBet ?? 0,
    myBet: seat.bet ?? 0,
    myStack: seat.stack ?? 0,
    isActing: hand.actingSeat === seatIndex,
    inHand: isInHand(game, seatIndex),
  };
}

/**
 * @param {object} host - The Game component instance
 * @param {Array} actions
 * @param {number} seatIndex
 * @param {boolean} canSit
 * @param {number|undefined} bustedPosition
 * @param {boolean} isWinner
 * @returns {import("lit").TemplateResult}
 */
function renderTableActionPanel(
  host,
  actions,
  seatIndex,
  canSit,
  bustedPosition,
  isWinner,
) {
  const pre = getPreActionProps(host.game, seatIndex);
  return html`<phg-action-panel
    .actions=${host.connectionStatus === "connected" ? actions : []}
    .seatIndex=${seatIndex}
    .smallBlind=${host.game.blinds?.small ?? 1}
    .bigBlind=${host.game.blinds?.big ?? 1}
    .totalPot=${host.game.hand?.totalPot ?? 0}
    .phase=${pre.phase}
    .seatedCount=${host.game.seats.filter((s) => !s.empty).length}
    .canSit=${canSit}
    .buyIn=${host.game.tournament?.buyIn ?? 0}
    .bustedPosition=${bustedPosition}
    .isWinner=${isWinner}
    .preAction=${pre.preAction}
    .currentBet=${pre.currentBet}
    .myBet=${pre.myBet}
    .myStack=${pre.myStack}
    .isActing=${pre.isActing}
    .inHand=${pre.inHand}
    .connectionStatus=${host.connectionStatus}
    .actionPending=${host.actionPending}
    @game-action=${host.handleGameAction}
    @open-emote-picker=${host.openEmotePicker}
    @open-chat=${host.openChat}
  ></phg-action-panel>`;
}

function renderRegistration(host) {
  if (!host.mttTournament?.actions?.canRegister) return html``;
  return html`<div class="waiting-panel">
    <button
      type="button"
      class="button button--primary"
      ?disabled=${host.actionPending}
      @click=${() => {
        registerTournament(host);
      }}
    >
      ${host.mttTournament.status === "running" ? "Late Register" : "Register"}
    </button>
  </div>`;
}

/** @type {typeof renderTableActionPanel} */
export function renderActionPanel(
  host,
  actions,
  seatIndex,
  canSit,
  bustedPosition,
  isWinner,
) {
  if (
    host.gameKind === "mtt" &&
    seatIndex === -1 &&
    !bustedPosition &&
    !isWinner &&
    host.connectionStatus === "connected"
  ) {
    return renderRegistration(host);
  }
  return renderTableActionPanel(
    host,
    actions,
    seatIndex,
    canSit,
    bustedPosition,
    isWinner,
  );
}
