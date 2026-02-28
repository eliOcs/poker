import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";

export function renderClockIcon(slot) {
  return html`<svg
    slot=${ifDefined(slot)}
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="8" y="5" width="8" height="2" fill="currentColor" />
    <rect x="8" y="19" width="8" height="2" fill="currentColor" />
    <rect x="6" y="7" width="2" height="2" fill="currentColor" />
    <rect x="6" y="17" width="2" height="2" fill="currentColor" />
    <rect x="16" y="7" width="2" height="2" fill="currentColor" />
    <rect x="16" y="17" width="2" height="2" fill="currentColor" />
    <rect x="4" y="9" width="2" height="8" fill="currentColor" />
    <rect x="18" y="9" width="2" height="8" fill="currentColor" />
    <rect x="4" y="2" width="2" height="2" fill="currentColor" />
    <rect x="4" y="19" width="2" height="2" fill="currentColor" />
    <rect x="18" y="19" width="2" height="2" fill="currentColor" />
    <rect x="18" y="2" width="2" height="2" fill="currentColor" />
    <rect x="2" y="4" width="2" height="2" fill="currentColor" />
    <rect x="20" y="4" width="2" height="2" fill="currentColor" />
    <rect x="11" y="9" width="2" height="4" fill="currentColor" />
    <rect x="13" y="13" width="2" height="2" fill="currentColor" />
  </svg>`;
}
