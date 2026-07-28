import { html } from "lit";
import {
  estimateTournamentDurationMinutes,
  TOURNAMENT_SPEED_PRESETS,
} from "../shared/tournament.js";
import { renderTooltip } from "./tooltip.js";

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

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `~${remainingMinutes}m`;
  if (remainingMinutes === 0) return `~${hours}h`;
  return `~${hours}h ${remainingMinutes}m`;
}

function renderSpeedTooltip(rebuysEnabled, tooltipId, playerCounts) {
  return renderTooltip({
    id: tooltipId,
    triggerLabel: "Tournament speed details",
    content: html`
      <p>Speed controls how long each blind level lasts.</p>
      <ul>
        ${TOURNAMENT_SPEED_PRESETS.map(
          ({ label, levelDurationMinutes }) =>
            html`<li>
              <strong>${label}:</strong> ${levelDurationMinutes} minutes
            </li>`,
        )}
      </ul>
      <p>
        Estimated typical time by number of
        players${rebuysEnabled ? ", including rebuys" : ""}:
      </p>
      <table>
        <thead>
          <tr>
            <th>Players</th>
            ${TOURNAMENT_SPEED_PRESETS.map(
              ({ label }) => html`<th>${label}</th>`,
            )}
          </tr>
        </thead>
        <tbody>
          ${playerCounts.map(
            (playerCount) =>
              html`<tr>
                <th>${playerCount}</th>
                ${TOURNAMENT_SPEED_PRESETS.map(
                  ({ value }) =>
                    html`<td>
                      ${formatDuration(
                        estimateTournamentDurationMinutes(playerCount, value, {
                          rebuysEnabled,
                        }),
                      )}
                    </td>`,
                )}
              </tr>`,
          )}
        </tbody>
      </table>
      <p>Actual time varies with play${rebuysEnabled ? " and rebuys" : ""}.</p>
    `,
  });
}

/**
 * @param {object} params
 * @param {import('../shared/tournament.js').TournamentSpeed} params.selectedSpeed
 * @param {(event: Event) => void} params.onChange
 * @param {string} params.tooltipId
 * @param {boolean} [params.rebuysEnabled]
 * @param {number[]} [params.estimatePlayerCounts]
 */
export function renderTournamentSpeedSelect({
  selectedSpeed,
  onChange,
  tooltipId,
  rebuysEnabled = false,
  estimatePlayerCounts = [2, 6, 9],
}) {
  const selectedIndex = TOURNAMENT_SPEED_PRESETS.findIndex(
    ({ value }) => value === selectedSpeed,
  );
  return html`
    <div class="stakes-selector speed-selector">
      <div class="speed-label">
        <span class="stakes-label">Speed</span>
        ${renderSpeedTooltip(rebuysEnabled, tooltipId, estimatePlayerCounts)}
      </div>
      <select @change=${onChange}>
        ${TOURNAMENT_SPEED_PRESETS.map(
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
 * @param {Event} event
 * @returns {import('../shared/tournament.js').TournamentSpeed}
 */
export function getSelectedTournamentSpeed(event) {
  const target = /** @type {HTMLSelectElement} */ (event.target);
  const preset = TOURNAMENT_SPEED_PRESETS[parseInt(target.value, 10)];
  if (!preset) {
    throw new RangeError(
      `Unsupported tournament speed option: ${target.value}`,
    );
  }
  return preset.value;
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
