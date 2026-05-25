import { html, css, LitElement } from "lit";
import { baseStyles, formatCurrency, modalTableStyles } from "./styles.js";

class RankingPanel extends LitElement {
  static get styles() {
    return [
      baseStyles,
      modalTableStyles,
      css`
        :host {
          display: block;
        }

        th .tooltip {
          font-size: var(--font-xs);
          color: var(--color-fg-muted);
          display: block;
          font-weight: normal;
          margin-top: var(--space-sm);
        }

        .player-name {
          color: var(--color-fg-white);
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (width < 800px) {
          .player-name {
            max-width: 120px;
          }
        }

        .positive {
          color: var(--color-success);
        }

        .negative {
          color: var(--color-error);
        }

        .neutral {
          color: var(--color-fg-medium);
        }

        .na {
          color: var(--color-fg-muted);
        }

        .rank-col {
          width: 20px;
          color: var(--color-primary);
        }
      `,
    ];
  }

  static get properties() {
    return {
      rankings: { type: Array },
      tournament: { type: Object },
    };
  }

  constructor() {
    super();
    this.rankings = [];
    this.tournament = undefined;
  }

  formatNet(value) {
    if (value >= 0) {
      return `+${formatCurrency(value)}`;
    }
    return `-${formatCurrency(Math.abs(value))}`;
  }

  formatWinRate(value) {
    if (value == undefined) return "-";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}`;
  }

  getValueClass(value) {
    if (value == undefined) return "na";
    if (value > 0) return "positive";
    if (value < 0) return "negative";
    return "neutral";
  }

  render() {
    if (this.rankings.length === 0) {
      return html``;
    }

    const isTournament = !!this.tournament;

    return html`
      <table>
        <thead>
          <tr>
            <th class="rank-col">#</th>
            <th>Player</th>
            ${isTournament
              ? html`<th>Stack</th>
                  <th>Net</th>`
              : html`
                  <th>
                    Net
                    <span class="tooltip">(profit/loss)</span>
                  </th>
                  <th>
                    BB/100
                    <span class="tooltip">(win rate)</span>
                  </th>
                `}
          </tr>
        </thead>
        <tbody>
          ${this.rankings.map(
            (r, i) => html`
              <tr>
                <td class="rank-col">${i + 1}</td>
                <td class="player-name">
                  ${r.playerName ?? `Seat ${r.seatIndex + 1}`}
                </td>
                ${isTournament
                  ? html`<td>${formatCurrency(r.stack)}</td>
                      <td class="${this.getValueClass(r.netWinnings)}">
                        ${this.formatNet(r.netWinnings)}
                      </td>`
                  : html`
                      <td class="${this.getValueClass(r.netWinnings)}">
                        ${this.formatNet(r.netWinnings)}
                      </td>
                      <td class="${this.getValueClass(r.winRate)}">
                        ${this.formatWinRate(r.winRate)}
                      </td>
                    `}
              </tr>
            `,
          )}
        </tbody>
      </table>
    `;
  }
}

customElements.define("phg-ranking-panel", RankingPanel);
