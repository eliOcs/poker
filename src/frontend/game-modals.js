import { html } from "lit";

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
  return html`<phg-modal title="Table Ranking" @close=${game.closeRanking}
    ><phg-ranking-panel
      .rankings=${game.game?.rankings || []}
      .tournament=${game.game?.tournament}
    ></phg-ranking-panel
  ></phg-modal>`;
}

export function renderSettingsModal(game) {
  if (!game.showSettings) return "";
  const labels = ["Off", "25%", "75%", "100%"];
  const volumeSteps = [0, 0.25, 0.75, 1];
  return html`
    <phg-modal title="Settings" @close=${game.closeSettings}>
      <div class="settings-content">
        <label>Name</label>
        <input
          id="name-input"
          type="text"
          placeholder="Enter your name"
          maxlength="20"
          .value=${game.getCurrentPlayerName()}
          @keydown=${(e) => e.key === "Enter" && game.saveSettings()}
        />
        <label>Sound Volume</label>
        <div class="volume-slider">
          ${volumeSteps.map(
            (v, i) => html`
              <button
                class=${game.volume === v ? "active" : ""}
                @click=${() => game.setVolume(v)}
              >
                ${labels[i]}
              </button>
            `,
          )}
        </div>
        <div class="buttons">
          <phg-button variant="secondary" @click=${game.closeSettings}
            >Cancel</phg-button
          >
          <phg-button variant="success" @click=${game.saveSettings}
            >Save</phg-button
          >
        </div>
      </div>
    </phg-modal>
  `;
}

export function renderEmoteModal(game) {
  if (!game.showEmotePicker) return "";
  return html`<phg-modal title="Emote" @close=${game.closeEmotePicker}>
    <div class="emote-grid">
      ${EMOJIS.map(
        (emoji) =>
          html`<button @click=${() => game.sendEmote(emoji)}>${emoji}</button>`,
      )}
    </div>
  </phg-modal>`;
}

export function renderChatModal(game) {
  if (!game.showChat) return "";
  return html`<phg-modal title="Chat" @close=${game.closeChat}>
    <div class="chat-input-container">
      <textarea
        id="chat-input"
        autofocus
        enterkeyhint="send"
        placeholder="Type a message..."
        maxlength="100"
        rows="2"
        @keydown=${(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            game.sendChat(e.target.value);
          }
        }}
      ></textarea>
      <phg-button
        variant="primary"
        full-width
        @click=${() => {
          const input = game.shadowRoot.querySelector("#chat-input");
          game.sendChat(input?.value || "");
        }}
        >Send</phg-button
      >
    </div>
  </phg-modal>`;
}
