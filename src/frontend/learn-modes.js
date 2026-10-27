import { html, LitElement } from "lit";
import { ICONS } from "./icons.js";

const MODES = [
  {
    href: "/learn/preflop",
    icon: ICONS.learn,
    title: "Preflop trainer",
    text: "Decide how to play a hand before the flop, then compare your mix and sizing with the reference charts.",
  },
  {
    href: "/learn/bots",
    icon: ICONS.bot,
    title: "Play vs bots",
    text: "Play full hands at a private six-handed table against five bots. There is no clock, so take your time.",
  },
];

/** The Learn section's start page: one card per training mode. */
class LearnModes extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`<main class="main">
      <article class="static-article">
        <h1>Learn</h1>
        <p>Two ways to practise, free and with no account needed.</p>
        <nav class="learn-modes" aria-label="Training modes">
          ${MODES.map(
            ({ href, icon, title, text }) =>
              html`<a class="learn-mode" href=${href}>
                <span class="learn-mode-title">${icon} ${title}</span>
                <span class="learn-mode-text">${text}</span>
              </a>`,
          )}
        </nav>
      </article>
    </main>`;
  }
}

customElements.define("phg-learn-modes", LearnModes);
