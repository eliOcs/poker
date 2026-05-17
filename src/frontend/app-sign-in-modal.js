import { html } from "lit";

/**
 * @param {any} app
 */
export function renderProfileSignInModal(app) {
  if (!app._showProfileSignIn) return "";

  return html`
    <phg-modal .title=${"Sign in"} @close=${app.closeProfileSignIn}>
      <form
        class="sign-in-content"
        @submit=${(e) => {
          e.preventDefault();
          app.requestProfileSignIn();
        }}
      >
        <p class="sign-in-intro">
          Enter your email and we&apos;ll send you a one-time sign-in link.
        </p>
        <label for="profile-sign-in-email">Email</label>
        <input
          id="profile-sign-in-email"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          ?required=${true}
          aria-invalid=${app._profileSignInInvalid ? "true" : "false"}
          autofocus
          @input=${app.clearProfileSignInValidation}
        />
        <div class="buttons">
          <phg-button variant="muted" @click=${app.closeProfileSignIn}
            >Cancel</phg-button
          >
          <phg-button variant="action" @click=${app.requestProfileSignIn}
            >Send sign-in link</phg-button
          >
        </div>
      </form>
    </phg-modal>
  `;
}
