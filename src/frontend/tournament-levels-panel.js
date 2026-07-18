import { html, LitElement } from "lit";
import {
  BLIND_LEVELS,
  BREAK_AFTER_LEVEL,
  BREAK_DURATION_TICKS,
  LEVEL_DURATION_TICKS,
} from "../shared/tournament.js";
import { formatCurrency } from "./currency.js";

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

function getScheduleRows() {
  return BLIND_LEVELS.flatMap((level) => {
    const levelRow = { kind: "level", ...level };
    if (level.level !== BREAK_AFTER_LEVEL) return [levelRow];

    return [
      levelRow,
      {
        kind: "break",
        id: "break",
        afterLevel: BREAK_AFTER_LEVEL,
        duration: BREAK_DURATION_TICKS,
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
      this.tournament?.onBreak && level === BREAK_AFTER_LEVEL;
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
        <td>${formatDuration(LEVEL_DURATION_TICKS)}</td>
      </tr>
    `;
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
            ${getScheduleRows().map((row) => this.renderRow(row))}
          </tbody>
        </table>
      </div>
    `;
  }
}

customElements.define("phg-tournament-levels-panel", TournamentLevelsPanel);
