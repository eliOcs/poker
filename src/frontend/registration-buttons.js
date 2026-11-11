import { html } from "lit";

/**
 * @param {object} params
 * @param {boolean} params.requiresRegistration
 * @param {boolean} params.registrationOpen
 * @param {() => void} params.onSignIn
 */
export function renderSignInButton({
  requiresRegistration,
  registrationOpen,
  onSignIn,
}) {
  return html`<button
    type="button"
    class="button ${registrationOpen ? "button--muted" : "button--primary"}"
    @click=${onSignIn}
  >
    ${requiresRegistration ? "Already registered? Sign in" : "Sign in to play"}
  </button>`;
}

/**
 * @param {object} params
 * @param {string} params.label
 * @param {boolean} params.disabled
 * @param {() => void} params.onRegister
 */
export function renderRegisterButton({ label, disabled, onRegister }) {
  return html`<button
    type="button"
    class="button button--primary"
    ?disabled=${disabled}
    @click=${onRegister}
  >
    ${label}
  </button>`;
}
