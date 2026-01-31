import { fixture, expect, html } from "@open-wc/testing";
import "../../src/frontend/currency-slider.js";

describe("phg-currency-slider", () => {
  it("displays value in dollars", async () => {
    const el = await fixture(
      html`<phg-currency-slider
        .value=${15000}
        .min=${10000}
        .max=${100000}
      ></phg-currency-slider>`,
    );

    const numberInput = el.shadowRoot.querySelector('input[type="number"]');
    expect(numberInput.value).to.equal("150.00");
  });

  it("sets min/max in dollars on number input", async () => {
    const el = await fixture(
      html`<phg-currency-slider
        .value=${15000}
        .min=${10000}
        .max=${100000}
      ></phg-currency-slider>`,
    );

    const numberInput = el.shadowRoot.querySelector('input[type="number"]');
    expect(numberInput.min).to.equal("100");
    expect(numberInput.max).to.equal("1000");
  });

  it("sets min/max in cents on range input", async () => {
    const el = await fixture(
      html`<phg-currency-slider
        .value=${15000}
        .min=${10000}
        .max=${100000}
      ></phg-currency-slider>`,
    );

    const rangeInput = el.shadowRoot.querySelector('input[type="range"]');
    expect(rangeInput.min).to.equal("10000");
    expect(rangeInput.max).to.equal("100000");
  });

  it("emits value-changed when number input changes", async () => {
    const el = await fixture(
      html`<phg-currency-slider
        .value=${15000}
        .min=${10000}
        .max=${100000}
      ></phg-currency-slider>`,
    );

    let emittedValue = null;
    el.addEventListener("value-changed", (e) => {
      emittedValue = e.detail.value;
    });

    const numberInput = el.shadowRoot.querySelector('input[type="number"]');
    numberInput.value = "200.50";
    numberInput.dispatchEvent(new Event("input"));

    expect(emittedValue).to.equal(20050);
  });

  it("emits value-changed when range input changes", async () => {
    const el = await fixture(
      html`<phg-currency-slider
        .value=${15000}
        .min=${10000}
        .max=${100000}
      ></phg-currency-slider>`,
    );

    let emittedValue = null;
    el.addEventListener("value-changed", (e) => {
      emittedValue = e.detail.value;
    });

    const rangeInput = el.shadowRoot.querySelector('input[type="range"]');
    rangeInput.value = "25000";
    rangeInput.dispatchEvent(new Event("input"));

    expect(emittedValue).to.equal(25000);
  });

  it("increments by step when + button clicked", async () => {
    const el = await fixture(
      html`<phg-currency-slider
        .value=${15000}
        .min=${10000}
        .max=${100000}
        .step=${5000}
      ></phg-currency-slider>`,
    );

    let emittedValue = null;
    el.addEventListener("value-changed", (e) => {
      emittedValue = e.detail.value;
    });

    const buttons = el.shadowRoot.querySelectorAll("phg-button");
    const plusButton = buttons[1]; // Second button is +
    plusButton.click();

    expect(emittedValue).to.equal(20000);
  });

  it("decrements by step when - button clicked", async () => {
    const el = await fixture(
      html`<phg-currency-slider
        .value=${15000}
        .min=${10000}
        .max=${100000}
        .step=${5000}
      ></phg-currency-slider>`,
    );

    let emittedValue = null;
    el.addEventListener("value-changed", (e) => {
      emittedValue = e.detail.value;
    });

    const buttons = el.shadowRoot.querySelectorAll("phg-button");
    const minusButton = buttons[0]; // First button is -
    minusButton.click();

    expect(emittedValue).to.equal(10000);
  });

  it("clamps value to min", async () => {
    const el = await fixture(
      html`<phg-currency-slider
        .value=${15000}
        .min=${10000}
        .max=${100000}
        .step=${10000}
      ></phg-currency-slider>`,
    );

    let emittedValue = null;
    el.addEventListener("value-changed", (e) => {
      emittedValue = e.detail.value;
    });

    const buttons = el.shadowRoot.querySelectorAll("phg-button");
    const minusButton = buttons[0];
    minusButton.click();

    // 15000 - 10000 = 5000, but clamped to min of 10000
    expect(emittedValue).to.equal(10000);
  });

  it("clamps value to max", async () => {
    const el = await fixture(
      html`<phg-currency-slider
        .value=${95000}
        .min=${10000}
        .max=${100000}
        .step=${10000}
      ></phg-currency-slider>`,
    );

    let emittedValue = null;
    el.addEventListener("value-changed", (e) => {
      emittedValue = e.detail.value;
    });

    const buttons = el.shadowRoot.querySelectorAll("phg-button");
    const plusButton = buttons[1];
    plusButton.click();

    // 95000 + 10000 = 105000, but clamped to max of 100000
    expect(emittedValue).to.equal(100000);
  });
});
