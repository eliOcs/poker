import { html, css, LitElement } from "lit";
import { designTokens, baseStyles, formatCurrency } from "./styles.js";

class RankingPanel extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          display: block;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          padding: var(--space-md) var(--space-lg);
          text-align: left;
        }

        th {
          color: var(--color-fg-muted);
          font-size: var(--font-md);
          border-bottom: 2px solid var(--color-fg-muted);
        }

        th .tooltip {
          font-size: var(--font-sm);
          color: var(--color-fg-muted);
          display: block;
          font-weight: normal;
          margin-top: var(--space-sm);
        }

        td {
          color: var(--color-fg-medium);
        }

        .player-name {
          color: var(--color-fg-white);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
    };
  }

  constructor() {
    super();
    this.rankings = [];
  }

  formatNet(value) {
    if (value >= 0) {
      return `+${formatCurrency(value)}`;
    }
    return `-${formatCurrency(Math.abs(value))}`;
  }

  formatWinRate(value) {
    if (value === null) return "-";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}`;
  }

  getValueClass(value) {
    if (value === null) return "na";
    if (value > 0) return "positive";
    if (value < 0) return "negative";
    return "neutral";
  }

  render() {
    if (!this.rankings || this.rankings.length === 0) {
      return html``;
    }

    return html`
      <table>
        <thead>
          <tr>
            <th class="rank-col">#</th>
            <th>Player</th>
            <th>
              Net
              <span class="tooltip">(profit/loss)</span>
            </th>
            <th>
              BB/100
              <span class="tooltip">(win rate)</span>
            </th>
          </tr>
        </thead>
        <tbody>
          ${this.rankings.map(
            (r, i) => html`
              <tr>
                <td class="rank-col">${i + 1}</td>
                <td class="player-name">
                  ${r.playerName || `Seat ${r.seatIndex + 1}`}
                </td>
                <td class="${this.getValueClass(r.netWinnings)}">
                  ${this.formatNet(r.netWinnings)}
                </td>
                <td class="${this.getValueClass(r.winRate)}">
                  ${this.formatWinRate(r.winRate)}
                </td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    `;
  }
}

customElements.define("phg-ranking-panel", RankingPanel);
