import { html, LitElement } from "lit";
import { formatCurrency } from "./styles.js";
import { getMttPath, getTablePath } from "../shared/routes.js";
import { renderMttNavigationDrawer } from "./mtt-navigation-drawer.js";
import { mttLobbyStyles } from "./mtt-lobby-styles.js";
import {
  formatStatus,
  formatLevel,
  formatPayoutTier,
  formatEntrantName,
  renderActions,
  renderTables,
  renderEntrantsTable,
  renderStandingsTable,
} from "./mtt-lobby-render.js";
import "./button.js";
import "./edit-label.js";

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
    this.tournamentId = undefined;
    this.tournament = undefined;
    this.user = undefined;
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

  openSignUp() {
    this.dispatchEvent(
      new CustomEvent("open-sign-up", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  _dispatchMttAction(action) {
    if (action === "register" && !this.user?.email) {
      if (this.tournamentId) {
        const url = new URL(
          getMttPath(this.tournamentId),
          window.location.href,
        );
        url.searchParams.set("action", "register");
        history.replaceState(history.state, "", url);
      }
      this.openSignUp();
      return;
    }

    this.dispatchEvent(
      new CustomEvent("mtt-action", {
        detail: { action },
        bubbles: true,
        composed: true,
      }),
    );
  }

  _clearUrlActionParam() {
    const url = new URL(window.location.href);
    url.searchParams.delete("action");
    const nextPath = `${url.pathname}${url.search}${url.hash}`;
    history.replaceState(history.state, "", nextPath);
  }

  _maybePerformUrlAction() {
    if (!this.tournamentId || this.actionPending) return;

    const url = new URL(window.location.href);
    if (url.pathname !== getMttPath(this.tournamentId)) return;
    if (url.searchParams.get("action") !== "register") return;
    if (!this.user?.email) return;

    if (this.tournament?.currentPlayer?.status === "registered") {
      this._clearUrlActionParam();
      return;
    }

    this._clearUrlActionParam();
    this._dispatchMttAction("register");
  }

  updated() {
    this._maybePerformUrlAction();
  }

  _dispatchRename(event) {
    this.dispatchEvent(
      new CustomEvent("mtt-rename", {
        detail: { name: event.detail.value },
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
    if (!tableId) return;
    return this.tournament?.tables.find((table) => table.tableId === tableId);
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

  _buildDrawerParams(tournament) {
    const activeTables =
      tournament?.tables.filter((table) => !table.closed) ?? [];
    return {
      activeTables,
      share:
        "share" in navigator
          ? () => {
              this._share();
            }
          : undefined,
    };
  }

  _renderTitle(tournament) {
    const tournamentName =
      tournament?.name ?? `Tournament #${tournament?.id ?? this.tournamentId}`;
    if (!tournament?.actions?.canRename) return tournamentName;

    return html`<phg-edit-label
      .value=${tournamentName}
      placeholder="Tournament name"
      @value-changed=${this._dispatchRename}
    ></phg-edit-label>`;
  }

  _renderOwner(tournament) {
    if (tournament.owner) {
      return formatEntrantName({
        playerId: tournament.owner.id,
        name: tournament.owner.name,
      });
    }

    const owner = tournament?.entrants.find(
      (entrant) => entrant.playerId === tournament.ownerId,
    );
    return owner ? formatEntrantName(owner) : `#${tournament.ownerId}`;
  }

  render() {
    const tournament = this.tournament;
    const currentTable = this._getCurrentTable();
    const { activeTables, share } = this._buildDrawerParams(tournament);
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
        onCopyLink: copyLink,
        copied: this._copied,
        onShare: share,
        onOpenSettings: () => {
          this.openSettings();
        },
        onOpenSignIn: () => {
          this.openSignIn();
        },
        onOpenSignUp: () => {
          this.openSignUp();
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
                        <h1>${this._renderTitle(tournament)}</h1>
                        <div class="meta">
                          <span>#${tournament.id}</span>
                          <span>Owner: ${this._renderOwner(tournament)}</span>
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
                      <div class="label">Rebuys</div>
                      <div class="value">${tournament.maxRebuys}</div>
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
                    tournamentId: this.tournamentId,
                    actionPending: this.actionPending,
                    onMttAction,
                    onNavigate,
                    onCopyLink: copyLink,
                    copied: this._copied,
                    onShare: share,
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
