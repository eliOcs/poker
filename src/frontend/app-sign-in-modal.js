import { html } from "lit";
import { ICONS } from "./icons.js";

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
        <div class="sign-in-benefits">
          <div class="sign-in-benefit">
            <h4>${ICONS.check} Keep your setup</h4>
            <p>Use your name and settings across multiple devices.</p>
          </div>
          <div class="sign-in-benefit">
            <h4>${ICONS.check} Review previous games</h4>
            <p>See your recent tables and come back to past sessions faster.</p>
          </div>
        </div>
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
