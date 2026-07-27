import { html, LitElement } from "lit";
import { formatCurrency } from "./currency.js";

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

function getScheduleRows(tournament) {
  return tournament.blindLevels.flatMap((level) => {
    const levelRow = { kind: "level", ...level };
    if (!tournament.breakAfterLevels.includes(level.level)) return [levelRow];

    return [
      levelRow,
      {
        kind: "break",
        id: `break-${level.level}`,
        afterLevel: level.level,
        duration: tournament.breakDurationTicks,
      },
    ];
  });
}

class TournamentLevelsPanel extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      tournament: { type: Object },
    };
  }

  constructor() {
    super();
    this.tournament = undefined;
  }

  getLevelRowClass(level) {
    const currentLevel = this.tournament?.level ?? 1;
    const isBreakAfterThisLevel =
      this.tournament?.onBreak && level === currentLevel;
    if (isBreakAfterThisLevel || level < currentLevel) return "past";
    if (level === currentLevel) return "current";
    return "next";
  }

  getBreakRowClass(afterLevel) {
    const currentLevel = this.tournament?.level ?? 1;
    if (this.tournament?.onBreak && currentLevel === afterLevel) {
      return "current";
    }
    if (currentLevel > afterLevel) return "past";
    return "next";
  }

  getRowClass(row) {
    if (row.kind === "break") return this.getBreakRowClass(row.afterLevel);
    return this.getLevelRowClass(row.level);
  }

  renderRow(row) {
    if (row.kind === "break") {
      return html`
        <tr class=${this.getRowClass(row)}>
          <td>Break</td>
          <td>-</td>
          <td>${formatDuration(row.duration)}</td>
        </tr>
      `;
    }

    return html`
      <tr class=${this.getRowClass(row)}>
        <td>${row.level}</td>
        <td>${formatCurrency(row.small)}/${formatCurrency(row.big)}</td>
        <td>${formatDuration(this.tournament.levelDurationTicks)}</td>
      </tr>
    `;
  }

  render() {
    if (!this.tournament) return html``;

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
            ${getScheduleRows(this.tournament).map((row) =>
              this.renderRow(row),
            )}
          </tbody>
        </table>
      </div>
    `;
  }
}

customElements.define("phg-tournament-levels-panel", TournamentLevelsPanel);
