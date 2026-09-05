import { html } from "lit";
import { renderModal } from "./modal.js";

const EMOJIS = [
  "🤣",
  "😍",
  "😘",
  "😏",
  "🤑",
  "😎",
  "🫠",
  "🤨",
  "🙄",
  "🤯",
  "🥶",
  "🥱",
  "🥺",
  "😭",
  "😡",
  "💩",
];

export function renderRankingModal(game) {
  if (!game.showRanking) return "";
  return renderModal(
    "Table Ranking",
    game.closeRanking,
    html`<phg-ranking-panel
      .rankings=${game.game?.rankings ?? []}
      .tournament=${game.game?.tournament}
    ></phg-ranking-panel>`,
  );
}

export function renderTournamentLevelsModal(game) {
  if (!game.showTournamentLevels) return "";
  return renderModal(
    "Tournament Levels",
    () => game.closeTournamentLevels(),
    html`<phg-tournament-levels-panel
      .tournament=${game.game?.tournament}
    ></phg-tournament-levels-panel>`,
  );
}

export function renderEmoteModal(game) {
  if (!game.showEmotePicker) return "";
  return renderModal(
    "Emote",
    game.closeEmotePicker,
    html`<div class="emote-grid">
      ${EMOJIS.map(
        (emoji) =>
          html`<button type="button" @click=${() => game.sendEmote(emoji)}>
            ${emoji}
          </button>`,
      )}
    </div>`,
  );
}

export function renderChatModal(game) {
  if (!game.showChat) return "";
  return renderModal(
    "Chat",
    game.closeChat,
    html`<form
      class="chat-input-container"
      @submit=${(event) => {
        event.preventDefault();
        const message = new FormData(event.currentTarget).get("message");
        game.sendChat(typeof message === "string" ? message : "");
      }}
    >
      <textarea
        id="chat-input"
        name="message"
        autofocus
        enterkeyhint="send"
        placeholder="Type a message..."
        maxlength="100"
        rows="2"
        @keydown=${(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const form = e.currentTarget.form;
            if (!form) throw new Error("Chat input must belong to a form");
            form.requestSubmit();
          }
        }}
      ></textarea>
      <button type="submit" class="button button--action button--full-width">
        Send
      </button>
    </form>`,
  );
}
