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
    expect(iconContainer).to.not.exist;
    const content = element.shadowRoot.querySelector(".content");
    expect(content.classList.contains("no-icon")).to.equal(true);
  });

  it("renders built-in clock icon when icon is set", async () => {
    const element = await fixture(
      html`<phg-button icon="clock">Call the clock</phg-button>`,
    );
    const iconContainer = element.shadowRoot.querySelector(".icon");
    expect(iconContainer).to.exist;
    const content = element.shadowRoot.querySelector(".content");
    expect(content.classList.contains("with-icon")).to.equal(true);

    const icon = iconContainer.querySelector("svg");
    expect(icon).to.exist;
    expect(icon.childElementCount).to.equal(16);
    const labelSlot = element.shadowRoot.querySelector("slot:not([name])");
    const labelText = labelSlot
      .assignedNodes({ flatten: true })
      .map((node) => node.textContent)
      .join(" ");
    expect(labelText).to.include("Call the clock");
  });
});
