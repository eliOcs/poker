import { LitElement } from "lit";
import { designTokens, baseStyles, actionPanelStyles } from "./styles.js";
import { getChipDenomination } from "/src/shared/stakes.js";
import { actionPanelExtraStyles } from "./action-panel-local.styles.js";
import { renderActionPanel } from "./action-panel-render.js";
import "./button.js";
import "./currency-slider.js";
import "./card.js";

class ActionPanel extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      actionPanelStyles,
      actionPanelExtraStyles,
    ];
  }

  static get properties() {
    return {
      actions: { type: Array },
      seatIndex: { type: Number },
      betAmount: { type: Number },
      smallBlind: { type: Number },
      bigBlind: { type: Number },
      seatedCount: { type: Number },
      bustedPosition: { type: Number },
      isWinner: { type: Boolean },
      canSit: { type: Boolean },
      buyIn: { type: Number },
      pot: { type: Number },
    };
  }

  constructor() {
    super();
    this.actions = [];
    this.seatIndex = -1;
    this.betAmount = 0;
    this.smallBlind = 1;
    this.bigBlind = 1;
    this.seatedCount = 0;
    this.bustedPosition = null;
    this.isWinner = false;
    this.canSit = false;
    this.buyIn = 0;
    this.pot = 0;
    this._lastActionType = null;
    this._lastActionTime = 0;
  }

  get chipDenomination() {
    return getChipDenomination(this.smallBlind, this.bigBlind);
  }

  updated(changedProperties) {
    if (changedProperties.has("actions")) {
      // Reset throttle when actions change (new turn/round from server)
      this._lastActionTime = 0;
      // Detect action type to reset betAmount when context changes
      const actionTypes = this.actions?.map((a) => a.action) || [];
      const currentType = actionTypes.includes("buyIn")
        ? "buyIn"
        : actionTypes.includes("bet") || actionTypes.includes("raise")
          ? "betting"
          : "other";

      if (this._lastActionType && this._lastActionType !== currentType) {
        this.betAmount = 0;
      }
      this._lastActionType = currentType;
    }
  }

  sendAction(action) {
    const now = Date.now();
    if (now - this._lastActionTime < 100) return;
    this._lastActionTime = now;
    this.dispatchEvent(
      new CustomEvent("game-action", {
        detail: action,
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return renderActionPanel(this);
  }
}

customElements.define("phg-action-panel", ActionPanel);
