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
import { getChipDenomination } from "../shared/stakes.js";

const ACTIONS = ["Fold", "Call", "Raise"];
const ACTION_STYLES = ["danger", "success", "action"];

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
  };

  constructor() {
    super();
    this.user = undefined;
    this.scenario = undefined;
    this.rangeOpen = false;
    this.reset();
    this.busy = false;
    this.error = "";
  }

  get raiseTo() {
    return this.betAmount / this.scenario.blinds.big;
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
  }

  /** @param {string} path @param {object} [body] */
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
    this.busy = true;
    this.error = "";
    try {
      const scenario = await this.request("scenario");
      this.scenario = scenario;
      this.reset();
    } catch (error) {
      if (error.name !== "AbortError") this.error = error.message;
    } finally {
      this.busy = false;
    }
  }

  reset() {
    this.frequencies = initialFrequencies();
    this.betAmount = 0;
    this.sizing = false;
    this.result = undefined;
  }

  updated(changed) {
    if (changed.get("rangeOpen") === true && !this.rangeOpen) {
      /** @type {HTMLElement | null} */ (
        this.querySelector(".learn-details-button")
      )?.focus();
    }
  }

  async submit() {
    if (this.busy) return;
    this.busy = true;
    this.error = "";
    try {
      this.result = await this.request("evaluate", {
        id: this.scenario.id,
        frequencies: this.frequencies,
        raiseTo: this.raiseTo,
      });
    } catch (error) {
      if (error.name !== "AbortError") this.error = error.message;
    } finally {
      this.busy = false;
    }
  }

  renderChoices() {
    const raising = (this.frequencies[2] ?? 0) > 0;
    return html`<div class="learn-question">
        <h2>How would you play this hand?</h2>
        ${renderTooltip({
          id: "learn-mix-help",
          triggerLabel: "How to mix your actions",
          content: html`Slide to mix your actions. They always add up to 100%.`,
        })}
      </div>
      <div class="betting-panel">
        ${ACTIONS.map(
          (action, i) =>
            html` <phg-currency-slider
              .handleLabel=${action}
              .label=${action}
              .variant=${ACTION_STYLES[i]}
              .value=${this.frequencies[i]}
              .min=${0}
              .max=${100}
              .step=${5}
              @value-changed=${(event) => {
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
            this.betAmount = this.scenario.minRaiseTo;
            this.sizing = true;
          } else this.submit();
        }}
      >
        ${raising ? "Continue" : "Check strategy"}
      </button>`;
  }

  renderSizing() {
    const { small, big } = this.scenario.blinds;
    const hero = this.scenario.seats.find((seat) => seat.isCurrentPlayer);
    const min = this.scenario.minRaiseTo;
    const max = hero.stack + hero.bet;
    const setAmount = (amount) => {
      this.betAmount = amount;
    };
    return html`<h2 class="learn-question">How much would you raise to?</h2>
      <div class="betting-panel">
        ${renderBetPresets(
          {
            phase: "preflop",
            bigBlind: big,
            currentBet: this.scenario.currentBet,
            myBet: hero.bet,
            totalPot: this.scenario.seats.reduce(
              (sum, seat) => sum + seat.bet,
              0,
            ),
          },
          min,
          max,
          setAmount,
        )}
        <phg-currency-slider
          .label=${"Raise to ($)"}
          .value=${this.betAmount}
          .min=${min}
          .max=${max}
          .step=${getChipDenomination(small, big)}
          @value-changed=${(event) => {
            setAmount(event.detail.value);
          }}
        ></phg-currency-slider>
      </div>
      <button class="button button--primary" @click=${() => this.submit()}>
        Check strategy
      </button>`;
  }

  render() {
    return html`${renderInfoBar(this.scenario, "learn")}
      ${this.scenario
        ? html` <phg-table-layout>
            <div class="table-surface">
              <div id="seats" data-table-size="6">
                ${this.scenario.seats.map(
                  (seat, i) =>
                    html` <phg-seat
                      data-seat=${i}
                      data-slot=${visualSeat(i, this.scenario.seats)}
                      data-table-size="6"
                      .seat=${seat.isCurrentPlayer && this.user
                        ? {
                            ...seat,
                            player: {
                              id: this.user.id,
                              name: this.user.name ?? seat.player.name,
                            },
                          }
                        : seat}
                      .avatar=${seat.isCurrentPlayer
                        ? this.user?.settings.avatar
                        : undefined}
                      title=${seat.player.name}
                      .seatNumber=${i}
                      .isButton=${i === 3}
                      .noAnimation=${true}
                      .settingsEnabled=${!!this.user}
                    ></phg-seat>`,
                )}
              </div>
            </div>
          </phg-table-layout>`
        : ""}
      <section
        class="table-action-panel learn-panel"
        aria-label="Your strategy"
        aria-busy=${this.busy}
      >
        ${this.error ? html`<p role="alert">${this.error}</p>` : ""}
        ${this.busy
          ? html`<p role="status">
              ${this.scenario ? "One moment…" : "Dealing your first hand…"}
            </p>`
          : this.result
            ? renderLearnFeedback(this)
            : this.scenario
              ? this.sizing
                ? this.renderSizing()
                : this.renderChoices()
              : html`<button class="button" @click=${() => this.nextHand()}>
                  Try again
                </button>`}
      </section>`;
  }
}
customElements.define("phg-learn", Learn);
