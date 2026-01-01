import * as COLORS from "./colors.js";
import { html, css, unsafeCSS, LitElement } from "lit";

class ActionPanel extends LitElement {
  static get styles() {
    return css`
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 10px;
        flex-wrap: wrap;
        border: 4px solid ${unsafeCSS(COLORS.fgDark)};
        background-color: ${unsafeCSS(COLORS.bgLight)};
        box-shadow: 4px 4px 0 ${unsafeCSS(COLORS.bgDark)};
        font-family: "Press Start 2P", monospace;
        box-sizing: border-box;
      }

      button {
        padding: 8px 16px;
        font-family: "Press Start 2P", monospace;
        font-size: 0.6em;
        cursor: pointer;
        border: 3px solid ${unsafeCSS(COLORS.bgDark)};
        box-shadow:
          3px 3px 0 ${unsafeCSS(COLORS.bgDark)},
          inset -2px -2px 0 rgba(0, 0, 0, 0.2),
          inset 2px 2px 0 rgba(255, 255, 255, 0.2);
      }

      button:active {
        box-shadow:
          1px 1px 0 ${unsafeCSS(COLORS.bgDark)},
          inset 2px 2px 0 rgba(0, 0, 0, 0.2),
          inset -2px -2px 0 rgba(255, 255, 255, 0.2);
        transform: translate(2px, 2px);
      }

      button.fold {
        background-color: ${unsafeCSS(COLORS.red)};
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      button.check,
      button.call {
        background-color: ${unsafeCSS(COLORS.greenLight)};
        color: ${unsafeCSS(COLORS.bgDark)};
      }

      button.bet,
      button.raise {
        background-color: ${unsafeCSS(COLORS.blue)};
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      button.all-in {
        background-color: ${unsafeCSS(COLORS.gold)};
        color: ${unsafeCSS(COLORS.bgDark)};
      }

      button.buy-in {
        background-color: ${unsafeCSS(COLORS.purple)};
        color: ${unsafeCSS(COLORS.fgWhite)};
      }

      button.start {
        background-color: ${unsafeCSS(COLORS.gold)};
        color: ${unsafeCSS(COLORS.bgDark)};
        font-size: 0.7em;
        padding: 12px 24px;
      }

      .amount-input {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .amount-input button {
        min-width: 11ch;
        text-align: center;
      }

      .amount-input input[type="range"] {
        width: 100px;
        height: 8px;
        appearance: none;
        background: ${unsafeCSS(COLORS.bgDisabled)};
        border: 2px solid ${unsafeCSS(COLORS.bgDark)};
      }

      .amount-input input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 16px;
        height: 16px;
        background: ${unsafeCSS(COLORS.gold)};
        border: 2px solid ${unsafeCSS(COLORS.bgDark)};
        cursor: pointer;
      }

      .amount-display {
        min-width: 60px;
        text-align: center;
        font-size: 0.6em;
        color: ${unsafeCSS(COLORS.gold)};
      }

      .waiting {
        color: ${unsafeCSS(COLORS.fgDark)};
        font-size: 0.6em;
      }
    `;
  }

  static get properties() {
    return {
      actions: { type: Array },
      seatIndex: { type: Number },
      betAmount: { type: Number },
    };
  }

  constructor() {
    super();
    this.actions = [];
    this.seatIndex = -1;
    this.betAmount = 0;
  }

  sendAction(action) {
    this.dispatchEvent(
      new CustomEvent("game-action", {
        detail: action,
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    if (!this.actions || this.actions.length === 0) {
      return html`<span class="waiting">Waiting for your turn...</span>`;
    }

    const result = [];

    for (const action of this.actions) {
      switch (action.action) {
        case "buyIn":
          result.push(html`
            <div class="amount-input">
              <input
                type="range"
                min="${action.min}"
                max="${action.max}"
                .value="${this.betAmount || action.min}"
                @input=${(e) => (this.betAmount = parseInt(e.target.value))}
              />
              <span class="amount-display"
                >$${this.betAmount || action.min}</span
              >
              <button
                class="buy-in"
                @click=${() =>
                  this.sendAction({
                    action: "buyIn",
                    seat: this.seatIndex,
                    amount: this.betAmount || action.min,
                  })}
              >
                Buy In
              </button>
            </div>
          `);
          break;

        case "check":
          result.push(html`
            <button
              class="check"
              @click=${() =>
                this.sendAction({ action: "check", seat: this.seatIndex })}
            >
              Check
            </button>
          `);
          break;

        case "call":
          result.push(html`
            <button
              class="call"
              @click=${() =>
                this.sendAction({ action: "call", seat: this.seatIndex })}
            >
              Call $${action.amount}
            </button>
          `);
          break;

        case "fold":
          result.push(html`
            <button
              class="fold"
              @click=${() =>
                this.sendAction({ action: "fold", seat: this.seatIndex })}
            >
              Fold
            </button>
          `);
          break;

        case "bet": {
          const betValue = this.betAmount || action.min;
          const isAllIn = betValue >= action.max;
          result.push(html`
            <div class="amount-input">
              <input
                type="range"
                min="${action.min}"
                max="${action.max}"
                .value="${betValue}"
                @input=${(e) => (this.betAmount = parseInt(e.target.value))}
              />
              <span class="amount-display">$${betValue}</span>
              <button
                class="${isAllIn ? "all-in" : "bet"}"
                @click=${() =>
                  this.sendAction(
                    isAllIn
                      ? { action: "allIn", seat: this.seatIndex }
                      : {
                          action: "bet",
                          seat: this.seatIndex,
                          amount: betValue,
                        },
                  )}
              >
                ${isAllIn ? "All-In" : "Bet"}
              </button>
            </div>
          `);
          break;
        }

        case "raise": {
          const raiseValue = this.betAmount || action.min;
          const isAllIn = raiseValue >= action.max;
          result.push(html`
            <div class="amount-input">
              <input
                type="range"
                min="${action.min}"
                max="${action.max}"
                .value="${raiseValue}"
                @input=${(e) => (this.betAmount = parseInt(e.target.value))}
              />
              <span class="amount-display">$${raiseValue}</span>
              <button
                class="${isAllIn ? "all-in" : "raise"}"
                @click=${() =>
                  this.sendAction(
                    isAllIn
                      ? { action: "allIn", seat: this.seatIndex }
                      : {
                          action: "raise",
                          seat: this.seatIndex,
                          amount: raiseValue,
                        },
                  )}
              >
                ${isAllIn ? "All-In" : "Raise to"}
              </button>
            </div>
          `);
          break;
        }

        case "start":
          result.push(html`
            <button
              class="start"
              @click=${() => this.sendAction({ action: "start" })}
            >
              Start Game
            </button>
          `);
          break;
      }
    }

    return result;
  }
}

customElements.define("phg-action-panel", ActionPanel);
