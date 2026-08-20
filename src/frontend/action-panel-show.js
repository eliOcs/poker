import { html } from "lit";

export function renderShowButtons(panel, actionMap) {
  const showActions = [
    { key: "showCard1", cards: actionMap.showCard1?.cards },
    { key: "showCard2", cards: actionMap.showCard2?.cards },
    { key: "showBothCards", cards: actionMap.showBothCards?.cards },
  ].filter((entry) => entry.cards?.length);

  if (showActions.length === 0 && !actionMap.muck) return;

  return html`
    <div class="action-row game-action-row">
      ${actionMap.muck
        ? html`<button
            type="button"
            class="button button--muted button--full-width"
            @click=${() =>
              panel.sendAction({ action: "muck", seat: panel.seatIndex })}
          >
            Muck
          </button>`
        : undefined}
      ${showActions.map(
        (entry) => html`
          <button
            type="button"
            class="button button--action button--full-width"
            @click=${() =>
              panel.sendAction({ action: entry.key, seat: panel.seatIndex })}
          >
            <span class="show-action">
              <span>Show</span>
              <span class="show-cards">
                ${entry.cards.map(
                  (card) => html`<phg-card .card=${card}></phg-card>`,
                )}
              </span>
            </span>
          </button>
        `,
      )}
    </div>
  `;
}
