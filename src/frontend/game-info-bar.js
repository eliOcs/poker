import { html } from "lit";
import { formatCurrency } from "./styles.js";

const TABLE_SIZE_LABELS = { 2: "Heads-Up", 6: "6-Max", 9: "Full Ring" };

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
 * @param {object|null} game
 * @returns {string}
 */
function getTypeLabel(gameKind, game) {
  if (gameKind === "mtt") return "Tournament";
  if (gameKind === "sitngo" || game?.tournament) {
    return "Sit & Go";
  }
  return "Cash";
}

/**
 * @param {object|null} tournament
 * @returns {import("lit").TemplateResult<1>|null}
 */
function getTournamentTimerCell(tournament) {
  if (!tournament || tournament.timeToNextLevel == null) {
    return null;
  }

  const timerText = tournament.onBreak
    ? `Break ${formatTime(tournament.timeToNextLevel)}`
    : `Level ${tournament.level}: ${formatTime(tournament.timeToNextLevel)}`;
  return html`<span class="info-cell info-timer">${timerText}</span>`;
}

/**
 * @param {object} game - The game state object
 * @param {string} gameKind - The game kind (cash, sitngo, mtt)
 * @returns {import("lit").TemplateResult|string}
 */
export function renderInfoBar(game, gameKind) {
  if (!game) return "";
  const sizeLabel = TABLE_SIZE_LABELS[game.seats.length] || "";

  const cells = [
    html`<span class="info-cell info-type"
      >${getTypeLabel(gameKind, game)}</span
    >`,
    html`<span class="info-cell info-size">${sizeLabel}</span>`,
  ].filter(Boolean);

  if (game.blinds) {
    cells.push(
      html`<span class="info-cell info-blinds"
        >${formatCurrency(game.blinds.small)}/${formatCurrency(
          game.blinds.big,
        )}</span
      >`,
    );
  }

  if (game.handNumber > 0) {
    cells.push(
      html`<span class="info-cell info-hand">#${game.handNumber}</span>`,
    );
  }

  const tournamentTimerCell = getTournamentTimerCell(game.tournament);
  if (tournamentTimerCell) {
    cells.push(tournamentTimerCell);
  }

  return html`<div id="info-bar">${cells}</div>`;
}
