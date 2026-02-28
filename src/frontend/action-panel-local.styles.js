import { css } from "lit";

export const actionPanelExtraStyles = css`
  .bet-presets {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-sm);
    width: 100%;
  }

  .show-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    line-height: 1;
  }

  .show-cards {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1px;
    margin-top: -1px;
  }

  .show-cards phg-card {
    transform: scale(0.6);
    transform-origin: center;
    margin: -12px -9px;
  }

  @media (width < 800px) {
    .show-cards phg-card {
      transform: scale(0.45);
    }
  }

  .pre-action-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
  }

  .pre-action-checkbox {
    appearance: none;
    width: 14px;
    height: 14px;
    margin: 0;
    flex-shrink: 0;
    color: var(--color-fg-white);
    border: 2px solid currentcolor;
    border-radius: 2px;
    background: transparent;
    display: grid;
    place-content: center;
    pointer-events: none;
  }

  .pre-action-checkbox::before {
    content: "";
    width: 4px;
    height: 8px;
    border-right: 3px solid currentcolor;
    border-bottom: 3px solid currentcolor;
    transform: rotate(45deg) scale(0);
    transform-origin: center;
  }

  .pre-action-checkbox:checked::before {
    transform: rotate(45deg) scale(1);
  }

  .pre-action-checkbox:disabled {
    opacity: 1;
  }
`;
