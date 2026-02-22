import { css } from "lit";

export const actionPanelExtraStyles = css`
  .emote-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-sm);
    width: 100%;
  }

  .emote-grid button {
    font-size: var(--font-xl);
    padding: var(--space-sm);
    background: none;
    border: 2px solid transparent;
    cursor: pointer;
    line-height: 1;
  }

  .emote-grid button:hover {
    border-color: var(--color-primary);
  }

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
`;
