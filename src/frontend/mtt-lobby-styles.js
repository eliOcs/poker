import { css } from "lit";
import {
  baseStyles,
  dataTableStyles,
  feedbackStateStyles,
  shellContentStyles,
  shellPageStyles,
} from "./styles.js";

export const mttLobbyStyles = [
  baseStyles,
  shellPageStyles,
  shellContentStyles,
  dataTableStyles,
  feedbackStateStyles,
  css`
    :host {
      --data-table-cell-padding: 10px 12px;
      --data-table-header-border-color: var(--color-bg-dark);
      --data-table-min-width: 620px;
      --shell-content-width: 1120px;

      height: 100%;
    }

    @media (width >= 800px) {
      :host {
        flex-direction: row;
      }
    }

    .header {
      display: grid;
      gap: 12px;
    }

    .eyebrow {
      font-size: var(--font-sm);
      color: var(--color-primary);
    }

    .title-row {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 16px;
    }

    h1,
    h2 {
      margin: 0;
      color: var(--color-fg-white);
    }

    h1 {
      font-size: clamp(18px, 3vw, 28px);
      line-height: 1.4;
    }

    h2 {
      font-size: var(--font-md);
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      justify-self: start;
      width: fit-content;
      padding: 10px 12px;
      border: 2px solid var(--color-fg-muted);
      background: var(--color-bg-medium);
      color: var(--color-fg-white);
      font-size: var(--font-sm);
      white-space: nowrap;
    }

    .status-pill.registration {
      color: var(--color-primary);
    }

    .status-pill.running {
      color: var(--color-success);
    }

    .status-pill.finished {
      color: var(--color-warning);
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      color: var(--color-fg-muted);
      font-size: var(--font-sm);
      line-height: 1.8;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .value {
      font-size: var(--font-md);
      color: var(--color-fg-white);
      line-height: 1.7;
    }

    .action-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .assignment {
      display: grid;
      gap: 12px;
      padding: 14px;
      border: 2px solid var(--color-primary);
      background: color-mix(
        in srgb,
        var(--color-bg-medium) 75%,
        var(--color-primary)
      );
    }

    .assignment p,
    .loading {
      margin: 0;
      font-size: var(--font-sm);
      line-height: 1.8;
    }

    .tables {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }

    .table-card {
      display: grid;
      gap: 10px;
      padding: 14px;
      border: 2px solid var(--color-bg-dark);
      background: var(--color-bg-medium);
    }

    .table-meta {
      display: grid;
      gap: 4px;
      color: var(--color-fg-muted);
      font-size: var(--font-sm);
      line-height: 1.7;
    }

    .table-card.current {
      border-color: var(--color-success);
    }

    .table-card.closed {
      opacity: 0.8;
    }

    .table-name {
      color: var(--color-fg-white);
    }

    .table-actions {
      display: flex;
    }

    .positive {
      color: var(--color-success);
    }

    .negative {
      color: var(--color-error);
    }

    td strong {
      color: var(--color-fg-white);
    }

    .loading {
      padding: 18px;
      border: 2px solid var(--color-bg-dark);
      background: var(--color-bg-medium);
      color: var(--color-fg-muted);
    }

    @media (width < 900px) {
      .summary {
        grid-template-columns: 1fr 1fr;
      }

      .title-row {
        display: grid;
      }
    }

    @media (width < 600px) {
      .main {
        padding: 56px var(--space-md) var(--space-md);
      }

      .panel {
        padding: var(--space-md);
      }

      .summary {
        grid-template-columns: 1fr;
      }

      .status-pill {
        justify-content: center;
      }
    }
  `,
];
