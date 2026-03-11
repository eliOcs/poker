import { css } from "lit";

export const appModalStyles = css`
  .settings-content input {
    width: 100%;
    padding: var(--space-md);
    font-family: inherit;
    font-size: var(--font-md);
    border: 3px solid var(--color-bg-dark);
    background: var(--color-bg-medium);
    color: var(--color-fg-white);
    margin-bottom: var(--space-lg);
    box-sizing: border-box;
  }

  .settings-content .buttons {
    display: flex;
    gap: var(--space-md);
    justify-content: flex-end;
  }

  .settings-content label {
    display: block;
    margin-bottom: var(--space-sm);
    color: var(--color-fg-medium);
    font-size: var(--font-sm);
  }

  .volume-slider {
    display: flex;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
  }

  .volume-slider button {
    flex: 1;
    padding: var(--space-md);
    font-family: inherit;
    font-size: var(--font-md);
    border: 3px solid var(--color-bg-dark);
    background: var(--color-bg-medium);
    color: var(--color-fg-medium);
    cursor: pointer;
  }

  .volume-slider button:hover {
    background: var(--color-bg-dark);
  }

  .volume-slider button.active {
    background: var(--color-primary);
    color: var(--color-fg-white);
    border-color: var(--color-primary);
  }

  .sign-in-content {
    min-width: min(420px, 100%);
    display: grid;
    gap: var(--space-md);
  }

  .sign-in-intro {
    margin: 0;
    font-size: var(--font-sm);
    line-height: 1.8;
    color: var(--color-fg-medium);
  }

  .sign-in-content label {
    display: block;
    margin-bottom: var(--space-sm);
    color: var(--color-fg-medium);
    font-size: var(--font-sm);
  }

  .sign-in-content input {
    width: 100%;
    padding: var(--space-md);
    font-family: inherit;
    font-size: var(--font-md);
    border: 3px solid var(--color-bg-dark);
    background: var(--color-bg-medium);
    color: var(--color-fg-white);
    box-sizing: border-box;
    outline: none;
  }

  .sign-in-content input:focus {
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 1px var(--color-secondary);
  }

  .sign-in-content input[aria-invalid="true"] {
    border-color: var(--color-error);
    box-shadow: 0 0 0 1px var(--color-error);
  }

  .sign-in-benefits {
    display: grid;
    gap: var(--space-md);
  }

  .sign-in-benefit {
    display: grid;
    gap: var(--space-sm);
    padding: var(--space-md);
    border: 2px solid var(--color-bg-dark);
    background: var(--color-bg-medium);
  }

  .sign-in-benefit h4 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    font-size: var(--font-sm);
    color: var(--color-fg-white);
  }

  .sign-in-benefit h4 svg {
    width: 16px;
    height: 16px;
    min-width: 16px;
    fill: var(--color-success);
  }

  .sign-in-benefit p {
    margin: 0;
    font-size: var(--font-sm);
    line-height: 1.7;
    color: var(--color-fg-medium);
  }
`;
