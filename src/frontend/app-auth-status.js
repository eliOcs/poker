import { css, html } from "lit";

export const appAuthStatusStyles = css`
  .auth-status {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: var(--space-lg);
    background: var(--color-bg-medium);
    color: var(--color-fg-white);
    text-align: center;
  }

  .auth-status-card {
    display: grid;
    gap: var(--space-md);
    max-width: 28rem;
    padding: var(--space-lg);
    border: 2px solid var(--color-fg-muted);
    background: var(--color-bg-light);
    box-shadow: var(--space-md) var(--space-md) 0 var(--color-bg-dark);
  }

  .auth-status-card h1 {
    margin: 0;
    font-size: var(--font-md);
    line-height: 1.6;
  }

  .auth-status-card p {
    margin: 0;
    color: var(--color-fg-medium);
    font-size: var(--font-sm);
    line-height: 1.8;
  }
`;

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
