import { html } from "lit";
import { renderModal } from "./modal.js";
import { ICONS } from "./icons.js";

const ACTIONS = ["Fold", "Call", "Raise"];
const POSITION_NAMES = {
  LJ: "Under the Gun (UTG)",
  HJ: "Under the Gun +1 (UTG+1)",
  CO: "Cutoff",
  BTN: "Button",
  SB: "Small Blind",
};
const POSITION_CHARACTERISTICS = {
  LJ: "Early position",
  HJ: "Middle position",
  CO: "Late position",
  BTN: "Late position",
  SB: "Small blind",
};
const RANKS = [..."AKQJT98765432"];
const HAND_ORDER = RANKS.flatMap((rank, row) =>
  RANKS.map((other, column) => {
    if (row === column) return rank + other;
    return row < column ? rank + other + "s" : other + rank + "o";
  }),
);

export function renderLearnFeedback(view) {
  const result = view.result;
  const comparing = !result.distributionMatch || result.sizingMatch === false;
  const labels = { correct: "Correct", close: "Close", incorrect: "Incorrect" };
  const icons = {
    correct: ICONS.check,
    close: ICONS.minus,
    incorrect: ICONS.close,
  };
  return html` <div role="status">
      <h2 class=${`learn-grade learn-grade--${result.grade}`}>
        ${icons[result.grade]} ${labels[result.grade]}
      </h2>
    </div>
    <div class="learn-strategies">
      ${renderStrategyBlock(
        "Recommended",
        view.scenario.hand,
        result.expected,
        result.raiseTo,
        comparing,
      )}
      ${comparing
        ? renderStrategyBlock(
            "Your strategy",
            view.scenario.hand,
            view.frequencies,
            view.raiseTo,
          )
        : ""}
    </div>
    <div class="action-row">
      <button
        class="button learn-details-button"
        aria-haspopup="dialog"
        @click=${() => {
          view.rangeOpen = true;
        }}
      >
        Details
      </button>
      <button class="button button--primary" @click=${() => view.nextHand()}>
        Next hand
      </button>
    </div>
    ${view.rangeOpen
      ? renderModal(
          `Range: Preflop, First In, ${POSITION_NAMES[view.scenario.position]}`,
          () => view.closeRange(),
          renderRangeDetails(view),
        )
      : ""}`;
}

function rangeBackground(values) {
  const [fold = 0, call = 0] = values;
  return `background: linear-gradient(to right, var(--color-error) ${fold}%, var(--color-success) ${fold}% ${fold + call}%, var(--color-accent) ${fold + call}%)`;
}

function renderStrategyBlock(
  label,
  hand,
  frequencies,
  raiseTo,
  showTitle = true,
) {
  return html`<section class="learn-strategy" aria-label=${label}>
    ${showTitle ? html`<h3>${label}</h3>` : ""}
    <div
      class="learn-strategy-block"
      style=${rangeBackground(frequencies)}
      aria-hidden="true"
    >
      ${hand}
    </div>
    <ul class="learn-strategy-actions">
      ${frequencies.map((frequency, index) =>
        frequency > 0
          ? html`<li>
              <i
                class=${["legend-fold", "legend-call", "legend-raise"][index]}
                aria-hidden="true"
              ></i
              >${ACTIONS[index]} ${frequency}%
            </li>`
          : "",
      )}
    </ul>
    ${frequencies[2] > 0 ? html`<p>Raise to ${raiseTo} BB</p>` : ""}
  </section>`;
}

// Current reference: Modern Poker Theory, Michael Acevedo, chapter 5.
// Position -> Hand Range / PDF page: LJ 47/200, HJ 42/194, CO 38/189,
// BTN 35/185, SB 32/182. General heuristics: PDF 177–179; opening sizes: PDF 181.
// Player-facing GTO guidance paraphrases the conclusion on PDF page 136.
// Calibration: 100 BB, 5% rake capped at $3; chart estimates rounded to 5 points.
// Mix grading tolerates 15 points per action, not an EV-loss estimate. Nearby
// bet sizes may also be reasonable. See doc/learn.md for these source assumptions.
// Keep provenance here and in doc/learn.md for verification, not in the UI:
// future strategies may come from another source or our own solver.
function renderRangeDetails(view) {
  const result = view.result;
  return html` <div class="learn-range-details" tabindex="-1" autofocus>
    <div class="learn-range-legend" aria-label="Range legend">
      <span><i class="legend-fold" aria-hidden="true"></i>Fold</span>
      <span><i class="legend-call" aria-hidden="true"></i>Call</span>
      <span><i class="legend-raise" aria-hidden="true"></i>Raise</span>
      <span><i class="legend-selected" aria-hidden="true"></i>Your hand</span>
    </div>
    <div class="learn-range">
      ${HAND_ORDER.map((hand) => {
        const values = result.hands[hand];
        return html`<span
          class=${hand === view.scenario.hand ? "selected" : ""}
          title=${`${hand}: ${ACTIONS.map((a, i) => `${a} ${values[i]}%`).join(", ")}`}
          style=${rangeBackground(values)}
          >${hand}</span
        >`;
      })}
    </div>
    <h2>Your cards</h2>
    <ul class="learn-card-factors">
      ${result.playability.cards.map(
        (factor) =>
          html`<li>
            <strong>${factor.title}</strong>
            <p>${factor.text}</p>
          </li>`,
      )}
    </ul>
    <h2>This situation</h2>
    <ul class="learn-card-factors">
      <li>
        <strong>${POSITION_CHARACTERISTICS[view.scenario.position]}</strong>
        <p>${result.explanation}</p>
      </li>
      ${result.playability.situation.map(
        (factor) =>
          html` <li>
            <strong>${factor.title}</strong>
            <p>${factor.text}</p>
          </li>`,
      )}
    </ul>
    <p class="learn-disclaimer">
      This range is a balanced starting point against opponents who play
      optimally. It aims to make your play hard to exploit, but adapting to an
      opponent’s mistakes can be more profitable.
    </p>
  </div>`;
}
