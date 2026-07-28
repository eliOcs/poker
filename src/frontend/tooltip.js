import { html } from "lit";

export function renderTooltipIcon() {
  return html`<svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      d="M18 22H6V20H18V22ZM6 20H4V18H6V20ZM20 20H18V18H20V20ZM4 18H2V6H4V18ZM13 18H11V16H13V18ZM22 18H20V6H22V18ZM15 13H13V15H11V11H15V13ZM17 11H15V8H17V11ZM9 10H7V8H9V10ZM15 8H9V6H15V8ZM6 6H4V4H6V6ZM20 6H18V4H20V6ZM18 4H6V2H18V4Z"
    ></path>
  </svg>`;
}

/**
 * @param {object} params
 * @param {string} params.id
 * @param {string} params.triggerLabel
 * @param {import("lit").TemplateResult} params.content
 */
export function renderTooltip({ id, triggerLabel, content }) {
  return html`<div class="tooltip-control tooltip-anchor">
    <button
      class="tooltip-trigger"
      type="button"
      aria-label=${triggerLabel}
      aria-describedby=${id}
    >
      ${renderTooltipIcon()}
    </button>
    <div class="tooltip" id=${id} role="tooltip">${content}</div>
  </div>`;
}
