import { svg } from "lit";

export const ICONS = {
  menu: svg`<svg
    width="1em"
    height="1em"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M1 2h14v2H1zm0 5h14v2H1zm0 5h14v2H1z" fill="currentColor" />
  </svg>`,
  close: svg`<svg
    width="1em"
    height="1em"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M11 3h2v2h-2zM9 5h2v2H9zM7 7h2v2H7zM9 9h2v2H9zm2 2h2v2h-2z"
      fill="currentColor"
    />
    <path
      d="M3 3h2v2H3zm2 2h2v2H5zm2 2h2v2H7zm-2 2h2v2H5zm-2 2h2v2H3z"
      fill="currentColor"
    />
  </svg>`,
  settings: svg`<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="18" y="2" width="2" height="2" fill="currentColor" />
    <rect x="4" y="2" width="2" height="2" fill="currentColor" />
    <rect
      x="20"
      y="22"
      width="2"
      height="2"
      transform="rotate(180 20 22)"
      fill="currentColor"
    />
    <rect
      width="2"
      height="2"
      transform="matrix(1 0 0 -1 4 22)"
      fill="currentColor"
    />
    <rect x="20" y="4" width="2" height="2" fill="currentColor" />
    <rect x="6" y="4" width="4" height="2" fill="currentColor" />
    <rect
      x="18"
      y="20"
      width="4"
      height="2"
      transform="rotate(180 18 20)"
      fill="currentColor"
    />
    <rect
      width="4"
      height="2"
      transform="matrix(1 0 0 -1 6 20)"
      fill="currentColor"
    />
    <rect x="18" y="6" width="2" height="4" fill="currentColor" />
    <rect x="4" y="6" width="2" height="4" fill="currentColor" />
    <rect
      x="20"
      y="18"
      width="2"
      height="4"
      transform="rotate(180 20 18)"
      fill="currentColor"
    />
    <rect
      width="2"
      height="4"
      transform="matrix(1 0 0 -1 4 18)"
      fill="currentColor"
    />
    <rect x="14" y="4" width="4" height="2" fill="currentColor" />
    <rect x="2" y="4" width="2" height="2" fill="currentColor" />
    <rect
      x="22"
      y="20"
      width="2"
      height="2"
      transform="rotate(180 22 20)"
      fill="currentColor"
    />
    <rect
      width="2"
      height="2"
      transform="matrix(1 0 0 -1 2 20)"
      fill="currentColor"
    />
    <rect x="8" y="2" width="2" height="4" fill="currentColor" />
    <rect
      width="2"
      height="4"
      transform="matrix(1 0 0 -1 8 22)"
      fill="currentColor"
    />
    <rect x="8" y="2" width="8" height="2" fill="currentColor" />
    <rect
      width="8"
      height="2"
      transform="matrix(1 0 0 -1 8 22)"
      fill="currentColor"
    />
    <rect x="2" y="8" width="2" height="8" fill="currentColor" />
    <rect
      x="22"
      y="16"
      width="2"
      height="8"
      transform="rotate(180 22 16)"
      fill="currentColor"
    />
    <rect x="20" y="8" width="2" height="4" fill="currentColor" />
    <rect x="10" y="8" width="4" height="2" fill="currentColor" />
    <rect x="8" y="10" width="2" height="4" fill="currentColor" />
    <rect x="10" y="14" width="4" height="2" fill="currentColor" />
    <rect x="14" y="10" width="2" height="4" fill="currentColor" />
  </svg>`,
  clock: svg`<svg
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
  </svg>`,
  check: svg`<svg
    width="1em"
    height="1em"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="1" y="7" width="2" height="2" fill="currentColor" />
    <rect x="3" y="9" width="2" height="2" fill="currentColor" />
    <rect x="3" y="7" width="2" height="2" fill="currentColor" />
    <rect x="5" y="11" width="2" height="2" fill="currentColor" />
    <rect x="5" y="9" width="2" height="2" fill="currentColor" />
    <rect x="7" y="9" width="2" height="2" fill="currentColor" />
    <rect x="7" y="7" width="2" height="2" fill="currentColor" />
    <rect x="9" y="7" width="2" height="2" fill="currentColor" />
    <rect x="9" y="5" width="2" height="2" fill="currentColor" />
    <rect x="11" y="5" width="2" height="2" fill="currentColor" />
    <rect x="11" y="3" width="2" height="2" fill="currentColor" />
    <rect x="13" y="3" width="2" height="2" fill="currentColor" />
  </svg>`,
  signIn: svg`<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="9" y="2" width="6" height="2" fill="currentColor" />
    <rect x="9" y="10" width="6" height="2" fill="currentColor" />
    <rect x="15" y="4" width="2" height="6" fill="currentColor" />
    <rect x="7" y="4" width="2" height="6" fill="currentColor" />
    <rect x="4" y="18" width="2" height="4" fill="currentColor" />
    <rect x="18" y="18" width="2" height="4" fill="currentColor" />
    <rect x="8" y="14" width="8" height="2" fill="currentColor" />
    <rect x="6" y="16" width="2" height="2" fill="currentColor" />
    <rect x="16" y="16" width="2" height="2" fill="currentColor" />
  </svg>`,
};
