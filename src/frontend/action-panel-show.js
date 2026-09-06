import { html } from "lit";

export function renderShowButtons(panel, actionMap) {
  const cardActions = [
    { key: "muck", cards: actionMap.muck ? ["??", "??"] : undefined },
    { key: "showCard1", cards: actionMap.showCard1?.cards },
    { key: "showCard2", cards: actionMap.showCard2?.cards },
    { key: "showBothCards", cards: actionMap.showBothCards?.cards },
  ].filter((entry) => entry.cards?.length);

  if (cardActions.length === 0) return;

  return html`
    <div class="action-row game-action-row">
      ${cardActions.map(
        (entry) => html`
          <button
            type="button"
            class="button ${entry.key === "muck"
              ? "button--success"
              : "button--action"} button--full-width"
            @click=${() =>
              panel.sendAction({ action: entry.key, seat: panel.seatIndex })}
          >
            <span class="show-action">
              <span>${entry.key === "muck" ? "Muck" : "Show"}</span>
              <span class="show-cards">
                ${entry.cards.map(
                  (card) =>
                    html`<phg-card
                      .card=${card}
                      noAnimation
                      size="small"
                    ></phg-card>`,
                )}
              </span>
            </span>
          </button>
        `,
      )}
    </div>
  `;
}
