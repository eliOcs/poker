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

  .nav-result {
    color: var(--color-fg-muted);
  }

  .nav-result.winner {
    color: var(--color-success);
  }

  .nav-pot {
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
    min-height: 450px;
    max-height: 550px;
  }

  @media (width >= 800px) {
    .table-state {
      max-height: none;
    }
  }

  .board {
    position: absolute;
    top: 15%;
    left: 10%;
    width: 80%;
    height: 70%;
  }

  /* Player seat positions around the table */
  .player-seat {
    position: absolute;
    min-width: 100px;
  }

  .player-seat[data-seat="0"] {
    top: 10%;
    left: 5%;
  }
  .player-seat[data-seat="1"] {
    top: 5%;
    left: 50%;
    transform: translateX(-50%);
  }
  .player-seat[data-seat="2"] {
    top: 10%;
    right: 5%;
  }
  .player-seat[data-seat="3"] {
    bottom: 10%;
    right: 5%;
  }
  .player-seat[data-seat="4"] {
    bottom: 5%;
    left: 50%;
    transform: translateX(-50%);
  }
  .player-seat[data-seat="5"] {
    bottom: 10%;
    left: 5%;
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
    .timeline-content {
      display: flex;
      gap: var(--space-lg);
    }

    .street {
      flex: 1;
      min-width: 120px;
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
    color: var(--color-primary);
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-sm);
    border-bottom: 2px solid var(--color-bg-light);
  }

  .street-cards {
    display: flex;
    margin-bottom: var(--space-md);
  }

  .street-cards phg-card,
  .showdown-cards phg-card {
    transform: scale(0.7);
    transform-origin: top left;
    margin-right: -10px;
  }

  @media (width >= 800px) {
    .street-cards phg-card,
    .showdown-cards phg-card {
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
  }

  .action-player {
    color: var(--color-fg-light);
  }

  .action-player.you {
    color: var(--color-success);
  }

  .action-amount {
    color: var(--color-primary);
  }

  .showdown-hand {
    font-size: var(--font-sm);
    color: var(--color-fg-light);
    font-weight: bold;
    margin-top: var(--space-md);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--color-bg-light);
  }

  .showdown-cards {
    display: flex;
    margin-top: var(--space-sm);
  }

  .showdown-winner {
    font-size: var(--font-sm);
    color: var(--color-fg-medium);
    margin-top: var(--space-sm);
  }

  .showdown-winner.you {
    color: var(--color-success);
  }

  .winner-name {
    font-weight: bold;
  }

  .winner-amount {
    color: var(--color-primary);
  }

  /* Hand list sidebar (desktop only) */
  .sidebar {
    display: none;
    width: 250px;
    background-color: var(--color-bg-dark);
    border-left: 3px solid var(--color-bg-light);
    overflow-y: auto;
  }

  @media (width >= 800px) {
    .sidebar {
      display: block;
    }
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-lg);
    font-size: var(--font-md);
    color: var(--color-fg-light);
    border-bottom: 3px solid var(--color-bg-light);
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

  .hand-winner {
    flex: 1;
    font-size: var(--font-sm);
    color: var(--color-fg-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hand-winner.you {
    color: var(--color-success);
  }

  .hand-pot {
    font-size: var(--font-sm);
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
