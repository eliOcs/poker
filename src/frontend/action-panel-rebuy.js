import { html } from "lit";

export function renderRebuyDecision(panel) {
  return html`
    <div class="action-row game-action-row">
      <button
        type="button"
        class="button button--muted button--full-width"
        @click=${() => panel.sendAction({ action: "leave" })}
      >
        Leave
      </button>
      <button
        type="button"
        class="button button--success button--full-width"
        @click=${() => panel.sendAction({ action: "rebuy" })}
      >
        Rebuy
      </button>
    </div>
  `;
}
