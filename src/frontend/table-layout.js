/** Keep seat identity independent of its position around the local player. */
export function visualSeat(index, seats) {
  const hero = Math.max(
    0,
    seats.findIndex((seat) => seat.isCurrentPlayer),
  );
  return (index - hero + seats.length) % seats.length;
}

/** A shared, measured stage for live tables and hand history. */
class TableLayout extends HTMLElement {
  connectedCallback() {
    this._observer = new ResizeObserver(([entry]) => {
      if (!entry) throw new Error("Table resize observer received no entry");
      const { width, height } = entry.contentRect;
      const portrait = width < height;
      const logicalWidth = portrait ? 400 : 800;
      const logicalHeight = portrait ? 700 : 400;
      // Outward seats need a gutter beyond the surface's positioning grid.
      const footprintWidth = logicalWidth + (portrait ? 40 : 80);
      const footprintHeight = logicalHeight + 40;
      this.dataset.layout = portrait ? "portrait" : "landscape";
      this.style.setProperty("--table-width", `${logicalWidth}px`);
      this.style.setProperty("--table-height", `${logicalHeight}px`);
      this.style.setProperty(
        "--table-scale",
        // Cap enlargement so table text stays proportional to the page chrome.
        String(
          Math.min(
            1.25,
            Math.min(width, portrait ? 500 : 1000) / footprintWidth,
            Math.min(height, portrait ? 875 : 500) / footprintHeight,
          ),
        ),
      );
    });
    this._observer.observe(this);
  }

  disconnectedCallback() {
    this._observer?.disconnect();
  }
}

customElements.define("phg-table-layout", TableLayout);
