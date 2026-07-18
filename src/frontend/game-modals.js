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

export function renderSettingsModal(game) {
  if (!game.showSettings) return "";
  const labels = ["Off", "25%", "75%", "100%"];
  const volumeSteps = [0, 0.25, 0.75, 1];
  const vibrationOptions = [
    { label: "Off", value: false },
    { label: "On", value: true },
  ];
  return renderModal(
    "Settings",
    game.closeSettings,
    html`<form
      class="settings-content"
      @submit=${(event) => {
        event.preventDefault();
        game.saveSettings(event.currentTarget);
      }}
    >
      <label for="name-input">Name</label>
      <input
        id="name-input"
        name="name"
        type="text"
        placeholder="Enter your name"
        maxlength="20"
        .value=${game.getCurrentPlayerName()}
      />
      <fieldset>
        <legend>Sound Volume</legend>
        <div class="volume-slider">
          ${volumeSteps.map(
            (v, i) => html`
              <label class=${game.volume === v ? "active" : ""}>
                <input
                  type="radio"
                  name="volume"
                  value=${v}
                  .checked=${game.volume === v}
                  @change=${() => game.setVolume(v)}
                />
                ${labels[i]}
              </label>
            `,
          )}
        </div>
      </fieldset>
      <fieldset>
        <legend>Vibration</legend>
        <div class="volume-slider">
          ${vibrationOptions.map(
            ({ label, value }) => html`
              <label class=${game.vibration === value ? "active" : ""}>
                <input
                  type="radio"
                  name="vibration"
                  value=${String(value)}
                  .checked=${game.vibration === value}
                  @change=${() => game.setVibration(value)}
                />
                ${label}
              </label>
            `,
          )}
        </div>
      </fieldset>
      <div class="buttons">
        <button
          type="button"
          class="button button--muted"
          @click=${() => game.closeSettings()}
        >
          Cancel
        </button>
        <button type="submit" class="button button--action">Save</button>
      </div>
    </form>`,
  );
}

export function renderSignInModal(game) {
  if (!game.showSignIn) return "";
  return renderModal(
    "Sign in",
    game.closeSignIn,
    html`<form
      class="sign-in-content"
      @submit=${(e) => {
        e.preventDefault();
        game.requestSignIn(e.currentTarget);
      }}
    >
      <p class="sign-in-intro">
        You will receive an email to complete the sign in.
      </p>
      <label for="sign-in-email">Email</label>
      <input
        id="sign-in-email"
        name="email"
        type="email"
        autocomplete="email"
        placeholder="you@example.com"
        ?required=${true}
        aria-invalid=${game._signInInvalid ? "true" : "false"}
        autofocus
        @input=${() => game.clearSignInValidation()}
        @invalid=${(event) => {
          event.preventDefault();
          game._signInInvalid = true;
          event.currentTarget.focus();
        }}
      />
      <div class="buttons">
        <button
          type="button"
          class="button button--muted"
          @click=${() => game.closeSignIn()}
        >
          Cancel
        </button>
        <button type="submit" class="button button--action">
          Send sign-in link
        </button>
      </div>
      <p class="sign-in-switch">
        New?
        <button
          type="button"
          class="sign-in-switch-link"
          @click=${() => game.switchToSignUp()}
        >
          Sign up
        </button>
      </p>
    </form>`,
  );
}

export function renderSignUpModal(game) {
  if (!game.showSignUp) return "";
  return renderModal(
    "Sign up",
    game.closeSignUp,
    html`<form
      class="sign-in-content"
      @submit=${(e) => {
        e.preventDefault();
        game.requestSignUp(e.currentTarget);
      }}
    >
      <p class="sign-in-intro">
        You will receive an email to complete the sign up.
      </p>
      <label for="sign-up-name">Name</label>
      <input
        id="sign-up-name"
        name="name"
        type="text"
        autocomplete="name"
        placeholder="Enter your name"
        maxlength="20"
        ?required=${true}
        aria-invalid=${game._signUpNameInvalid ? "true" : "false"}
        autofocus
        .value=${game.getCurrentPlayerName()}
        @input=${() => game.clearSignUpValidation()}
        @invalid=${(event) => {
          event.preventDefault();
          game._signUpNameInvalid = true;
          event.currentTarget.focus();
        }}
      />
      <label for="sign-up-email">Email</label>
      <input
        id="sign-up-email"
        name="email"
        type="email"
        autocomplete="email"
        placeholder="you@example.com"
        ?required=${true}
        aria-invalid=${game._signUpEmailInvalid ? "true" : "false"}
        @input=${() => game.clearSignUpValidation()}
        @invalid=${(event) => {
          event.preventDefault();
          game._signUpEmailInvalid = true;
          event.currentTarget.focus();
        }}
      />
      <div class="buttons">
        <button
          type="button"
          class="button button--muted"
          @click=${() => game.closeSignUp()}
        >
          Cancel
        </button>
        <button type="submit" class="button button--action">
          Send sign-up link
        </button>
      </div>
      <p class="sign-in-switch">
        Have an account?
        <button
          type="button"
          class="sign-in-switch-link"
          @click=${() => game.switchToSignIn()}
        >
          Sign in
        </button>
      </p>
    </form>`,
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
