import { css } from "lit";

export const historyStyles = css`
  :host {
    height: 100%;
    display: block;
    background-color: var(--color-bg-medium);
    box-sizing: border-box;
    color: var(--color-fg-medium);
  }

  :host * {
    box-sizing: inherit;
  }

  .container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* Mobile nav bar - hidden on desktop */
  .nav-bar {
    display: none;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md) var(--space-lg);
    background-color: var(--color-bg-dark);
    border-bottom: 3px solid var(--color-bg-light);
  }

  @media (width <= 799px) {
    .nav-bar {
      display: flex;
    }
  }

  .nav-btn {
    background: none;
    border: none;
    color: var(--color-fg-medium);
    font-size: var(--font-lg);
    cursor: pointer;
    padding: var(--space-md);
  }

  .nav-btn:hover:not(:disabled) {
    color: var(--color-fg-white);
  }

  .nav-btn:disabled {
    color: var(--color-bg-disabled);
    cursor: not-allowed;
  }

  .nav-info {
    display: flex;
    align-items: center;
    gap: var(--space-lg);
    font-size: var(--font-md);
  }

  .nav-cards {
    display: flex;
    gap: var(--space-sm);
  }

  .nav-number {
    color: var(--color-fg-muted);
  }

  .nav-net {
    font-weight: bold;
  }

  .nav-net.positive {
    color: var(--color-success);
  }

  .nav-net.negative {
    color: var(--color-error);
  }

  .nav-net.neutral {
    color: var(--color-primary);
  }

  /* Main content area */
  .main {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
  }

  /* Desktop: table + sidebar layout */
  @media (width >= 800px) {
    .main {
      flex-direction: row;
    }
  }

  /* Table area (left column) */
  .table-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
    min-width: 0;
  }

  /* Final table state */
  .table-state {
    flex: 1;
    position: relative;
    min-height: 85vh;
    max-height: none;
    --board-bg: var(--color-table-history);
  }

  @media (width >= 800px) {
    .table-state {
      min-height: 450px;
    }
  }

  #seats {
    position: absolute;
    inset: 0;
  }

  phg-board {
    position: absolute;
    transform: translate(-50%, -50%);
    left: 50%;
  }

  @media (width >= 800px) {
    phg-board {
      top: 50%;
      width: 78%;
      height: 70%;
    }
  }

  @media (width < 800px) {
    phg-board {
      top: 52%;
      width: 85%;
      height: 85%;
    }
  }

  /* Action timeline */
  .timeline {
    padding: var(--space-lg);
    background-color: var(--color-bg-dark);
    border-top: 3px solid var(--color-bg-light);
    overflow-x: auto;
    flex-shrink: 0;
  }

  /* Desktop: horizontal layout */
  @media (width >= 800px) {
    .timeline {
      max-height: 220px;
      overflow: hidden auto;
    }

    .timeline-content {
      display: flex;
      gap: var(--space-lg);
    }

    .street {
      flex: 1;
      overflow: hidden;
    }
  }

  /* Mobile: vertical layout */
  @media (width <= 799px) {
    .timeline-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }
  }

  .street-header {
    font-size: var(--font-md);
    color: var(--color-fg-muted);
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-sm);
    border-bottom: 2px solid var(--color-bg-light);
  }

  .street-cards {
    display: flex;
    margin-bottom: var(--space-md);
  }

  .street-cards phg-card,
  .showdown-cards phg-card,
  .action-cards phg-card {
    transform: scale(0.7);
    transform-origin: top left;
    margin-right: -10px;
  }

  @media (width >= 800px) {
    .street-cards phg-card,
    .showdown-cards phg-card,
    .action-cards phg-card {
      margin-right: -12px;
    }
  }

  .action-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .action-item {
    font-size: var(--font-sm);
    color: var(--color-fg-medium);
    line-height: 1.5;
  }

  .action-player {
    color: var(--color-fg-light);
  }

  .action-player.you {
    color: var(--color-secondary);
  }

  .action-amount {
    color: var(--color-primary);
  }

  .action-cards {
    display: inline-flex;
    vertical-align: middle;
    margin-left: var(--space-sm);
  }

  .showdown-winner {
    font-size: var(--font-sm);
    color: var(--color-fg-medium);
    margin-top: var(--space-sm);
  }

  .showdown-winner:first-of-type {
    margin-top: var(--space-md);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--color-bg-light);
  }

  .showdown-hand {
    font-size: var(--font-sm);
    color: var(--color-fg-light);
    font-weight: bold;
    margin-top: var(--space-sm);
  }

  .showdown-cards {
    display: flex;
    margin-top: var(--space-sm);
  }

  .winner-name {
    font-weight: bold;
    color: var(--color-fg-light);
  }

  .showdown-winner.you .winner-name {
    color: var(--color-secondary);
  }

  .winner-amount {
    color: var(--color-primary);
  }

  /* Hand list sidebar (desktop only) */
  .sidebar {
    display: none;
    width: 250px;
    background-color: var(--color-bg-dark);
    border-right: 3px solid var(--color-bg-light);
    overflow-y: auto;
    order: -1;
  }

  @media (width >= 800px) {
    .sidebar {
      display: block;
    }
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    padding: var(--space-lg);
    font-size: var(--font-md);
    color: var(--color-fg-light);
    border-bottom: 3px solid var(--color-bg-light);
  }

  .sidebar-header span {
    flex: 1;
    text-align: center;
  }

  .sidebar-back {
    background: none;
    border: none;
    color: var(--color-fg-medium);
    font-size: var(--font-md);
    cursor: pointer;
    padding: var(--space-sm);
  }

  .sidebar-back:hover {
    color: var(--color-fg-white);
  }

  .hand-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .hand-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    cursor: pointer;
    border-bottom: 1px solid var(--color-bg-light);
  }

  .hand-item:hover {
    background-color: var(--color-bg-light);
  }

  .hand-item.active {
    background-color: var(--color-bg-light);
    border-left: 3px solid var(--color-primary);
  }

  .hand-item.winner {
    background-color: rgb(51 170 85 / 10%);
  }

  .hand-item.winner.active {
    background-color: rgb(51 170 85 / 20%);
  }

  .hand-cards {
    display: flex;
    gap: 2px;
  }

  /* Use smaller cards in sidebar on desktop */
  @media (width >= 800px) {
    .hand-cards phg-card {
      transform: scale(0.63);
      transform-origin: top left;
      margin-right: -21px;
      margin-bottom: -29px;
    }
  }

  .hand-number {
    font-size: var(--font-sm);
    color: var(--color-fg-muted);
    min-width: 35px;
  }

  .hand-net {
    font-size: var(--font-sm);
    font-weight: bold;
    min-width: 50px;
    text-align: right;
  }

  .hand-net.positive {
    color: var(--color-success);
  }

  .hand-net.negative {
    color: var(--color-error);
  }

  .hand-net.neutral {
    color: var(--color-primary);
  }

  /* Loading and error states */
  .loading,
  .error,
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-fg-muted);
    font-size: var(--font-md);
    gap: var(--space-lg);
  }

  .error {
    color: var(--color-error);
  }

  .back-link {
    color: var(--color-accent);
    text-decoration: none;
    font-size: var(--font-sm);
  }

  .back-link:hover {
    color: var(--color-fg-white);
  }
`;
