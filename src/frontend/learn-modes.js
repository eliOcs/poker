import { html, LitElement } from "lit";
import { ICONS } from "./icons.js";

const MODES = [
  {
    href: "/learn/preflop",
    icon: ICONS.learn,
    title: "Preflop trainer",
    text: "Decide how to play a hand before the flop, then compare your mix and sizing with the reference charts.",
    action: "Start training",
  },
  {
    href: "/learn/bots",
    icon: ICONS.bot,
    title: "Play vs bots",
    text: "Play full hands at a private six-handed table against five bots. There is no clock, so take your time.",
    action: "Take a seat",
  },
];

/** The Learn section's start page: one card per training mode. */
class LearnModes extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`<div class="main">
      <div class="content">
        <section class="panel">
          <div class="eyebrow">Learn</div>
          <h1>Training modes</h1>
          <p class="intro">
            Two ways to practice, free and with no account needed.
          </p>
          <div class="modes">
            ${MODES.map(
              ({ href, icon, title, text, action }) =>
                html`<article class="mode">
                  <h2>${icon} ${title}</h2>
                  <p>${text}</p>
                  <a class="button" href=${href}>${action}</a>
                </article>`,
            )}
          </div>
        </section>
      </div>
    </div>`;
  }
}

customElements.define("phg-learn-modes", LearnModes);
