import { html, LitElement } from "lit";
import { formatCurrency } from "./currency.js";
import { formatPlayerLabel } from "./player-label.js";
import { getHistoryPath, getMttPath } from "../shared/routes.js";

class PlayerProfile extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      profile: { type: Object },
      user: { type: Object },
    };
  }

  constructor() {
    super();
    this.profile = undefined;
    this.user = undefined;
  }

  navigateToGame(game) {
    const gameType = normalizeGameType(game.gameType);
    const tournamentId = game.tournamentId ?? undefined;

    if (gameType === "mtt" && tournamentId) {
      this.dispatchEvent(
        new CustomEvent("navigate", {
          detail: { path: getMttPath(tournamentId) },
          bubbles: true,
          composed: true,
        }),
      );
      return;
    }

    const tableId = game.tableId ?? game.lastTableId ?? game.gameId;
    if (!tableId) return;

    this.dispatchEvent(
      new CustomEvent("navigate", {
        detail: {
          path: getHistoryPath(tableId, game.lastHandNumber),
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    if (!this.profile) {
      return html`
        <div class="main">
          <div class="content"></div>
        </div>
      `;
    }

    return html`
      <div class="main">
        <div class="content">
          <section class="panel">
            <div class="eyebrow">Player Profile</div>
            <div class="header">
              <div class="identity">
                <h1>
                  ${formatPlayerLabel(this.profile.name, this.profile.id)}
                </h1>
                <div class="player-id">Player ID: ${this.profile.id}</div>
                <div class="meta">
                  Joined ${formatDate(this.profile.joinedAt)}
                </div>
              </div>
              <div class=${`status ${this.profile.online ? "" : "offline"}`}>
                ${this.profile.online
                  ? "Playing"
                  : `Last played ${formatRelativeDate(this.profile.lastSeenAt)}`}
              </div>
            </div>
            <div class="summary">
              <article class="stat">
                <div class="label">Total Net Winnings</div>
                <div
                  class=${`value ${getResultClass(this.profile.totalNetWinnings)}`}
                >
                  ${formatSignedCurrency(this.profile.totalNetWinnings)}
                </div>
              </article>
              <article class="stat">
                <div class="label">Total Hands</div>
                <div class="value">
                  ${formatNumber(this.profile.totalHands)}
                </div>
              </article>
              <article class="stat">
                <div class="label">Games Played</div>
                <div class="value">
                  ${formatNumber(this.profile.recentGames?.length ?? 0)}
                </div>
              </article>
            </div>
          </section>
          <section class="section">
            <div class="panel">
              <h2>Recent Games</h2>
              ${this.renderRecentGames()}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  renderRecentGames() {
    const games = this.profile?.recentGames ?? [];
    if (games.length === 0) {
      return html`<div class="empty">No games recorded yet.</div>`;
    }

    return html`
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Net Winnings</th>
              <th scope="col">Hands Played</th>
              <th scope="col">Last Hand</th>
            </tr>
          </thead>
          <tbody>
            ${games.map(
              (game) => html`
                <tr
                  tabindex="0"
                  @click=${() => {
                    this.navigateToGame(game);
                  }}
                  @keydown=${(event) => {
                    handleRowKeydown(event, () => {
                      this.navigateToGame(game);
                    });
                  }}
                >
                  <td class="game-type">${formatGameType(game.gameType)}</td>
                  <td class=${`value ${getResultClass(game.netWinnings)}`}>
                    ${formatSignedCurrency(game.netWinnings)}
                  </td>
                  <td>${formatNumber(game.handsPlayed)}</td>
                  <td>${formatDateTime(game.lastPlayedAt)}</td>
                </tr>
              `,
            )}
          </tbody>
        </table>
      </div>
    `;
  }
}

/**
 * @param {number} amount
 * @returns {string}
 */
function formatSignedCurrency(amount) {
  if (amount === 0) return formatCurrency(0);
  return `${amount > 0 ? "+" : "-"}${formatCurrency(Math.abs(amount))}`;
}

/**
 * @param {number} value
 * @returns {string}
 */
function getResultClass(value) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "";
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * @param {string|undefined|undefined} value
 * @returns {string}
 */
function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * @param {string|undefined|undefined} value
 * @returns {string}
 */
function formatDateTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * @param {string|undefined|undefined} value
 * @returns {string}
 */
function formatRelativeDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const diffMs = date.getTime() - Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  /** @type {[Intl.RelativeTimeFormatUnit, number][]} */
  const units = [
    ["year", year],
    ["month", month],
    ["week", week],
    ["day", day],
    ["hour", hour],
    ["minute", minute],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const [unit, size] of units) {
    if (Math.abs(diffMs) >= size || unit === "minute") {
      return formatter.format(Math.round(diffMs / size), unit);
    }
  }

  return "just now";
}

/**
 * @param {"cash"|"sitngo"|"mtt"|"tournament"} gameType
 * @returns {string}
 */
function formatGameType(gameType) {
  const normalized = normalizeGameType(gameType);
  if (normalized === "sitngo") return "Sit n Go";
  if (normalized === "mtt") return "Tournament";
  return "Cash";
}

/**
 * @param {"cash"|"sitngo"|"mtt"|"tournament"} gameType
 * @returns {"cash"|"sitngo"|"mtt"}
 */
function normalizeGameType(gameType) {
  return gameType === "tournament" ? "sitngo" : gameType;
}

/**
 * @param {KeyboardEvent} event
 * @param {() => void} callback
 */
function handleRowKeydown(event, callback) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  callback();
}

customElements.define("phg-player-profile", PlayerProfile);
