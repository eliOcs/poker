import { html } from "lit";
import { formatCurrency, formatAmount } from "./currency.js";

/**
 * @typedef {import('../backend/poker/player-view.js').TournamentView} TournamentView
 * @typedef {object} InfoBarGame
 * @property {readonly unknown[]} seats
 * @property {Pick<import('../backend/poker/game.js').Blinds, 'small' | 'big'>} blinds
 * @property {string} [title]
 * @property {number} [handNumber]
 * @property {TournamentView} [tournament]
 */

const TABLE_SIZE_LABELS = { 2: "Heads-Up", 6: "6-Max", 9: "Full Ring" };

function formatBlinds(blinds, displayBigBlind) {
  return displayBigBlind
    ? `${blinds.small / displayBigBlind}/${formatAmount(blinds.big, displayBigBlind)}`
    : `${formatCurrency(blinds.small)}/${formatCurrency(blinds.big)}`;
}

/**
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * @param {string} gameKind
 * @param {InfoBarGame|undefined} game
 * @returns {string}
 */
function getTypeLabel(gameKind, game) {
  if (gameKind === "learn") return "Preflop";
  if (gameKind === "mtt") return "Tournament";
  if (gameKind === "sitngo" || game?.tournament) {
    return "Sit & Go";
  }
  return "Cash";
}

/**
 * @param {TournamentView|undefined} tournament
 * @returns {import("lit").TemplateResult<1>|undefined}
 */
function getTournamentTimerCell(tournament) {
  if (!tournament) {
    return;
  }

  const timerText = tournament.onBreak
    ? `Break ${formatTime(tournament.timeToNextLevel)}`
    : `Level ${tournament.level}: ${formatTime(tournament.timeToNextLevel)}`;
  return html`<span class="info-cell info-timer">${timerText}</span>`;
}

/**
 * @param {InfoBarGame|undefined} game - The game state object
 * @param {string} gameKind - The game kind (cash, sitngo, mtt, learn)
 * @param {() => void} [onOpenTournamentLevels]
 * @param {number} [displayBigBlind]
 * @returns {import("lit").TemplateResult|string}
 */
export function renderInfoBar(
  game,
  gameKind,
  onOpenTournamentLevels,
  displayBigBlind = 0,
) {
  if (!game) return "";
  const sizeLabel = TABLE_SIZE_LABELS[game.seats.length] ?? "";

  const cells = [
    html`<span class="info-cell info-type"
      >${getTypeLabel(gameKind, game)}</span
    >`,
    gameKind === "learn"
      ? html`<span class="info-cell info-scenario">${game.title}</span>`
      : undefined,
    html`<span class="info-cell info-size">${sizeLabel}</span>`,
  ].filter(Boolean);

  if (gameKind !== "learn") {
    cells.push(
      html`<span class="info-cell info-blinds"
        >${formatBlinds(game.blinds, displayBigBlind)}</span
      >`,
    );
  }

  if ((game.handNumber ?? 0) > 0) {
    cells.push(
      html`<span class="info-cell info-hand">#${game.handNumber}</span>`,
    );
  }

  const tournamentTimerCell = getTournamentTimerCell(game.tournament);
  if (tournamentTimerCell) {
    cells.push(tournamentTimerCell);
  }

  if (!tournamentTimerCell) {
    return html`<div id="info-bar">${cells}</div>`;
  }

  return html`<button
    type="button"
    id="info-bar"
    class="clickable"
    title="Show tournament levels"
    @click=${onOpenTournamentLevels}
  >
    ${cells}
  </button>`;
}
