import { css } from "lit";
import { modalFormStyles } from "./modal-form-styles.js";

export const gameStyles = [
  modalFormStyles,
  css`
    :host {
      --modal-slider-active-color: var(--color-secondary);
      --sign-in-benefits-margin-bottom: var(--space-lg);
      --sign-in-benefit-title-gap: var(--space-md);
      --sign-in-benefit-title-margin: 0 0 var(--space-sm);
      --sign-in-benefit-copy-line-height: 1.8;

      height: 100%;
      display: block;
      background-color: var(--color-bg-medium);
      box-sizing: border-box;
      color: var(--color-fg-medium);
    }

    @media (width >= 800px) {
      :host {
        display: flex;
      }
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

    @media (width >= 800px) {
      #wrapper {
        flex: 1;
        min-width: 0;
      }
    }

    #container {
      position: absolute;
      inset: 0 var(--space-sm) 160px;
    }

    @media (width >= 800px) {
      #container {
        inset: 0 0 160px;
      }
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
        width: 76%;
        height: 68%;
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

    #info-bar {
      position: absolute;
      right: var(--space-md);
      top: var(--space-lg);
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      font-size: var(--font-sm);
      color: var(--color-fg-medium);
    }

    .info-cell {
      white-space: nowrap;
    }

    .info-link {
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--color-primary);
      font-family: inherit;
      font-size: inherit;
      cursor: pointer;
      white-space: nowrap;
    }

    .info-link:hover {
      color: var(--color-fg-white);
    }

    @media (width < 800px) {
      .info-size {
        display: none;
      }
    }

    .info-cell + .info-cell::before,
    .info-link + .info-cell::before,
    .info-cell + .info-link::before,
    .info-link + .info-link::before {
      content: "|";
      margin-right: var(--space-sm);
      color: var(--color-bg-disabled);
    }

    .settings-content input,
    .sign-in-content input {
      margin-bottom: var(--space-lg);
      outline: none;
    }

    .sign-in-content input:focus {
      border-color: var(--color-secondary);
      box-shadow: 0 0 0 2px rgb(136 68 170 / 20%);
    }

    .sign-in-content input[aria-invalid="true"] {
      border-color: var(--color-error);
      box-shadow: 0 0 0 2px rgb(204 51 51 / 18%);
    }

    .sign-in-content input[aria-invalid="true"]:focus {
      border-color: var(--color-error);
      box-shadow: 0 0 0 2px rgb(204 51 51 / 22%);
    }

    .sign-in-intro {
      margin: 0 0 var(--space-lg);
      color: var(--color-fg-light);
      font-size: var(--font-sm);
      line-height: 1.8;
    }

    .collecting-chip {
      position: absolute;
      z-index: 10;
      pointer-events: none;
    }

    .chat-input-container {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .chat-input-container textarea {
      width: 100%;
      min-height: 2.8em;
      padding: var(--space-md);
      font-family: inherit;
      font-size: var(--font-md);
      line-height: 2;
      background: var(--color-bg-medium);
      color: var(--color-fg-white);
      border: 2px solid var(--color-fg-muted);
      outline: none;
      box-sizing: border-box;
      resize: vertical;
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
  `,
];
