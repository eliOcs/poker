import { html, LitElement } from "lit";
import { formatAmount } from "./currency.js";
import { renderTooltip } from "./tooltip.js";

class RankingPanel extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      rankings: { type: Array },
      tournament: { type: Object },
      displayBigBlind: { type: Number },
    };
  }

  constructor() {
    super();
    this.rankings = [];
    this.tournament = undefined;
    this.displayBigBlind = 0;
  }

  formatNet(value) {
    const amount = formatAmount(Math.abs(value), this.displayBigBlind);
    return value >= 0 ? `+${amount}` : `-${amount}`;
  }

  formatWinRate(value) {
    if ((value ?? undefined) === undefined) return "-";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}`;
  }

  getValueClass(value) {
    if ((value ?? undefined) === undefined) return "na";
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
            ${
              isTournament
                ? html`<th>Stack</th>
                    <th>Net</th>`
                : html`
                    <th>
                      <div class="ranking-heading">
                        Net
                        ${renderTooltip({
                          id: "net-winnings-tooltip",
                          triggerLabel: "Net winnings details",
                          content: html`Total profit or loss at this table.`,
                        })}
                      </div>
                    </th>
                    <th>
                      <div class="ranking-heading">
                        BB/100
                        ${renderTooltip({
                          id: "win-rate-tooltip",
                          triggerLabel: "BB per 100 details",
                          content: html`Big blinds won or lost per 100 hands.`,
                        })}
                      </div>
                    </th>
                  `
            }
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
                ${
                  isTournament
                    ? html`<td>
                          ${formatAmount(r.stack, this.displayBigBlind)}
                        </td>
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
                      `
                }
              </tr>
            `,
          )}
        </tbody>
      </table>
    `;
  }
}

customElements.define("phg-ranking-panel", RankingPanel);
