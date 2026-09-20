import { html } from "lit";
import { renderModal } from "./modal.js";
import { ICONS } from "./icons.js";
import { formatAmount } from "./currency.js";
import "./card.js";

import { DEFAULT_LEARN_ACTIONS, LEARN_ACTIONS } from "./learn-actions.js";
/**
 * @typedef {import('./learn.js').Learn} Learn
 * @typedef {import('../backend/learn-types.js').LearnScenario} LearnScenario
 * @typedef {import('../backend/learn-types.js').LearnEvaluation} LearnEvaluation
 * @typedef {import('../backend/learn-types.js').HandClass} HandClass
 * @typedef {import('../backend/learn-types.js').LearnAction} LearnAction
 * @typedef {import('../backend/learn-types.js').Frequencies} Frequencies
 * @typedef {import('../backend/learn-types.js').OpponentRange} OpponentRange
 */
/** @satisfies {Record<import('../backend/learn-types.js').Position, string>} */
const POSITION_NAMES = {
  LJ: "Under the Gun (UTG)",
  HJ: "Under the Gun +1 (UTG+1)",
  CO: "Cutoff",
  BTN: "Button",
  SB: "Small Blind",
  BB: "Big Blind",
};
/** @type {Partial<Record<import("../backend/learn-types.js").Position, string>>} */
const POSITION_CHARACTERISTICS = {
  LJ: "Early position",
  HJ: "Middle position",
  CO: "Late position",
  BTN: "Late position",
  SB: "Small blind",
};
const RANKS = /** @type {import("../backend/poker/deck.js").Rank[]} */ ([
  ..."AKQJT98765432",
]);
/** @type {HandClass[]} */
const HAND_ORDER = RANKS.flatMap((rank, row) =>
  RANKS.map(
    /** @returns {HandClass} */ (other, column) => {
      if (row === column) return /** @type {HandClass} */ (`${rank}${other}`);
      return /** @type {HandClass} */ (
        row < column ? `${rank}${other}s` : `${other}${rank}o`
      );
    },
  ),
);

/** @param {Learn} view @param {LearnScenario} scenario @param {LearnEvaluation} result */
export function renderLearnFeedback(view, scenario, result) {
  const actions = result.actions;
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
      ${renderStrategy(
        "Recommended",
        result.expected,
        formatAmount(
          result.raiseTo * scenario.blinds.big,
          view.displayBigBlind,
        ),
        comparing,
        actions,
      )}
      ${comparing
        ? renderStrategy(
            "Your strategy",
            view.frequencies,
            formatAmount(view.betAmount, view.displayBigBlind),
            true,
            actions,
          )
        : ""}
    </div>
    <div class="action-row">
      <button
        class="button learn-details-button"
        aria-haspopup="dialog"
        @click=${() => {
          view.dispatchEvent(
            new CustomEvent("open-details", { bubbles: true }),
          );
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
          `Range: Preflop, ${scenario.title}, ${POSITION_NAMES[scenario.position]}`,
          () =>
            view.dispatchEvent(
              new CustomEvent("close-details", { bubbles: true }),
            ),
          renderRangeDetails(view, scenario, result),
        )
      : ""}`;
}

/** @param {Frequencies} values @param {LearnAction[]} actions */
function rangeBackground(values, actions) {
  const fold = values[actions.indexOf("fold")] ?? 0;
  const call =
    values[actions.indexOf("call")] ?? values[actions.indexOf("check")] ?? 0;
  return `background: linear-gradient(to right, var(--color-error) ${fold}%, var(--color-success) ${fold}% ${fold + call}%, var(--color-accent) ${fold + call}%)`;
}

/** @param {import("../backend/learn-types.js").Percentage} frequency @param {LearnAction} action */
function renderFrequency(frequency, action) {
  return html`<span class="learn-frequency">
    <i
      class=${`legend-${LEARN_ACTIONS[action].legend}`}
      style=${`width: ${frequency}%`}
      aria-hidden="true"
    ></i>
    <span class="pixel-label">${frequency}%</span>
  </span>`;
}

/**
 * @param {string} label
 * @param {Frequencies} frequencies
 * @param {string} raiseTo Formatted display amount, including units.
 * @param {boolean} [showTitle]
 * @param {LearnAction[]} [actions]
 */
function renderStrategy(
  label,
  frequencies,
  raiseTo,
  showTitle = true,
  actions = DEFAULT_LEARN_ACTIONS,
) {
  return html`<section class="learn-strategy" aria-label=${label}>
    ${showTitle ? html`<h3>${label}</h3>` : ""}
    <ul class="learn-strategy-actions">
      ${frequencies.map((frequency, index) =>
        frequency > 0
          ? html`<li>
              <span class="pixel-label"
                >${LEARN_ACTIONS[/** @type {LearnAction} */ (actions[index])]
                  .label}</span
              >
              ${renderFrequency(
                frequency,
                /** @type {LearnAction} */ (actions[index]),
              )}
            </li>`
          : "",
      )}
    </ul>
    ${(frequencies[actions.indexOf("raise")] ?? 0) > 0
      ? html`<p>Raise to ${raiseTo}</p>`
      : ""}
  </section>`;
}

/** @param {Learn} view @param {LearnScenario} scenario @param {LearnEvaluation} result */
function renderOpponentRange(view, scenario, result) {
  const range = result.opponentRange;
  if (!range) return "";
  const raiseTo = formatAmount(
    range.raiseTo * scenario.blinds.big,
    view.displayBigBlind,
  );
  const maxProbability = Math.max(
    ...Object.values(range.hands).map((hand) => hand.probability),
  );
  return html`<section
    class="learn-opponent-range"
    aria-labelledby="learn-opponent-heading"
  >
    <h2 id="learn-opponent-heading">
      Oponent range: ${POSITION_NAMES[range.position]}, ${range.action} to
      ${raiseTo}
    </h2>
    <div class="learn-range-legend" aria-label="Opponent range legend">
      <span><i class="legend-likely" aria-hidden="true"></i>More likely</span>
      <span><i class="legend-unlikely" aria-hidden="true"></i>Less likely</span>
      <span
        ><i class="legend-unavailable" aria-hidden="true"></i>Not in range</span
      >
    </div>
    <div class="learn-range" role="group" aria-label="Opponent range chart">
      ${HAND_ORDER.map((hand) =>
        renderOpponentHand(hand, range, maxProbability),
      )}
    </div>
    ${range.notes?.length
      ? html`<ul class="learn-card-factors">
          ${range.notes.map(
            (note) =>
              html`<li>
                <strong>${note.title}</strong>
                <p>${note.text}</p>
              </li>`,
          )}
        </ul>`
      : ""}
  </section>`;
}

/** @param {HandClass} hand @param {OpponentRange} range @param {number} maxProbability */
function renderOpponentHand(hand, range, maxProbability) {
  const entry =
    /** @type {import("../backend/learn-types.js").OpponentHand} */ (
      range.hands[hand]
    );
  if (entry.probability === 0) {
    return html`<span
      class="legend-unavailable"
      title=${`${hand}: Not in range`}
      >${hand}</span
    >`;
  }
  const {
    probability,
    frequency,
    combinations,
    blockedCombinations,
    openingFrequency,
  } = entry;
  const percent = probability.toFixed(2);
  const likelihood =
    maxProbability > 0 ? (100 * probability) / maxProbability : 0;
  const id = `learn-opponent-${hand}`;
  return html`<div class="learn-opponent-cell">
    <button
      type="button"
      aria-label=${`${hand}: ${percent}% probability`}
      aria-describedby=${id}
      style=${`background: color-mix(in srgb, var(--color-success) ${likelihood}%, var(--color-error))`}
      @pointerenter=${showOpponentHand}
      @focus=${showOpponentHand}
      @click=${showOpponentHand}
      @pointerleave=${(/** @type {PointerEvent} */ event) => {
        const button = /** @type {HTMLElement} */ (event.currentTarget);
        if (!button.matches(":focus")) hideOpponentHand(event);
      }}
      @blur=${hideOpponentHand}
      @keydown=${(/** @type {KeyboardEvent} */ event) => {
        const button = /** @type {HTMLElement} */ (event.currentTarget);
        const tooltip = /** @type {HTMLElement} */ (button.nextElementSibling);
        if (event.key === "Escape" && tooltip.matches(":popover-open")) {
          event.stopPropagation();
          event.preventDefault();
          hideOpponentHand(event);
        }
      }}
    >
      ${hand}
    </button>
    <div id=${id} class="learn-hand-info" popover="auto" role="tooltip">
      <strong>${hand}: ${percent}% probability</strong>
      <p>
        ${combinations} available
        ${combinations === 1
          ? "combination"
          : "combinations"}${blockedCombinations > 0
          ? " after removing your cards"
          : ""}.
      </p>
      ${openingFrequency !== undefined
        ? html`<p>
            ${range.openingAction ?? "Open"} frequency: ${openingFrequency}%.
          </p>`
        : ""}
      <p>
        ${range.action}
        frequency${openingFrequency !== undefined
          ? range.openingAction === "Limp"
            ? " after limping"
            : " after opening"
          : ""}:
        ${frequency}%.
      </p>
    </div>
  </div>`;
}

/** @param {Event} event */
function showOpponentHand(event) {
  const button = /** @type {HTMLElement} */ (event.currentTarget);
  const tooltip = /** @type {HTMLElement} */ (button.nextElementSibling);
  tooltip.showPopover();
  const rect = button.getBoundingClientRect();
  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;
  tooltip.style.left = `${Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8))}px`;
  const top = rect.top >= height + 8 ? rect.top - height - 8 : rect.bottom + 8;
  tooltip.style.top = `${Math.max(8, Math.min(top, window.innerHeight - height - 8))}px`;
}

/** @param {Event} event */
function hideOpponentHand(event) {
  const button = /** @type {HTMLElement} */ (event.currentTarget);
  /** @type {HTMLElement} */ (button.nextElementSibling).hidePopover();
}

// Current reference: Modern Poker Theory, Michael Acevedo, chapter 5.
// Position -> Hand Range / PDF page: LJ 47/200, HJ 42/194, CO 38/189,
// BTN 35/185, SB 32/182. General heuristics: PDF 177–179; opening sizes: PDF 181.
// Follow-ups: SB 33/183 and 34/184; BTN 36/187 and 37/188;
// CO 39/191, 40/192 and 41/193 (position guidance on PDF 189–190).
// HJ 43/196, 44/197, 45/198 and 46/199 (position guidance on PDF 193–195).
// LJ 48/202, 49/203, 50/204, 51/205 and 52/206 (guidance on PDF 199–207).
// Player-facing GTO guidance paraphrases the conclusion on PDF page 136.
// Calibration: 100 BB, 5% rake capped at $3; chart estimates rounded to 5 points.
// Mix grading tolerates 15 points per action, not an EV-loss estimate. Nearby
// bet sizes may also be reasonable. See doc/learn.md for these source assumptions.
// Keep provenance here and in doc/learn.md for verification, not in the UI:
// future strategies may come from another source or our own solver.
/** @param {Learn} view @param {LearnScenario} scenario @param {LearnEvaluation} result */
function renderRangeDetails(view, scenario, result) {
  const actions = result.actions;
  const hero = /** @type {import("../backend/learn-types.js").LearnSeat} */ (
    scenario.seats.find((seat) => seat.isCurrentPlayer)
  );
  return html` <div class="learn-range-details" tabindex="-1" autofocus>
    <div class="learn-range-legend" aria-label="Range legend">
      ${actions.map(
        (action) =>
          html`<span
            ><i
              class=${`legend-${LEARN_ACTIONS[action].legend}`}
              aria-hidden="true"
            ></i
            >${LEARN_ACTIONS[action].label}</span
          >`,
      )}
      <span><i class="legend-selected" aria-hidden="true"></i>Your hand</span>
      ${Object.keys(result.hands).length < 169
        ? html`<span
            ><i class="legend-unavailable" aria-hidden="true"></i>Not in
            range</span
          >`
        : ""}
    </div>
    <div class="learn-range">
      ${HAND_ORDER.map((hand) => {
        const values = result.hands[hand];
        return html`<span
          class=${!values
            ? "legend-unavailable"
            : hand === scenario.hand
              ? "selected"
              : ""}
          title=${values
            ? `${hand}: ${actions
                .map((action, i) => {
                  const frequency = /** @type {number} */ (values[i]);
                  return `${LEARN_ACTIONS[action].label} ${frequency}%`;
                })
                .join(", ")}`
            : `${hand}: Not in range`}
          style=${values ? rangeBackground(values, actions) : ""}
          >${hand}</span
        >`;
      })}
    </div>
    <div class="learn-range-totals" role="group" aria-label="Range totals">
      ${actions.map(
        (action, i) =>
          html`<span class="learn-range-total"
            ><span class="pixel-label">${LEARN_ACTIONS[action].label}</span>
            ${renderFrequency(
              /** @type {number} */ (result.rangeTotals[i]),
              action,
            )}</span
          >`,
      )}
    </div>
    <h2>Your cards</h2>
    <div class="learn-hole-cards" role="group" aria-label="Your hole cards">
      ${hero.cards.map(
        (card) =>
          html`<phg-card .card=${card} noAnimation size="medium"></phg-card>`,
      )}
    </div>
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
    ${renderStrategy(
      "GTO strategy",
      result.expected,
      formatAmount(result.raiseTo * scenario.blinds.big, view.displayBigBlind),
      false,
      actions,
    )}
    <ul class="learn-card-factors">
      <li>
        <strong
          >${result.explanationTitle ??
          POSITION_CHARACTERISTICS[scenario.position]}</strong
        >
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
    ${result.lessonNotes?.length
      ? html`<section
          class="learn-strategy-notes"
          aria-labelledby="learn-takeaways-heading"
        >
          <h2 id="learn-takeaways-heading">Strategy takeaways</h2>
          <ul class="learn-card-factors">
            ${result.lessonNotes.map(
              (note) =>
                html`<li>
                  <strong>${note.title}</strong>
                  <p>${note.text}</p>
                </li>`,
            )}
          </ul>
        </section>`
      : ""}
    ${renderOpponentRange(view, scenario, result)}
    <p class="learn-disclaimer">
      This range is a balanced starting point against opponents who play
      optimally. It aims to make your play hard to exploit, but adapting to an
      opponent’s mistakes can be more profitable.
      ${result.opponentRange
        ? "Opponent probabilities use these assumptions, cover all remaining combinations of each hand, and are rounded."
        : ""}
    </p>
  </div>`;
}
