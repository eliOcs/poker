import { html } from "lit";
import { snapToStep } from "../shared/snap-to-step.js";

/** @typedef {import("../shared/snap-to-step.js").StepRange} StepRange */

/**
 * @param {any} panel
 * @param {StepRange} range - The amounts the server accepts
 * @param {(value: number) => void} [onChange]
 */
export function renderBetPresets(
  panel,
  range,
  onChange = (value) => {
    panel.betAmount = value;
  },
) {
  // Raise amounts are street totals. Call first, then raise by a fraction
  // of all chips in play, including that call and folded players' bets.
  const { min, max } = range;
  const toCall = Math.max(0, panel.currentBet - panel.myBet);
  const potAfterCall = panel.totalPot + toCall;
  const presets =
    panel.phase === "preflop" && panel.currentBet <= panel.bigBlind
      ? [
          { label: "Min", raw: min },
          { label: "2.5 BB", raw: Math.round(2.5 * panel.bigBlind) },
          { label: "3 BB", raw: 3 * panel.bigBlind },
          { label: "Max", raw: max },
        ]
      : [
          { label: "Min", raw: min },
          {
            label: "½ Pot",
            raw: panel.currentBet + Math.round(potAfterCall / 2),
          },
          { label: "Pot", raw: panel.currentBet + potAfterCall },
          { label: "Max", raw: max },
        ];
  return html`
    <div class="bet-presets">
      ${presets.map(
        ({ label, raw }) => html`
          <button
            type="button"
            class="button button--muted button--full-width"
            ?disabled=${raw > max}
            @click=${() => {
              onChange(snapToStep(raw, range));
            }}
          >
            <span class="pixel-label">${label}</span>
          </button>
        `,
      )}
    </div>
  `;
}
