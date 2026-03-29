import { html, LitElement } from "lit";
import { formatCurrency } from "./styles.js";
import {
  getMttPath,
  getTablePath,
  getTableHistoryPath,
} from "../shared/routes.js";
import { renderMttNavigationDrawer } from "./mtt-navigation-drawer.js";
import { mttLobbyStyles } from "./mtt-lobby-styles.js";
import {
  formatStatus,
  formatLevel,
  formatPayoutTier,
  renderActions,
  renderAssignment,
  renderTables,
  renderEntrantsTable,
  renderStandingsTable,
} from "./mtt-lobby-render.js";
import "./button.js";

class MttLobby extends LitElement {
  static get styles() {
    return mttLobbyStyles;
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

  _buildDrawerParams(tournament, currentTable) {
    const activeTables =
      tournament?.tables.filter((table) => !table.closed) ?? [];
    const hasCurrentTableHistory = (currentTable?.handNumber || 0) > 0;
    return {
      activeTables,
      hasCurrentTableHistory,
      openCurrentHistory: hasCurrentTableHistory
        ? () => {
            this._openCurrentTableHistory();
          }
        : null,
      share:
        "share" in navigator
          ? () => {
              this._share();
            }
          : null,
    };
  }

  render() {
    const tournament = this.tournament;
    const currentTable = this._getCurrentTable();
    const { activeTables, hasCurrentTableHistory, openCurrentHistory, share } =
      this._buildDrawerParams(tournament, currentTable);
    const copyLink = () => {
      void this._copyLink();
    };
    const onNavigate = (path) => {
      this._navigate(path);
    };
    const onMttAction = (action) => {
      this._dispatchMttAction(action);
    };

    return html`
      ${renderMttNavigationDrawer({
        open: this._drawerOpen,
        onToggle: () => {
          this.toggleDrawer();
        },
        user: this.user,
        lobbyActive: true,
        onOpenLobby: () => {
          this.openLobby();
        },
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
        onOpenSettings: () => {
          this.openSettings();
        },
        onOpenSignIn: () => {
          this.openSignIn();
        },
      })}
      <main class="main">
        <div class="content">
          ${this.loading && !tournament
            ? html`<section class="panel">
                <div class="loading">Loading tournament lobby…</div>
              </section>`
            : this.error && !tournament
              ? html`<section class="panel">
                  <div class="error">${this.error}</div>
                </section>`
              : ""}
          ${tournament
            ? html`
                <section class="panel">
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
                        ${formatStatus(tournament.status)}
                      </div>
                    </div>
                  </header>

                  <section class="summary">
                    <article class="stat">
                      <div class="label">Buy-In</div>
                      <div class="value">
                        ${formatCurrency(tournament.buyIn)}
                      </div>
                    </article>
                    <article class="stat">
                      <div class="label">Table Size</div>
                      <div class="value">${tournament.tableSize}-Max</div>
                    </article>
                    <article class="stat">
                      <div class="label">Clock</div>
                      <div class="value">${formatLevel(tournament)}</div>
                    </article>
                    <article class="stat">
                      <div class="label">Players</div>
                      <div class="value">
                        ${tournament.entrants.length} entrants
                      </div>
                    </article>
                    <article class="stat">
                      <div class="label">Payouts</div>
                      <div class="value">${formatPayoutTier(tournament)}</div>
                    </article>
                  </section>

                  ${renderActions({
                    tournament,
                    actionPending: this.actionPending,
                    onMttAction,
                    onCopyLink: copyLink,
                    copied: this._copied,
                    onShare: share,
                  })}
                  ${renderAssignment({
                    tournament,
                    tournamentId: this.tournamentId,
                    onNavigate,
                  })}
                </section>

                ${tournament.status !== "registration"
                  ? html`
                      <section class="section">
                        <div class="panel">
                          <h2>Tables</h2>
                          ${renderTables({
                            tournament,
                            tournamentId: this.tournamentId,
                            onNavigate,
                          })}
                        </div>
                      </section>
                    `
                  : ""}

                <section class="section">
                  <div class="panel">
                    <h2>
                      ${tournament.status === "registration"
                        ? "Entrants"
                        : "Standings"}
                    </h2>
                    ${tournament.status === "registration"
                      ? renderEntrantsTable(tournament)
                      : renderStandingsTable(tournament)}
                  </div>
                </section>
              `
            : ""}
        </div>
      </main>
    `;
  }
}

customElements.define("phg-mtt-lobby", MttLobby);
