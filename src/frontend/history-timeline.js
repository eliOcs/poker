import { html } from "lit";
import { formatCurrency } from "./currency.js";

/**
 * @param {import("./history.js").History} history
 * @param {{ minHeight: number, maxHeight: number, height: number }} aria
 */
export function renderHistoryTimeline(history, aria) {
  const streetNames = ["Preflop", "Flop", "Turn", "River"];

  return html`
    <div
      class="timeline-panel"
      style=${history.timelineHeight === undefined
        ? ""
        : `--timeline-height: ${history.timelineHeight}px`}
    >
      <div
        class="timeline-resize-handle"
        role="separator"
        aria-label="Resize action history"
        aria-orientation="horizontal"
        aria-valuemin=${aria.minHeight}
        aria-valuemax=${aria.maxHeight}
        aria-valuenow=${aria.height}
        tabindex="0"
        @pointerdown=${history.handleTimelineResizeStart}
        @keydown=${history.handleTimelineResizeKeydown}
        title="Drag to resize action history"
      >
        <span class="timeline-resize-grip"></span>
      </div>
      <div class="timeline">
        <div class="timeline-content">
          ${(history.hand?.rounds ?? []).map((round) => {
            const streetName =
              round.street ?? streetNames[round.id] ?? "Unknown";
            const isShowdown = streetName === "Showdown";

            return html`
              <div class="street">
                <div class="street-header">${streetName}</div>
                ${round.cards
                  ? html`
                      <div class="street-cards">
                        ${round.cards.map(
                          (card) =>
                            html`<phg-card
                              .card=${card}
                              noAnimation
                            ></phg-card>`,
                        )}
                      </div>
                    `
                  : ""}
                <div class="action-list">
                  ${(round.actions ?? [])
                    .filter((action) => action.action !== "Dealt Cards")
                    .map((action) => {
                      const isYou = action.player_id === history.playerId;
                      const playerName = history.getPlayerName(
                        action.player_id,
                      );
                      return html`
                        <div class="action-item">
                          <span class="action-player ${isYou ? "you" : ""}"
                            >${playerName}</span
                          >
                          ${action.action}
                          ${action.cards?.length
                            ? html`<span class="action-cards"
                                >${action.cards.map(
                                  (card) =>
                                    html`<phg-card
                                      .card=${card}
                                      noAnimation
                                    ></phg-card>`,
                                )}</span
                              >`
                            : ""}
                          ${action.amount
                            ? html`<span class="action-amount"
                                >${formatCurrency(action.amount)}</span
                              >`
                            : ""}
                        </div>
                      `;
                    })}
                  ${isShowdown ? history.renderShowdownResult() : ""}
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    </div>
  `;
}
