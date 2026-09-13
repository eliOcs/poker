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
      const maxScale = 1.5;
      const layout = portrait
        ? { width: 400, height: 700, gutter: 24 }
        : { width: 800, height: 400, gutter: 40 };
      // Outward seats need a gutter beyond the surface's positioning grid.
      const footprintWidth = layout.width + layout.width / 10;
      const availableWidth = Math.min(width, layout.width * maxScale);
      const availableHeight = Math.min(height, layout.height * maxScale);
      const widthScale = availableWidth / footprintWidth;
      // Tall portrait stages can extend the felt without enlarging the cards.
      // Keep 20px above the seats and 4px below the local player's nameplate.
      const logicalHeight =
        portrait && widthScale > 0
          ? Math.max(
              layout.height,
              availableHeight / widthScale - layout.gutter,
            )
          : layout.height;
      const footprintHeight = logicalHeight + layout.gutter;
      this.dataset.layout = portrait ? "portrait" : "landscape";
      this.style.setProperty("--table-width", `${layout.width}px`);
      this.style.setProperty("--table-height", `${logicalHeight}px`);
      this.style.setProperty("--table-offset-y", portrait ? "8px" : "0px");
      this.style.setProperty(
        "--table-scale",
        // Cap enlargement so table text stays proportional to the page chrome.
        String(
          Math.min(maxScale, widthScale, availableHeight / footprintHeight),
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
