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

  .settings-content label {
    display: block;
    margin-bottom: var(--space-md);
    color: var(--color-fg-medium);
    font-size: var(--font-sm);
  }

  .sign-in-content label {
    display: block;
    margin-bottom: 0;
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
`;
