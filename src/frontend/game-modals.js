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
  return html`<phg-modal .title=${"Table Ranking"} @close=${game.closeRanking}
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
  const vibrationOptions = [
    { label: "Off", value: false },
    { label: "On", value: true },
  ];
  return html`
    <phg-modal .title=${"Settings"} @close=${game.closeSettings}>
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
        <label>Vibration</label>
        <div class="volume-slider">
          ${vibrationOptions.map(
            ({ label, value }) => html`
              <button
                class=${game.vibration === value ? "active" : ""}
                @click=${() => game.setVibration(value)}
              >
                ${label}
              </button>
            `,
          )}
        </div>
        <div class="buttons">
          <phg-button variant="muted" @click=${game.closeSettings}
            >Cancel</phg-button
          >
          <phg-button variant="action" @click=${game.saveSettings}
            >Save</phg-button
          >
        </div>
      </div>
    </phg-modal>
  `;
}

export function renderSignInModal(game) {
  if (!game.showSignIn) return "";
  return html`
    <phg-modal .title=${"Sign in"} @close=${game.closeSignIn}>
      <form
        class="sign-in-content"
        @submit=${(e) => {
          e.preventDefault();
          game.requestSignIn();
        }}
      >
        <p class="sign-in-intro">
          You will receive an email to complete the sign in.
        </p>
        <label for="sign-in-email">Email</label>
        <input
          id="sign-in-email"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          ?required=${true}
          aria-invalid=${game._signInInvalid ? "true" : "false"}
          autofocus
          @input=${game.clearSignInValidation}
        />
        <div class="buttons">
          <phg-button variant="muted" @click=${game.closeSignIn}
            >Cancel</phg-button
          >
          <phg-button variant="action" @click=${game.requestSignIn}
            >Send sign-in link</phg-button
          >
        </div>
        <p class="sign-in-switch">
          New?
          <button
            type="button"
            class="sign-in-switch-link"
            @click=${game.switchToSignUp}
          >
            Sign up
          </button>
        </p>
      </form>
    </phg-modal>
  `;
}

export function renderSignUpModal(game) {
  if (!game.showSignUp) return "";
  return html`
    <phg-modal .title=${"Sign up"} @close=${game.closeSignUp}>
      <form
        class="sign-in-content"
        @submit=${(e) => {
          e.preventDefault();
          game.requestSignUp();
        }}
      >
        <p class="sign-in-intro">
          You will receive an email to complete the sign up.
        </p>
        <label for="sign-up-name">Name</label>
        <input
          id="sign-up-name"
          type="text"
          autocomplete="name"
          placeholder="Enter your name"
          maxlength="20"
          ?required=${true}
          aria-invalid=${game._signUpNameInvalid ? "true" : "false"}
          autofocus
          .value=${game.getCurrentPlayerName()}
          @input=${game.clearSignUpValidation}
        />
        <label for="sign-up-email">Email</label>
        <input
          id="sign-up-email"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          ?required=${true}
          aria-invalid=${game._signUpEmailInvalid ? "true" : "false"}
          @input=${game.clearSignUpValidation}
        />
        <div class="buttons">
          <phg-button variant="muted" @click=${game.closeSignUp}
            >Cancel</phg-button
          >
          <phg-button variant="action" @click=${game.requestSignUp}
            >Send sign-up link</phg-button
          >
        </div>
        <p class="sign-in-switch">
          Have an account?
          <button
            type="button"
            class="sign-in-switch-link"
            @click=${game.switchToSignIn}
          >
            Sign in
          </button>
        </p>
      </form>
    </phg-modal>
  `;
}

export function renderEmoteModal(game) {
  if (!game.showEmotePicker) return "";
  return html`<phg-modal .title=${"Emote"} @close=${game.closeEmotePicker}>
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
  return html`<phg-modal .title=${"Chat"} @close=${game.closeChat}>
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
        variant="action"
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
