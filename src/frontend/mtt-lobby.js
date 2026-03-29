/* eslint-disable max-lines */
import { html, css, LitElement } from "lit";
import {
  designTokens,
  baseStyles,
  shellPageStyles,
  formatCurrency,
} from "./styles.js";
import {
  getMttPath,
  getTablePath,
  getTableHistoryPath,
} from "../shared/routes.js";
import { calculatePrizes } from "../shared/tournament.js";
import { renderMttNavigationDrawer } from "./mtt-navigation-drawer.js";
import "./button.js";

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

class MttLobby extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      shellPageStyles,
      css`
        :host {
          height: 100%;
        }

        @media (width >= 800px) {
          :host {
            flex-direction: row;
          }
        }

        .panel {
          width: min(1120px, 100%);
          display: grid;
          gap: 16px;
          padding: clamp(18px, 4vw, 28px);
          border: var(--space-sm) solid var(--color-fg-muted);
          background: var(--color-bg-light);
          box-shadow: var(--space-md) var(--space-md) 0 var(--color-bg-dark);
        }

        .header {
          display: grid;
          gap: 12px;
        }

        .eyebrow {
          font-size: var(--font-sm);
          color: var(--color-primary);
        }

        .title-row {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 16px;
        }

        h1,
        h2 {
          margin: 0;
          color: var(--color-fg-white);
        }

        h1 {
          font-size: clamp(18px, 3vw, 28px);
          line-height: 1.4;
        }

        h2 {
          font-size: var(--font-md);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          padding: 10px 12px;
          border: 2px solid var(--color-fg-muted);
          background: var(--color-bg-medium);
          color: var(--color-fg-white);
          font-size: var(--font-sm);
          white-space: nowrap;
        }

        .status-pill.registration {
          color: var(--color-primary);
        }

        .status-pill.running {
          color: var(--color-success);
        }

        .status-pill.finished {
          color: var(--color-warning);
        }

        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          color: var(--color-fg-muted);
          font-size: var(--font-sm);
          line-height: 1.8;
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .stat {
          display: grid;
          gap: 8px;
          padding: 14px;
          border: 2px solid var(--color-bg-dark);
          background: var(--color-bg-medium);
        }

        .label {
          font-size: var(--font-sm);
          color: var(--color-fg-muted);
          line-height: 1.6;
        }

        .value {
          font-size: var(--font-md);
          color: var(--color-fg-white);
          line-height: 1.7;
        }

        .section {
          display: grid;
          gap: 12px;
        }

        .action-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .assignment {
          display: grid;
          gap: 12px;
          padding: 14px;
          border: 2px solid var(--color-primary);
          background: color-mix(
            in srgb,
            var(--color-bg-medium) 75%,
            var(--color-primary)
          );
        }

        .assignment p,
        .empty,
        .loading,
        .error {
          margin: 0;
          font-size: var(--font-sm);
          line-height: 1.8;
        }

        .tables {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .table-card {
          display: grid;
          gap: 10px;
          padding: 14px;
          border: 2px solid var(--color-bg-dark);
          background: var(--color-bg-medium);
        }

        .table-meta {
          display: grid;
          gap: 4px;
          color: var(--color-fg-muted);
          font-size: var(--font-sm);
          line-height: 1.7;
        }

        .table-card.current {
          border-color: var(--color-success);
        }

        .table-card.closed {
          opacity: 0.8;
        }

        .table-name {
          color: var(--color-fg-white);
        }

        .table-actions {
          display: flex;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 620px;
          border-collapse: collapse;
        }

        th,
        td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid var(--color-bg-dark);
          font-size: var(--font-sm);
        }

        th {
          color: var(--color-fg-muted);
          border-bottom-width: 2px;
          white-space: nowrap;
        }

        td {
          color: var(--color-fg-medium);
        }

        .positive {
          color: var(--color-success);
        }

        .negative {
          color: var(--color-error);
        }

        td strong {
          color: var(--color-fg-white);
        }

        tbody tr:last-child td {
          border-bottom: 0;
        }

        .empty,
        .loading,
        .error {
          padding: 18px;
          border: 2px solid var(--color-bg-dark);
          background: var(--color-bg-medium);
          color: var(--color-fg-muted);
        }

        .error {
          color: var(--color-error);
        }

        @media (width < 900px) {
          .summary {
            grid-template-columns: 1fr 1fr;
          }

          .title-row {
            display: grid;
          }
        }

        @media (width < 600px) {
          .main {
            padding: 56px var(--space-md) var(--space-md);
          }

          .panel {
            padding: var(--space-md);
          }

          .summary {
            grid-template-columns: 1fr;
          }

          .status-pill {
            width: 100%;
            justify-content: center;
          }
        }

        @media (width >= 800px) {
          .main {
            overflow-y: auto;
          }
        }
      `,
    ];
  }

  static get properties() {
    return {
      tournamentId: { type: String, attribute: "tournament-id" },
      tournament: { type: Object },
      user: { type: Object },
      loading: { type: Boolean },
      error: { type: String },
      actionPending: { type: Boolean, attribute: "action-pending" },
      _copied: { type: Boolean, state: true },
      _drawerOpen: { type: Boolean, state: true },
    };
  }

  constructor() {
    super();
    this.tournamentId = null;
    this.tournament = null;
    this.user = null;
    this.loading = false;
    this.error = "";
    this.actionPending = false;
    this._copied = false;
    this._drawerOpen = false;
    this._onMediaChange = (event) => {
      this._drawerOpen = event.matches;
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._mql = window.matchMedia("(min-width: 800px)");
    this._mql.addEventListener("change", this._onMediaChange);
    this._drawerOpen = this._mql.matches;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mql?.removeEventListener("change", this._onMediaChange);
  }

  toggleDrawer() {
    this._drawerOpen = !this._drawerOpen;
  }

  openSettings() {
    this.dispatchEvent(
      new CustomEvent("open-settings", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  openSignIn() {
    this.dispatchEvent(
      new CustomEvent("open-sign-in", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  _dispatchMttAction(action) {
    this.dispatchEvent(
      new CustomEvent("mtt-action", {
        detail: { action },
        bubbles: true,
        composed: true,
      }),
    );
  }

  _navigate(path) {
    this.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { path },
        bubbles: true,
        composed: true,
      }),
    );
  }

  openLobby() {
    if (!this.tournamentId) return;
    this.dispatchEvent(
      new CustomEvent("navigate", {
        detail: {
          path: getMttPath(this.tournamentId),
          allowMttLobby: true,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  openTable(tableId) {
    if (!this.tournamentId) return;
    this._navigate(getTablePath("mtt", tableId, this.tournamentId));
  }

  _formatTimer(seconds) {
    const safeSeconds = Math.max(0, seconds || 0);
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  _formatStatus(status) {
    if (status === "registration") return "Registration Open";
    if (status === "running") return "Running";
    return "Finished";
  }

  _formatEntrantStatus(status) {
    if (status === "registered") return "Registered";
    if (status === "seated") return "Playing";
    if (status === "eliminated") return "Eliminated";
    if (status === "winner") return "Winner";
    return status;
  }

  _formatNetWinnings(cents) {
    const prefix = cents > 0 ? "+" : "";
    return `${prefix}${formatCurrency(cents)}`;
  }

  _formatPayoutTier(tournament) {
    const prizes = calculatePrizes(
      tournament.entrants.length,
      tournament.buyIn,
    );
    if (prizes.length === 0) return "—";
    return prizes
      .map((p) => `${ordinal(p.position)}: ${formatCurrency(p.amount)}`)
      .join(", ");
  }

  _formatLevel(tournament) {
    if (!tournament) return "Level 1";
    if (tournament.onBreak) {
      return `Break ${this._formatTimer(tournament.timeToNextLevel)}`;
    }
    if (tournament.pendingBreak) {
      return `Level ${tournament.level} • Break pending`;
    }
    return `Level ${tournament.level} • ${this._formatTimer(
      tournament.timeToNextLevel,
    )}`;
  }

  _getTableName(tableId) {
    return (
      this.tournament?.tables.find((table) => table.tableId === tableId)
        ?.tableName || tableId
    );
  }

  _tournamentUrl() {
    return `${window.location.origin}${getMttPath(this.tournamentId)}`;
  }

  _getCurrentTable() {
    const tableId = this.tournament?.currentPlayer?.tableId;
    if (!tableId) return null;
    return this.tournament?.tables.find((table) => table.tableId === tableId);
  }

  _openCurrentTableHistory() {
    const table = this._getCurrentTable();
    if (!table || !this.tournamentId || table.handNumber <= 0) return;
    this._navigate(
      getTableHistoryPath("mtt", table.tableId, null, this.tournamentId),
    );
  }

  async _copyLink() {
    await navigator.clipboard.writeText(this._tournamentUrl());
    this._copied = true;
    setTimeout(() => {
      this._copied = false;
    }, 2000);
  }

  _share() {
    navigator.share({
      title: "Join my poker tournament",
      url: this._tournamentUrl(),
    });
  }

  _renderActions(tournament) {
    if (!tournament) return "";
    const { actions } = tournament;

    return html`
      <div class="action-row">
        ${actions.canRegister
          ? html`<phg-button
              variant="primary"
              ?disabled=${this.actionPending}
              @click=${() => {
                this._dispatchMttAction("register");
              }}
            >
              Register
            </phg-button>`
          : ""}
        ${actions.canUnregister
          ? html`<phg-button
              variant="muted"
              ?disabled=${this.actionPending}
              @click=${() => {
                this._dispatchMttAction("unregister");
              }}
            >
              Unregister
            </phg-button>`
          : ""}
        ${actions.canStart
          ? html`<phg-button
              variant="success"
              ?disabled=${this.actionPending}
              @click=${() => {
                this._dispatchMttAction("start");
              }}
            >
              Start Tournament
            </phg-button>`
          : ""}
        <phg-button variant="secondary" @click=${this._copyLink}>
          ${this._copied ? "Copied!" : "Copy Link"}
        </phg-button>
        ${"share" in navigator
          ? html`<phg-button variant="secondary" @click=${this._share}>
              Share
            </phg-button>`
          : ""}
      </div>
    `;
  }

  _renderAssignment(tournament) {
    if (!tournament?.currentPlayer?.tableId) return "";

    const tableId = tournament.currentPlayer.tableId;
    const tableName = this._getTableName(tableId);
    const isRunning = tournament.status === "running";
    const isClosed =
      tournament.tables.find((t) => t.tableId === tableId)?.closed ?? false;

    return html`
      <div class="assignment">
        <strong>${isRunning ? "Current Table" : "Final Table"}</strong>
        <p>
          ${tableName}
          ${tournament.currentPlayer.seatIndex != null
            ? html` • Seat ${tournament.currentPlayer.seatIndex + 1}`
            : ""}
        </p>
        <div class="table-actions">
          ${isClosed
            ? html`<phg-button
                variant="secondary"
                @click=${() => {
                  this._navigate(
                    getTableHistoryPath(
                      "mtt",
                      tableId,
                      null,
                      this.tournamentId,
                    ),
                  );
                }}
              >
                Show History
              </phg-button>`
            : html`<phg-button
                variant="primary"
                @click=${() => {
                  this.openTable(tableId);
                }}
              >
                Open Table
              </phg-button>`}
        </div>
      </div>
    `;
  }

  _renderTables(tournament) {
    if (!tournament) return "";
    if (tournament.tables.length === 0) {
      return html`<div class="empty">
        Tables will be generated when the owner starts the tournament.
      </div>`;
    }

    return html`
      <div class="tables">
        ${tournament.tables.map((table) => {
          const isCurrent = tournament.currentPlayer.tableId === table.tableId;
          return html`
            <article
              class=${[
                "table-card",
                isCurrent ? "current" : "",
                table.closed ? "closed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <strong class="table-name">${table.tableName}</strong>
              <div class="table-meta">
                <span>Players: ${table.playerCount}</span>
                <span>Hand: #${table.handNumber || 0}</span>
                ${table.closed ? html`<span>Closed</span>` : ""}
              </div>
              <div class="table-actions">
                ${table.closed
                  ? html`<phg-button
                      variant="secondary"
                      @click=${() => {
                        this._navigate(
                          getTableHistoryPath(
                            "mtt",
                            table.tableId,
                            null,
                            this.tournamentId,
                          ),
                        );
                      }}
                    >
                      Show History
                    </phg-button>`
                  : html`<phg-button
                      variant=${isCurrent ? "success" : "secondary"}
                      @click=${() => {
                        this.openTable(table.tableId);
                      }}
                    >
                      ${isCurrent ? "Open My Table" : "Open Table"}
                    </phg-button>`}
              </div>
            </article>
          `;
        })}
      </div>
    `;
  }

  _renderEntrantsTable(tournament) {
    if (!tournament) return "";
    if (tournament.entrants.length === 0) {
      return html`<div class="empty">No entrants yet.</div>`;
    }

    return html`
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Status</th>
              <th>Stack</th>
              <th>Table</th>
              <th>Finish</th>
            </tr>
          </thead>
          <tbody>
            ${tournament.entrants.map(
              (entrant) => html`
                <tr>
                  <td><strong>${entrant.name}</strong></td>
                  <td>${this._formatEntrantStatus(entrant.status)}</td>
                  <td>${formatCurrency(entrant.stack)}</td>
                  <td>
                    ${entrant.tableId
                      ? this._getTableName(entrant.tableId)
                      : "—"}
                  </td>
                  <td>${entrant.finishPosition ?? "—"}</td>
                </tr>
              `,
            )}
          </tbody>
        </table>
      </div>
    `;
  }

  _renderStandingsTable(tournament) {
    if (!tournament) return "";
    if (tournament.standings.length === 0) {
      return html`<div class="empty">
        Standings will appear once the field is set.
      </div>`;
    }

    return html`
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Status</th>
              <th>Stack</th>
              <th>Table</th>
              <th>Finish</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            ${tournament.standings.map(
              (entrant) => html`
                <tr>
                  <td><strong>${entrant.name}</strong></td>
                  <td>${this._formatEntrantStatus(entrant.status)}</td>
                  <td>${formatCurrency(entrant.stack)}</td>
                  <td>
                    ${entrant.tableId
                      ? this._getTableName(entrant.tableId)
                      : "—"}
                  </td>
                  <td>${entrant.finishPosition ?? "—"}</td>
                  <td
                    class=${entrant.netWinnings > 0
                      ? "positive"
                      : entrant.netWinnings < 0
                        ? "negative"
                        : ""}
                  >
                    ${entrant.netWinnings != null
                      ? this._formatNetWinnings(entrant.netWinnings)
                      : "—"}
                  </td>
                </tr>
              `,
            )}
          </tbody>
        </table>
      </div>
    `;
  }

  // eslint-disable-next-line complexity
  render() {
    const tournament = this.tournament;
    const activeTables =
      tournament?.tables.filter((table) => !table.closed) ?? [];
    const currentTable = this._getCurrentTable();
    const hasCurrentTableHistory = (currentTable?.handNumber || 0) > 0;
    const toggleDrawer = () => {
      this.toggleDrawer();
    };
    const openLobby = () => {
      this.openLobby();
    };
    const openCurrentHistory = hasCurrentTableHistory
      ? () => {
          this._openCurrentTableHistory();
        }
      : null;
    const copyLink = () => {
      void this._copyLink();
    };
    const share =
      "share" in navigator
        ? () => {
            this._share();
          }
        : null;
    const openSettings = () => {
      this.openSettings();
    };
    const openSignIn = () => {
      this.openSignIn();
    };

    return html`
      ${renderMttNavigationDrawer({
        open: this._drawerOpen,
        onToggle: toggleDrawer,
        user: this.user,
        lobbyActive: true,
        onOpenLobby: openLobby,
        tableItems: activeTables.map((table) => ({
          label: table.tableName,
          isCurrentPlayerTable: table.tableId === currentTable?.tableId,
          onOpen: () => {
            this.openTable(table.tableId);
          },
        })),
        onOpenHistory: openCurrentHistory,
        historyDisabled: !hasCurrentTableHistory,
        onCopyLink: copyLink,
        copied: this._copied,
        onShare: share,
        onOpenSettings: openSettings,
        onOpenSignIn: openSignIn,
      })}
      <main class="main">
        <section class="panel">
          ${this.loading && !tournament
            ? html`<div class="loading">Loading tournament lobby…</div>`
            : this.error && !tournament
              ? html`<div class="error">${this.error}</div>`
              : ""}
          ${tournament
            ? html`
                <header class="header">
                  <div class="eyebrow">Multi-Table Tournament</div>
                  <div class="title-row">
                    <div>
                      <h1>Tournament #${tournament.id}</h1>
                      <div class="meta">
                        <span>Owner: ${tournament.ownerId}</span>
                        <span
                          >Created
                          ${new Date(
                            tournament.createdAt,
                          ).toLocaleString()}</span
                        >
                      </div>
                    </div>
                    <div class=${`status-pill ${tournament.status}`}>
                      ${this._formatStatus(tournament.status)}
                    </div>
                  </div>
                </header>

                <section class="summary">
                  <article class="stat">
                    <div class="label">Buy-In</div>
                    <div class="value">${formatCurrency(tournament.buyIn)}</div>
                  </article>
                  <article class="stat">
                    <div class="label">Table Size</div>
                    <div class="value">${tournament.tableSize}-Max</div>
                  </article>
                  <article class="stat">
                    <div class="label">Clock</div>
                    <div class="value">${this._formatLevel(tournament)}</div>
                  </article>
                  <article class="stat">
                    <div class="label">Players</div>
                    <div class="value">
                      ${tournament.entrants.length} entrants
                    </div>
                  </article>
                  <article class="stat">
                    <div class="label">Payouts</div>
                    <div class="value">
                      ${this._formatPayoutTier(tournament)}
                    </div>
                  </article>
                </section>

                ${this._renderActions(tournament)}
                ${this._renderAssignment(tournament)}
                ${tournament.status !== "registration"
                  ? html`
                      <section class="section">
                        <h2>Tables</h2>
                        ${this._renderTables(tournament)}
                      </section>
                    `
                  : ""}

                <section class="section">
                  <h2>
                    ${tournament.status === "registration"
                      ? "Entrants"
                      : "Standings"}
                  </h2>
                  ${tournament.status === "registration"
                    ? this._renderEntrantsTable(tournament)
                    : this._renderStandingsTable(tournament)}
                </section>
              `
            : ""}
        </section>
      </main>
    `;
  }
}

customElements.define("phg-mtt-lobby", MttLobby);
