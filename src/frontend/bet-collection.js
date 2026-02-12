import "./chips.js";

/**
 * Snapshots the positions of bet indicators and the pot target,
 * relative to a container element. Must be called before Lit re-renders.
 */
export function snapshotBetPositions(shadowRoot, bets) {
  const container = shadowRoot?.querySelector("#container");
  const potEl = shadowRoot
    ?.querySelector("phg-board")
    ?.shadowRoot?.querySelector(".pot");
  if (!container || !potEl) return null;

  const cRect = container.getBoundingClientRect();
  const tRect = potEl.getBoundingClientRect();
  const cx = tRect.left - cRect.left + tRect.width / 2;
  const cy = tRect.top - cRect.top + tRect.height / 2;

  const sources = bets
    .map(({ index, bet }) => {
      const betEl = shadowRoot
        .querySelector(`phg-seat[data-seat="${index}"]`)
        ?.shadowRoot?.querySelector(".bet-indicator");
      if (!betEl) return null;
      const r = betEl.getBoundingClientRect();
      return {
        amount: bet,
        left: r.left - cRect.left,
        top: r.top - cRect.top,
        targetLeft: cx,
        targetTop: cy,
      };
    })
    .filter(Boolean);

  return sources.length > 0 ? sources : null;
}

/**
 * Creates temporary chip clones and animates them sliding to the pot.
 */
export function animateBetCollection(container, sources) {
  for (const src of sources) {
    const chip = document.createElement("phg-chips");
    chip.amount = src.amount;
    chip.classList.add("collecting-chip");
    chip.style.left = `${src.left}px`;
    chip.style.top = `${src.top}px`;
    container.appendChild(chip);

    const dx = src.targetLeft - src.left;
    const dy = src.targetTop - src.top;

    chip.animate(
      [
        { transform: "translate(0, 0)" },
        { transform: `translate(${dx}px, ${dy}px)` },
      ],
      { duration: 400, easing: "ease-in", fill: "forwards" },
    ).onfinish = () => chip.remove();
  }
}
