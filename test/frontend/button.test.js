import { fixture, expect, html } from "@open-wc/testing";
import "../../src/frontend/button.js";

describe("phg-button", () => {
  it("renders label text from the default slot", async () => {
    const element = await fixture(html`<phg-button>Check</phg-button>`);
    const button = element.shadowRoot.querySelector("button");
    expect(button).to.exist;
    const labelSlot = element.shadowRoot.querySelector("slot:not([name])");
    const labelText = labelSlot
      .assignedNodes({ flatten: true })
      .map((node) => node.textContent)
      .join(" ");
    expect(labelText).to.include("Check");
  });

  it("hides icon container when no icon is provided", async () => {
    const element = await fixture(html`<phg-button>Fold</phg-button>`);
    const iconContainer = element.shadowRoot.querySelector(".icon");
    expect(iconContainer).to.exist;
    expect(iconContainer.hasAttribute("hidden")).to.equal(true);
  });

  it("renders icon slot content when an icon is provided", async () => {
    const element = await fixture(html`
      <phg-button>
        <svg slot="icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="0" y="0" width="4" height="4"></rect>
        </svg>
        Call the clock
      </phg-button>
    `);
    await element.updateComplete;
    await element.updateComplete;

    const iconContainer = element.shadowRoot.querySelector(".icon");
    expect(iconContainer).to.exist;
    expect(iconContainer.hasAttribute("hidden")).to.equal(false);

    const iconSlot = element.shadowRoot.querySelector('slot[name="icon"]');
    expect(iconSlot.assignedElements({ flatten: true }).length).to.equal(1);
    const labelSlot = element.shadowRoot.querySelector("slot:not([name])");
    const labelText = labelSlot
      .assignedNodes({ flatten: true })
      .map((node) => node.textContent)
      .join(" ");
    expect(labelText).to.include("Call the clock");
  });
});
