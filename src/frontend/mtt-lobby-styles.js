import { css } from "lit";
import { designTokens, baseStyles, shellPageStyles } from "./styles.js";

export const mttLobbyStyles = [
  designTokens,
  baseStyles,
  shellPageStyles,
  css`
    :host {
      height: 100%;
    }

    @media (width >= 800px) {
      :host {
        flex-direction: row;
      }
    }

    .panel {
      width: 100%;
      display: grid;
      gap: 16px;
      padding: clamp(18px, 4vw, 28px);
      border: var(--space-sm) solid var(--color-fg-muted);
      background: var(--color-bg-light);
      box-shadow: var(--space-md) var(--space-md) 0 var(--color-bg-dark);
    }

    .content {
      width: min(1120px, 100%);
      display: grid;
      gap: 16px;
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

    .stat {
      display: grid;
      gap: 8px;
      padding: 14px;
      border: 2px solid var(--color-bg-dark);
      background: var(--color-bg-medium);
    }

    .label {
      font-size: var(--font-sm);
      color: var(--color-fg-muted);
      line-height: 1.6;
    }

    .value {
      font-size: var(--font-md);
      color: var(--color-fg-white);
      line-height: 1.7;
    }

    .section {
      display: grid;
      gap: 12px;
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
    .empty,
    .loading,
    .error {
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

    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      min-width: 620px;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--color-bg-dark);
      font-size: var(--font-sm);
    }

    th {
      color: var(--color-fg-muted);
      border-bottom-width: 2px;
      white-space: nowrap;
    }

    td {
      color: var(--color-fg-medium);
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

    tbody tr:last-child td {
      border-bottom: 0;
    }

    .empty,
    .loading,
    .error {
      padding: 18px;
      border: 2px solid var(--color-bg-dark);
      background: var(--color-bg-medium);
      color: var(--color-fg-muted);
    }

    .error {
      color: var(--color-error);
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
        width: 100%;
        justify-content: center;
      }
    }
  `,
];
