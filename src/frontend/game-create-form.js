import { html, css } from "lit";
import { baseStyles } from "./styles.js";

export const TABLE_SIZES = [
  { seats: 2, label: "Heads-Up" },
  { seats: 6, label: "6-Max" },
  { seats: 9, label: "Full Ring" },
];
export const DEFAULT_TABLE_SIZE = 6;

export const gameCreateStyles = [
  baseStyles,
  css`
    :host {
      display: flex;
      flex-direction: column;
      background-color: var(--color-bg-medium);
      color: var(--color-fg-medium);
      box-sizing: border-box;
    }

    :host * {
      box-sizing: inherit;
    }

    .main {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: clamp(16px, 3vw, 32px);
      background: var(--color-bg-medium);
    }

    .panel {
      width: min(720px, 100%);
      display: grid;
      justify-items: center;
      padding: clamp(24px, 5vw, 40px);
    }

    .logo {
      width: 80%;
      max-width: 450px;
      margin-bottom: 1.5em;
      image-rendering: pixelated;
    }

    p {
      font-size: var(--font-md);
      line-height: 2;
      color: var(--color-fg-medium);
      margin-bottom: 2em;
      text-align: center;
      padding: 0 1em;
      max-width: 500px;
    }

    .stakes-selector {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-sm);
      margin-bottom: 2em;
    }

    .stakes-label {
      font-size: var(--font-sm);
      color: var(--color-fg-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    select {
      font-family: inherit;
      font-size: var(--font-md);
      padding: var(--space-md);
      background: var(--color-bg-light);
      color: var(--color-fg-white);
      border: 2px solid var(--color-bg-disabled);
      cursor: pointer;
      accent-color: var(--color-secondary);
      outline: none;
    }

    select:focus {
      border-color: var(--color-secondary);
    }

    option {
      color: var(--color-fg-white);
      background: var(--color-bg-light);
    }

    .create-button-row {
      width: min(100%, 320px);
      display: flex;
      justify-self: center;
      justify-content: center;
    }

    @media (width >= 600px) {
      .logo {
        width: 60%;
      }
    }

    @media (width < 800px) {
      .main {
        padding: 56px var(--space-md) var(--space-md);
      }

      .panel,
      .create-button-row {
        width: 100%;
      }
    }
  `,
];

/**
 * @param {string} intro
 * @param {import("lit").TemplateResult} content
 * @returns {import("lit").TemplateResult}
 */
export function renderCreatePage(intro, content) {
  return html`
    <main class="main">
      <section class="panel">
        <img src="logo.webp" alt="Pluton Poker" class="logo" />
        <p>${intro}</p>
        ${content}
      </section>
    </main>
  `;
}

/**
 * @param {object} params
 * @param {string} params.label
 * @param {Array<{ label: string }>} params.options
 * @param {number} params.selectedIndex
 * @param {(event: Event) => void} params.onChange
 * @returns {import("lit").TemplateResult}
 */
export function renderPresetSelect({
  label,
  options,
  selectedIndex,
  onChange,
}) {
  return html`
    <div class="stakes-selector">
      <span class="stakes-label">${label}</span>
      <select @change=${onChange}>
        ${options.map(
          (option, index) => html`
            <option value=${index} ?selected=${index === selectedIndex}>
              ${option.label}
            </option>
          `,
        )}
      </select>
    </div>
  `;
}

/**
 * @param {object} params
 * @param {number} params.selectedTableSize
 * @param {(event: Event) => void} params.onChange
 * @returns {import("lit").TemplateResult}
 */
export function renderTableSizeSelect({ selectedTableSize, onChange }) {
  return html`
    <div class="stakes-selector">
      <span class="stakes-label">Table Size</span>
      <select @change=${onChange}>
        ${TABLE_SIZES.map(
          (size) => html`
            <option
              value=${size.seats}
              ?selected=${size.seats === selectedTableSize}
            >
              ${size.label}
            </option>
          `,
        )}
      </select>
    </div>
  `;
}

/**
 * @param {Element} target
 * @param {string} path
 */
export function dispatchNavigate(target, path) {
  target.dispatchEvent(
    new CustomEvent("navigate", {
      detail: { path },
      bubbles: true,
      composed: true,
    }),
  );
}

/**
 * @param {string} endpoint
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function postCreate(endpoint, body) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}
