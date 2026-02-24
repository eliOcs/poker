import { css } from "lit";

export const gameStyles = css`
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

  #wrapper {
    position: relative;
    height: 100%;
    max-width: 1400px;
    margin: 0 auto;
  }

  #container {
    position: absolute;
    inset: 0 0 120px;
  }

  @media (width >= 800px) and (height >= 840px) {
    #container {
      max-height: 700px;
      margin: auto 0;
    }
  }

  phg-board {
    position: absolute;
    transform: translate(-50%, -50%);
    left: 50%;
  }

  @media (width >= 800px) {
    phg-board {
      top: 50%;
      left: 50%;
      width: 78%;
      height: 70%;
    }
  }

  @media (width < 800px) {
    phg-board {
      top: 52%;
      width: 80%;
      height: 80%;
    }
  }

  #seats {
    position: absolute;
    inset: 0;
  }

  phg-action-panel {
    position: absolute;
    bottom: var(--space-md);
    left: 50%;
    transform: translate(-50%, 0);
  }

  #toolbar {
    position: absolute;
    left: 0.5%;
    top: 0.5%;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  #info-bar {
    position: absolute;
    right: 0.5%;
    top: 0.5%;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: var(--font-sm);
    color: var(--color-fg-medium);
  }

  .info-cell + .info-cell::before {
    content: "|";
    margin-right: var(--space-sm);
    color: var(--color-bg-disabled);
  }

  .toolbar-btn {
    background: none;
    border: none;
    font-size: var(--font-lg);
    cursor: pointer;
    padding: 5px;
    color: var(--color-fg-medium);
  }
  .toolbar-btn:hover {
    color: var(--color-fg-white);
  }

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

  #ranking-btn {
    color: var(--color-primary);
  }
  .collecting-chip {
    position: absolute;
    z-index: 10;
    pointer-events: none;
  }

  .emote-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-sm);
  }

  .emote-grid button {
    font-size: 2rem;
    padding: var(--space-md);
    background: none;
    border: 2px solid transparent;
    cursor: pointer;
    line-height: 1;
  }

  .emote-grid button:hover {
    border-color: var(--color-fg-muted);
  }
`;
