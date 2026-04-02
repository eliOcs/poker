import { css } from "lit";

export const modalFormStyles = css`
  .settings-content input,
  .sign-in-content input {
    width: 100%;
    padding: var(--space-md);
    font-family: inherit;
    font-size: var(--font-md);
    border: 3px solid var(--color-bg-dark);
    background: var(--color-bg-medium);
    color: var(--color-fg-white);
    box-sizing: border-box;
  }

  .settings-content .buttons,
  .sign-in-content .buttons {
    display: flex;
    gap: var(--space-md);
    justify-content: flex-end;
  }

  .settings-content label,
  .sign-in-content label {
    display: block;
    margin-bottom: var(--space-md);
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
    background: var(--modal-slider-active-color);
    color: var(--color-fg-white);
    border-color: var(--modal-slider-active-color);
  }

  .sign-in-benefits {
    display: grid;
    gap: var(--space-md);
    margin-bottom: var(--sign-in-benefits-margin-bottom, 0);
  }

  .sign-in-benefit {
    display: grid;
    gap: var(--sign-in-benefit-gap, 0);
    padding: var(--space-md);
    border: 2px solid var(--color-bg-dark);
    background: var(--color-bg-medium);
  }

  .sign-in-benefit h4 {
    display: flex;
    align-items: center;
    gap: var(--sign-in-benefit-title-gap, 10px);
    margin: var(--sign-in-benefit-title-margin, 0);
    font-size: var(--font-sm);
    color: var(--color-fg-white);
  }

  .sign-in-benefit h4 svg {
    flex: none;
    width: 16px;
    height: 16px;
    min-width: 16px;
    color: var(--color-success);
    fill: currentcolor;
  }

  .sign-in-benefit p {
    margin: 0;
    font-size: var(--font-sm);
    line-height: var(--sign-in-benefit-copy-line-height, 1.8);
    color: var(--color-fg-medium);
  }
`;
