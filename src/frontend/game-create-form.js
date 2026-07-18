import { html } from "lit";

export const TABLE_SIZES = [
  { seats: 2, label: "Heads-Up" },
  { seats: 6, label: "6-Max" },
  { seats: 9, label: "Full Ring" },
];
export const DEFAULT_TABLE_SIZE = 6;

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
