import { html, css, LitElement } from "lit";
import { designTokens, baseStyles, formatCurrency } from "./styles.js";
import { ICONS } from "./icons.js";
import "./navigation-drawer.js";

class PlayerProfile extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          min-height: 100vh;
          display: block;
          box-sizing: border-box;
          background: var(--color-bg-medium);
          color: var(--color-fg-medium);
        }

        :host * {
          box-sizing: inherit;
        }

        .layout {
          min-height: 100vh;
          display: flex;
          background: var(--color-bg-dark);
        }

        .main {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: clamp(12px, 3vw, 32px);
          background: var(--color-bg-medium);
        }

        .panel {
          width: min(1080px, 100%);
          max-width: 100%;
          display: grid;
          gap: 16px;
          padding: clamp(18px, 4vw, 28px);
          box-sizing: border-box;
          border: var(--space-sm) solid var(--color-fg-muted);
          background: var(--color-bg-light);
          box-shadow: var(--space-md) var(--space-md) 0 var(--color-bg-dark);
        }

        .content {
          width: min(1080px, 100%);
          max-width: 100%;
          display: grid;
          gap: 16px;
        }

        .eyebrow {
          font-size: var(--font-sm);
          color: var(--color-primary);
        }

        .header {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 16px;
        }

        .identity {
          display: grid;
          gap: 6px;
        }

        h1 {
          margin: 0;
          font-size: clamp(18px, 3vw, 28px);
          line-height: 1.4;
          color: var(--color-fg-white);
        }

        .player-id {
          font-size: var(--font-sm);
          line-height: 1.8;
          color: var(--color-fg-muted);
          word-break: break-all;
        }

        .meta {
          font-size: var(--font-sm);
          line-height: 1.8;
          color: var(--color-fg-muted);
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          box-sizing: border-box;
          border: 2px solid var(--color-fg-muted);
          background: var(--color-bg-medium);
          color: var(--color-success);
          font-size: var(--font-sm);
          white-space: nowrap;
        }

        .status.offline {
          color: var(--color-primary);
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .stat {
          display: grid;
          gap: 8px;
          padding: 14px;
          border: 2px solid var(--color-bg-dark);
          background: var(--color-bg-medium);
          align-content: start;
        }

        .label {
          font-size: var(--font-sm);
          color: var(--color-fg-muted);
          line-height: 1.6;
        }

        .value {
          font-size: var(--font-lg);
          line-height: 1.7;
          color: var(--color-fg-white);
        }

        .value.positive {
          color: var(--color-success);
        }

        .value.negative {
          color: var(--color-error);
        }

        .loading {
          text-align: center;
          font-size: var(--font-md);
          color: var(--color-fg-medium);
        }

        .section {
          display: grid;
          gap: 12px;
        }

        h2 {
          margin: 0;
          font-size: var(--font-md);
          color: var(--color-fg-white);
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }

        th,
        td {
          padding: var(--space-md) var(--space-lg);
          text-align: left;
        }

        @media (width < 800px) {
          th,
          td {
            padding: var(--space-sm) var(--space-md);
            font-size: var(--font-sm);
          }
        }

        th {
          color: var(--color-fg-muted);
          font-size: var(--font-sm);
          border-bottom: 2px solid var(--color-fg-muted);
          white-space: nowrap;
        }

        td {
          color: var(--color-fg-medium);
          border-bottom: 1px solid var(--color-bg-dark);
          font-size: var(--font-sm);
        }

        tbody tr {
          cursor: pointer;
        }

        tbody tr:hover,
        tbody tr:focus-visible {
          background: color-mix(
            in srgb,
            var(--color-bg-medium) 70%,
            var(--color-bg-light)
          );
        }

        tbody tr:last-child td {
          border-bottom: 0;
        }

        .game-type {
          white-space: nowrap;
          color: var(--color-fg-white);
        }

        .empty {
          padding: 18px;
          border: 2px solid var(--color-bg-dark);
          background: var(--color-bg-medium);
          color: var(--color-fg-muted);
        }

        @media (width < 800px) {
          .header {
            grid-template-columns: 1fr;
            display: grid;
          }

          .summary {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (width < 520px) {
          .panel {
            gap: 12px;
            padding: var(--space-md);
            width: 100%;
          }

          .main {
            padding: 56px var(--space-md) var(--space-md);
          }

          .status {
            width: 100%;
            justify-content: center;
            white-space: normal;
            text-align: center;
            line-height: 1.6;
          }

          .summary {
            grid-template-columns: 1fr;
            gap: var(--space-md);
          }

          .stat {
            min-height: 0;
            padding: 12px;
          }

          th,
          td {
            padding: 10px 12px;
          }
        }
      `,
    ];
  }

  static get properties() {
    return {
      profile: { type: Object },
      drawerOpen: { type: Boolean, state: true },
    };
  }

  constructor() {
    super();
    this.profile = null;
    this.drawerOpen = false;
    this._onMediaChange = (event) => {
      this.drawerOpen = event.matches;
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._mql = window.matchMedia("(min-width: 800px)");
    this._mql.addEventListener("change", this._onMediaChange);
    this.drawerOpen = this._mql.matches;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mql?.removeEventListener("change", this._onMediaChange);
  }

  navigateToGame(game) {
    this.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { path: `/history/${game.gameId}/${game.lastHandNumber}` },
        bubbles: true,
        composed: true,
      }),
    );
  }

  openSettings() {
    if (!this._mql?.matches) {
      this.drawerOpen = false;
    }
    this.dispatchEvent(
      new CustomEvent("open-settings", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  toggleDrawer() {
    this.drawerOpen = !this.drawerOpen;
  }

  render() {
    if (!this.profile) {
      return html`<div class="panel">
        <div class="loading">Loading player...</div>
      </div>`;
    }

    return html`
      <div class="layout">
        ${this.renderDrawer()}
        <div class="main">
          <div class="content">
            <section class="panel">
              <div class="eyebrow">Player Profile</div>
              <div class="header">
                <div class="identity">
                  <h1>${this.profile.name}</h1>
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
                    ${formatNumber(this.profile.recentGames?.length || 0)}
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
      </div>
    `;
  }

  renderDrawer() {
    return html`
      <phg-navigation-drawer
        ?open=${this.drawerOpen}
        @drawer-toggle=${this.toggleDrawer}
      >
        <button @click=${this.openSettings}>
          ${ICONS.settings}
          <span>Settings</span>
        </button>
      </phg-navigation-drawer>
    `;
  }

  renderRecentGames() {
    const games = this.profile?.recentGames || [];
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
 * @param {string|null|undefined} value
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
 * @param {string|null|undefined} value
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
 * @param {string|null|undefined} value
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
 * @param {"cash"|"tournament"} gameType
 * @returns {string}
 */
function formatGameType(gameType) {
  return gameType === "tournament" ? "Sit n Go" : "Cash";
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
