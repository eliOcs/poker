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
`;
