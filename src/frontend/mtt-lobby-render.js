import { html } from "lit";
import { formatCurrency } from "./styles.js";
import { getTablePath, getTableHistoryPath } from "../shared/routes.js";
import { calculatePrizes } from "../shared/tournament.js";

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatTimer(seconds) {
  const safeSeconds = Math.max(0, seconds || 0);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatStatus(status) {
  if (status === "registration") return "Registration Open";
  if (status === "running") return "Running";
  return "Finished";
}

export function formatEntrantStatus(status) {
  if (status === "registered") return "Registered";
  if (status === "seated") return "Playing";
  if (status === "eliminated") return "Eliminated";
  if (status === "winner") return "Winner";
  return status;
}

export function formatNetWinnings(cents) {
  const prefix = cents > 0 ? "+" : "";
  return `${prefix}${formatCurrency(cents)}`;
}

export function formatPayoutTier(tournament) {
  const prizes = calculatePrizes(tournament.entrants.length, tournament.buyIn);
  if (prizes.length === 0) return "\u2014";
  return prizes
    .map((p) => `${ordinal(p.position)}: ${formatCurrency(p.amount)}`)
    .join(", ");
}

export function formatLevel(tournament) {
  if (!tournament) return "Level 1";
  if (tournament.onBreak) {
    return `Break ${formatTimer(tournament.timeToNextLevel)}`;
  }
  if (tournament.pendingBreak) {
    return `Level ${tournament.level} \u2022 Break pending`;
  }
  return `Level ${tournament.level} \u2022 ${formatTimer(
    tournament.timeToNextLevel,
  )}`;
}

function getTableName(tournament, tableId) {
  return (
    tournament?.tables.find((table) => table.tableId === tableId)?.tableName ||
    tableId
  );
}

/**
 * @param {object} params
 * @param {object} params.tournament
 * @param {boolean} params.actionPending
 * @param {(action: string) => void} params.onMttAction
 * @param {() => void} params.onCopyLink
 * @param {boolean} params.copied
 * @param {(() => void)|null} params.onShare
 */
export function renderActions({
  tournament,
  actionPending,
  onMttAction,
  onCopyLink,
  copied,
  onShare,
}) {
  if (!tournament) return "";
  const { actions } = tournament;

  return html`
    <div class="action-row">
      ${actions.canRegister
        ? html`<phg-button
            variant="primary"
            ?disabled=${actionPending}
            @click=${() => {
              onMttAction("register");
            }}
          >
            Register
          </phg-button>`
        : ""}
      ${actions.canUnregister
        ? html`<phg-button
            variant="muted"
            ?disabled=${actionPending}
            @click=${() => {
              onMttAction("unregister");
            }}
          >
            Unregister
          </phg-button>`
        : ""}
      ${actions.canStart
        ? html`<phg-button
            variant="success"
            ?disabled=${actionPending}
            @click=${() => {
              onMttAction("start");
            }}
          >
            Start Tournament
          </phg-button>`
        : ""}
      <phg-button variant="secondary" @click=${onCopyLink}>
        ${copied ? "Copied!" : "Copy Link"}
      </phg-button>
      ${onShare
        ? html`<phg-button variant="secondary" @click=${onShare}>
            Share
          </phg-button>`
        : ""}
    </div>
  `;
}

/**
 * @param {object} params
 * @param {object} params.tournament
 * @param {string} params.tournamentId
 * @param {(path: string) => void} params.onNavigate
 */
export function renderAssignment({ tournament, tournamentId, onNavigate }) {
  if (!tournament?.currentPlayer?.tableId) return "";

  const tableId = tournament.currentPlayer.tableId;
  const tableName = getTableName(tournament, tableId);
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
                onNavigate(
                  getTableHistoryPath("mtt", tableId, null, tournamentId),
                );
              }}
            >
              Show History
            </phg-button>`
          : html`<phg-button
              variant="primary"
              @click=${() => {
                onNavigate(getTablePath("mtt", tableId, tournamentId));
              }}
            >
              Open Table
            </phg-button>`}
      </div>
    </div>
  `;
}

/**
 * @param {object} params
 * @param {object} params.tournament
 * @param {string} params.tournamentId
 * @param {(path: string) => void} params.onNavigate
 */
export function renderTables({ tournament, tournamentId, onNavigate }) {
  if (!tournament) return "";
  if (tournament.tables.length === 0) {
    return html`<div class="empty">
      Tables will be generated when the owner starts the tournament.
    </div>`;
  }

  const currentTableId = tournament.currentPlayer.tableId;

  return html`
    <div class="tables">
      ${tournament.tables.map((table) => {
        const isCurrent = currentTableId === table.tableId;
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
                      onNavigate(
                        getTableHistoryPath(
                          "mtt",
                          table.tableId,
                          null,
                          tournamentId,
                        ),
                      );
                    }}
                  >
                    Show History
                  </phg-button>`
                : html`<phg-button
                    variant=${isCurrent ? "success" : "secondary"}
                    @click=${() => {
                      onNavigate(
                        getTablePath("mtt", table.tableId, tournamentId),
                      );
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

export function renderEntrantsTable(tournament) {
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
                <td>${formatEntrantStatus(entrant.status)}</td>
                <td>${formatCurrency(entrant.stack)}</td>
                <td>
                  ${entrant.tableId
                    ? getTableName(tournament, entrant.tableId)
                    : "\u2014"}
                </td>
                <td>${entrant.finishPosition ?? "\u2014"}</td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    </div>
  `;
}

export function renderStandingsTable(tournament) {
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
                <td>${formatEntrantStatus(entrant.status)}</td>
                <td>${formatCurrency(entrant.stack)}</td>
                <td>
                  ${entrant.tableId
                    ? getTableName(tournament, entrant.tableId)
                    : "\u2014"}
                </td>
                <td>${entrant.finishPosition ?? "\u2014"}</td>
                <td
                  class=${entrant.netWinnings > 0
                    ? "positive"
                    : entrant.netWinnings < 0
                      ? "negative"
                      : ""}
                >
                  ${entrant.netWinnings != null
                    ? formatNetWinnings(entrant.netWinnings)
                    : "\u2014"}
                </td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    </div>
  `;
}
