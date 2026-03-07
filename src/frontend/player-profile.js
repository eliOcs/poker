import { html, css, LitElement } from "lit";
import { designTokens, baseStyles, formatCurrency } from "./styles.js";

class PlayerProfile extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          min-height: 100%;
          display: grid;
          place-items: center;
          padding: clamp(12px, 3vw, 32px);
          box-sizing: border-box;
          background: var(--color-bg-medium);
          color: var(--color-fg-medium);
        }

        .panel {
          width: min(760px, 100%);
          max-width: 100%;
          display: grid;
          gap: 16px;
          padding: clamp(18px, 4vw, 28px);
          box-sizing: border-box;
          border: var(--space-sm) solid var(--color-fg-muted);
          background: var(--color-bg-light);
          box-shadow: var(--space-md) var(--space-md) 0 var(--color-bg-dark);
        }

        .eyebrow {
          font-size: var(--font-sm);
          color: var(--color-primary);
        }

        .header {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 16px;
        }

        .identity {
          display: grid;
          gap: 8px;
        }

        h1 {
          margin: 0;
          font-size: clamp(18px, 3vw, 28px);
          line-height: 1.4;
          color: var(--color-fg-white);
        }

        .player-id {
          font-size: var(--font-sm);
          line-height: 1.8;
          color: var(--color-fg-muted);
          word-break: break-all;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          box-sizing: border-box;
          border: 2px solid var(--color-fg-muted);
          background: var(--color-bg-medium);
          color: var(--color-success);
          font-size: var(--font-sm);
          white-space: nowrap;
        }

        .status.offline {
          color: var(--color-primary);
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .stat {
          display: grid;
          gap: 8px;
          padding: 14px;
          border: 2px solid var(--color-bg-dark);
          background: var(--color-bg-medium);
          min-height: 72px;
          align-content: start;
        }

        .label {
          font-size: var(--font-sm);
          color: var(--color-fg-muted);
          line-height: 1.6;
        }

        .value {
          font-size: var(--font-lg);
          line-height: 1.7;
          color: var(--color-fg-white);
        }

        .value.positive {
          color: var(--color-success);
        }

        .value.negative {
          color: var(--color-error);
        }

        .loading {
          text-align: center;
          font-size: var(--font-md);
          color: var(--color-fg-medium);
        }

        @media (width < 800px) {
          :host {
            place-items: start center;
          }

          .header {
            grid-template-columns: 1fr;
            display: grid;
          }

          .summary {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (width < 520px) {
          :host {
            padding: var(--space-md);
          }

          .panel {
            gap: 12px;
            padding: var(--space-md);
            width: 100%;
          }

          .status {
            width: 100%;
            justify-content: center;
            white-space: normal;
            text-align: center;
            line-height: 1.6;
          }

          .summary {
            grid-template-columns: 1fr;
            gap: var(--space-md);
          }

          .stat {
            min-height: 0;
            padding: 12px;
          }
        }
      `,
    ];
  }

  static get properties() {
    return {
      profile: { type: Object },
    };
  }

  constructor() {
    super();
    this.profile = null;
  }

  render() {
    if (!this.profile) {
      return html`<div class="panel">
        <div class="loading">Loading player...</div>
      </div>`;
    }

    return html`
      <section class="panel">
        <div class="eyebrow">Player Profile</div>
        <div class="header">
          <div class="identity">
            <h1>${this.profile.name}</h1>
            <div class="player-id">Player ID: ${this.profile.id}</div>
          </div>
          <div class=${`status ${this.profile.online ? "" : "offline"}`}>
            ${this.profile.online
              ? "Online"
              : `Last seen ${formatDate(this.profile.lastSeenAt)}`}
          </div>
        </div>
        <div class="summary">
          <article class="stat">
            <div class="label">Total Net Winnings</div>
            <div
              class=${`value ${getResultClass(this.profile.totalNetWinnings)}`}
            >
              ${formatSignedCurrency(this.profile.totalNetWinnings)}
            </div>
          </article>
          <article class="stat">
            <div class="label">Total Hands</div>
            <div class="value">${formatNumber(this.profile.totalHands)}</div>
          </article>
          <article class="stat">
            <div class="label">Joined</div>
            <div class="value">${formatDate(this.profile.joinedAt)}</div>
          </article>
        </div>
      </section>
    `;
  }
}

/**
 * @param {number} amount
 * @returns {string}
 */
function formatSignedCurrency(amount) {
  if (amount === 0) return formatCurrency(0);
  return `${amount > 0 ? "+" : "-"}${formatCurrency(Math.abs(amount))}`;
}

/**
 * @param {number} value
 * @returns {string}
 */
function getResultClass(value) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "";
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * @param {string|null|undefined} value
 * @returns {string}
 */
function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

customElements.define("phg-player-profile", PlayerProfile);
