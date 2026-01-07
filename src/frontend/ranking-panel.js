import * as COLORS from "./colors.js";
import { html, css, unsafeCSS, LitElement } from "lit";

class RankingPanel extends LitElement {
  static get styles() {
    return css`
      :host {
        display: block;
        font-family: "Press Start 2P", monospace;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 8px 12px;
        text-align: left;
      }

      th {
        color: ${unsafeCSS(COLORS.fgDark)};
        font-size: 0.8em;
        border-bottom: 2px solid ${unsafeCSS(COLORS.fgDark)};
      }

      th .tooltip {
        font-size: 0.8em;
        color: ${unsafeCSS(COLORS.fgDark)};
        display: block;
        font-weight: normal;
        margin-top: 4px;
      }

      td {
        color: ${unsafeCSS(COLORS.fgMedium)};
      }

      .player-name {
        color: ${unsafeCSS(COLORS.fgWhite)};
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .positive {
        color: ${unsafeCSS(COLORS.greenLight)};
      }

      .negative {
        color: ${unsafeCSS(COLORS.red)};
      }

      .neutral {
        color: ${unsafeCSS(COLORS.fgMedium)};
      }

      .na {
        color: ${unsafeCSS(COLORS.fgDark)};
      }

      .rank-col {
        width: 20px;
        color: ${unsafeCSS(COLORS.gold)};
      }
    `;
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
      return `+$${value}`;
    }
    return `-$${Math.abs(value)}`;
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
