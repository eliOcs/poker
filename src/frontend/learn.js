import { getDisplayBigBlind } from "./currency.js";
import { html, LitElement } from "lit";
import { visualSeat } from "./table-layout.js";
import "./seat.js";
import "./board.js";
import "./currency-slider.js";
import { initialFrequencies, balanceFrequencies } from "./learn-frequencies.js";
import { renderLearnFeedback } from "./learn-feedback.js";
import { renderTooltip } from "./tooltip.js";
import { renderInfoBar } from "./game-info-bar.js";
import { renderBetPresets } from "./bet-presets.js";
import {
  startLearnReplay,
  stopLearnReplay,
  renderLearnReplay,
} from "./learn-replay.js";

import { DEFAULT_LEARN_ACTIONS, LEARN_ACTIONS } from "./learn-actions.js";

/**
 * @typedef {import('../backend/learn-types.js').LearnScenario} LearnScenario
 * @typedef {import('../backend/learn-types.js').LearnEvaluation} LearnEvaluation
 * @typedef {import('../backend/learn-types.js').LearnSubmission} LearnSubmission
 * @typedef {import('../backend/poker/types.js').Cents} Cents
 */

export class Learn extends LitElement {
  static properties = {
    user: { type: Object },
    scenario: { state: true },
    frequencies: { state: true },
    betAmount: { state: true },
    sizing: { state: true },
    result: { state: true },
    rangeOpen: { type: Boolean },
    busy: { state: true },
    error: { state: true },
    replayIndex: { state: true },
  };

  constructor() {
    super();
    /** @type {import("../backend/user.js").User | undefined} */
    this.user = undefined;
    /** @type {LearnScenario | undefined} */
    this.scenario = undefined;
    /** @type {number | undefined} */
    this.replayIndex = undefined;
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    this.replayTimer = undefined;
    this.rangeOpen = false;
    /** @type {Cents} */
    this.betAmount = 0;
    this.frequencies = initialFrequencies(this.actions.length);
    this.sizing = false;
    /** @type {LearnEvaluation | undefined} */
    this.result = undefined;
    this.busy = false;
    this.error = "";
  }

  /** @returns {Cents | undefined} */
  get displayBigBlind() {
    return getDisplayBigBlind(
      this.user?.settings,
      this.scenario?.blinds.big,
      true,
    );
  }

  get actions() {
    return this.scenario?.actions ?? DEFAULT_LEARN_ACTIONS;
  }

  get replayStep() {
    return this.replayIndex === undefined
      ? undefined
      : this.scenario?.replay[this.replayIndex];
  }

  get tableSeats() {
    return this.replayStep?.seats ?? this.scenario?.seats ?? [];
  }

  /** @returns {import("../backend/learn-types.js").BigBlinds} */
  get raiseTo() {
    return (
      this.betAmount / /** @type {LearnScenario} */ (this.scenario).blinds.big
    );
  }

  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    this.nextHand();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this._request?.abort();
    stopLearnReplay(this);
  }

  /**
   * @overload
   * @param {'scenario'} path
   * @returns {Promise<LearnScenario>}
   */
  /**
   * @overload
   * @param {'evaluate'} path
   * @param {LearnSubmission} body
   * @returns {Promise<LearnEvaluation>}
   */
  /**
   * @param {'scenario' | 'evaluate'} path
   * @param {LearnSubmission} [body]
   * @returns {Promise<LearnScenario | LearnEvaluation>}
   */
  async request(path, body = undefined) {
    this._request?.abort();
    this._request = new AbortController();
    const response = await fetch(`/api/learn/${path}`, {
      signal: this._request.signal,
      ...(body
        ? {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    });
    if (!response.ok)
      throw new Error("Could not reach the lesson. Please try again.");
    return response.json();
  }

  async nextHand() {
    stopLearnReplay(this);
    this.busy = true;
    this.error = "";
    try {
      const scenario = await this.request("scenario");
      if (!this.isConnected) return;
      this.scenario = scenario;
      this.reset();
      startLearnReplay(this);
    } catch (error) {
      if (error.name !== "AbortError") this.error = error.message;
    } finally {
      this.busy = false;
    }
  }

  reset() {
    this.frequencies = initialFrequencies(this.actions.length);
    this.betAmount = 0;
    this.sizing = false;
    this.result = undefined;
  }

  /** @param {import("lit").PropertyValues<Learn>} changed */
  updated(changed) {
    if (changed.get("rangeOpen") === true && !this.rangeOpen) {
      /** @type {HTMLElement | null} */ (
        this.querySelector(".learn-details-button")
      )?.focus();
    }
  }

  async submit() {
    if (this.busy || this.replayStep) return;
    this.busy = true;
    this.error = "";
    try {
      this.result = await this.request("evaluate", {
        id: /** @type {LearnScenario} */ (this.scenario).id,
        frequencies: this.frequencies,
        raiseTo: this.raiseTo,
      });
    } catch (error) {
      if (error.name !== "AbortError") this.error = error.message;
    } finally {
      this.busy = false;
    }
  }

  /** @param {LearnScenario} scenario */
  renderChoices(scenario) {
    const raising = (this.frequencies[this.actions.indexOf("raise")] ?? 0) > 0;
    return html`<div class="learn-question">
        <h2>How would you play this hand?</h2>
        ${renderTooltip({
          id: "learn-mix-help",
          triggerLabel: "How to mix your actions",
          content: html`Slide to mix your actions. They always add up to 100%.`,
        })}
      </div>
      <div class="betting-panel">
        ${this.actions.map(
          (action, i) =>
            html` <phg-currency-slider
              .handleLabel=${LEARN_ACTIONS[action].label}
              .label=${LEARN_ACTIONS[action].label}
              .variant=${LEARN_ACTIONS[action].variant}
              .value=${this.frequencies[i]}
              .min=${0}
              .max=${100}
              .step=${5}
              @value-changed=${(
                /** @type {CustomEvent<{value: number}>} */ event,
              ) => {
                this.frequencies = balanceFrequencies(
                  this.frequencies,
                  i,
                  event.detail.value,
                );
              }}
            ></phg-currency-slider>`,
        )}
      </div>
      <button
        class="button button--primary"
        @click=${() => {
          if (raising) {
            this.betAmount = scenario.minRaiseTo;
            this.sizing = true;
          } else this.submit();
        }}
      >
        ${raising ? "Continue" : "Check strategy"}
      </button>`;
  }

  /** @param {LearnScenario} scenario */
  renderSizing(scenario) {
    const { small, big } = scenario.blinds;
    const hero = /** @type {import("../backend/learn-types.js").LearnSeat} */ (
      scenario.seats.find((seat) => seat.isCurrentPlayer)
    );
    const min = scenario.minRaiseTo;
    const max = hero.stack + hero.bet;
    /** @param {Cents} amount */
    const setAmount = (amount) => {
      this.betAmount = amount;
    };
    return html`<h2 class="learn-question">How much would you raise to?</h2>
      <div class="betting-panel">
        ${renderBetPresets(
          {
            phase: "preflop",
            bigBlind: big,
            currentBet: scenario.currentBet,
            myBet: hero.bet,
            totalPot: scenario.seats.reduce((sum, seat) => sum + seat.bet, 0),
          },
          min,
          max,
          setAmount,
        )}
        <phg-currency-slider
          .label=${this.displayBigBlind ? "Raise to (BB)" : "Raise to ($)"}
          .displayBigBlind=${this.displayBigBlind}
          .value=${this.betAmount}
          .min=${min}
          .max=${max}
          .step=${small}
          @value-changed=${(
            /** @type {CustomEvent<{value: number}>} */ event,
          ) => {
            setAmount(event.detail.value);
          }}
        ></phg-currency-slider>
      </div>
      <button class="button button--primary" @click=${() => this.submit()}>
        Check strategy
      </button>`;
  }

  render() {
    const scenario = this.scenario;
    return html`${renderInfoBar(scenario, "learn")}
      ${
        scenario
          ? html` <phg-table-layout>
              <div class="table-surface">
                <div id="seats" data-table-size="6">
                  ${this.tableSeats.map(
                    (seat, i) =>
                      html` <phg-seat
                        data-seat=${i}
                        data-slot=${visualSeat(i, scenario.seats)}
                        data-table-size="6"
                        .seat=${
                          seat.isCurrentPlayer && this.user
                            ? {
                                ...seat,
                                player: {
                                  id: this.user.id,
                                  name: this.user.name ?? seat.player.name,
                                },
                              }
                            : seat
                        }
                        .avatar=${
                          seat.isCurrentPlayer
                            ? this.user?.settings.avatar
                            : undefined
                        }
                        title=${seat.player.name}
                        .displayBigBlind=${this.displayBigBlind}
                        .seatNumber=${i}
                        .isButton=${i === 3}
                        .noAnimation=${!this.replayStep}
                        .settingsEnabled=${!!this.user}
                      ></phg-seat>`,
                  )}
                </div>
              </div>
            </phg-table-layout>`
          : ""
      }
      <section
        class="table-action-panel learn-panel"
        aria-label="Your strategy"
        aria-busy=${this.busy}
      >
        ${this.error ? html`<p role="alert">${this.error}</p>` : ""}
        ${
          this.busy
            ? html`<p role="status">
                ${scenario ? "One moment…" : "Dealing your first hand…"}
              </p>`
            : this.replayStep
              ? renderLearnReplay(this, this.replayStep)
              : this.result
                ? renderLearnFeedback(
                    this,
                    /** @type {LearnScenario} */ (scenario),
                    this.result,
                  )
                : scenario
                  ? this.sizing
                    ? this.renderSizing(scenario)
                    : this.renderChoices(scenario)
                  : html`<button class="button" @click=${() => this.nextHand()}>
                      Try again
                    </button>`
        }
      </section>`;
  }
}
customElements.define("phg-learn", Learn);
