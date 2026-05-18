import { html, css, LitElement } from "lit";
import { BLIND_LEVELS, LEVEL_DURATION_TICKS } from "../shared/tournament.js";
import { baseStyles, formatCurrency, modalTableStyles } from "./styles.js";

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

class TournamentLevelsPanel extends LitElement {
  static get styles() {
    return [
      baseStyles,
      modalTableStyles,
      css`
        :host {
          display: block;
          --modal-table-min-width: 340px;
          --modal-table-mobile-min-width: 300px;
        }

        th,
        td {
          white-space: nowrap;
        }

        tr.past td {
          color: var(--color-fg-muted);
        }

        tr.current td {
          color: var(--color-primary);
        }

        tr.next td {
          color: var(--color-fg-medium);
        }
      `,
    ];
  }

  static get properties() {
    return {
      tournament: { type: Object },
    };
  }

  constructor() {
    super();
    this.tournament = null;
  }

  getRowClass(level) {
    const currentLevel = this.tournament?.level ?? 1;
    if (level < currentLevel) return "past";
    if (level === currentLevel) return "current";
    return "next";
  }

  render() {
    return html`
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Level</th>
              <th>Blinds</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            ${BLIND_LEVELS.map(
              (level) => html`
                <tr class=${this.getRowClass(level.level)}>
                  <td>${level.level}</td>
                  <td>
                    ${formatCurrency(level.small)}/${formatCurrency(level.big)}
                  </td>
                  <td>${formatDuration(LEVEL_DURATION_TICKS)}</td>
                </tr>
              `,
            )}
          </tbody>
        </table>
      </div>
    `;
  }
}

customElements.define("phg-tournament-levels-panel", TournamentLevelsPanel);
