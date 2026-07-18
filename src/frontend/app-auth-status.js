import { html } from "lit";

/**
 */
export function renderAuthStatus() {
  return html`<section class="auth-status">
    <div class="auth-status-card">
      <h1>Signing you in...</h1>
      <p>Please wait while we restore your account.</p>
    </div>
  </section>`;
}
