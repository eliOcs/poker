import { css } from "lit";
import { modalFormStyles } from "./modal-form-styles.js";

export const appModalStyles = [
  modalFormStyles,
  css`
    .settings-content,
    .sign-in-content {
      --modal-slider-active-color: var(--color-secondary);
    }

    .settings-content input {
      margin-bottom: var(--space-lg);
    }

    .sign-in-content {
      min-width: min(420px, 100%);
      display: grid;
      gap: var(--space-md);
    }

    .sign-in-intro {
      margin: 0;
      font-size: var(--font-sm);
      line-height: 1.8;
      color: var(--color-fg-medium);
    }

    .settings-content input,
    .sign-in-content input {
      outline: none;
    }

    .settings-content input:focus,
    .sign-in-content input:focus {
      border-color: var(--color-secondary);
      box-shadow: 0 0 0 1px var(--color-secondary);
    }

    .sign-in-content input[aria-invalid="true"] {
      border-color: var(--color-error);
      box-shadow: 0 0 0 1px var(--color-error);
    }
  `,
];
