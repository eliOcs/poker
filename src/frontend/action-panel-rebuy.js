import { html } from "lit";

export function renderRebuyDecision(panel) {
  return html`
    <div class="action-row game-action-row">
      <phg-button
        variant="muted"
        full-width
        @click=${() => panel.sendAction({ action: "leave" })}
        >Leave</phg-button
      >
      <phg-button
        variant="success"
        full-width
        @click=${() => panel.sendAction({ action: "rebuy" })}
        >Rebuy</phg-button
      >
    </div>
  `;
}
