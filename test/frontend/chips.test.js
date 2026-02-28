import { fixture, expect, html } from "@open-wc/testing";
import "./setup.js";

describe("phg-chips", () => {
  it("renders no chips for zero or negative amounts", async () => {
    const zero = await fixture(html`<phg-chips .amount=${0}></phg-chips>`);
    await zero.updateComplete;
    expect(zero.shadowRoot.querySelectorAll(".chip").length).to.equal(0);

    const negative = await fixture(
      html`<phg-chips .amount=${-100}></phg-chips>`,
    );
    await negative.updateComplete;
    expect(negative.shadowRoot.querySelectorAll(".chip").length).to.equal(0);
  });

  it("keeps large tournament bet stacks at four columns or fewer", async () => {
    const element = await fixture(
      html`<phg-chips .amount=${495000}></phg-chips>`,
    );
    await element.updateComplete;

    const columns = element.shadowRoot.querySelectorAll(".column");
    expect(columns.length).to.be.at.most(4);
  });

  it("keeps max sit and go total stack at four columns or fewer", async () => {
    const element = await fixture(
      html`<phg-chips .amount=${3000000}></phg-chips>`,
    );
    await element.updateComplete;

    const columns = element.shadowRoot.querySelectorAll(".column");
    expect(columns.length).to.be.at.most(4);
  });

  it("applies configurable base and stripe colors", async () => {
    const element = await fixture(html`<phg-chips .amount=${5}></phg-chips>`);
    await element.updateComplete;

    const chip = element.shadowRoot.querySelector(".chip");
    expect(chip.style.getPropertyValue("--c").trim()).to.equal("#cc3333");
    expect(chip.style.getPropertyValue("--s").trim()).to.equal("#f6d74a");
  });

  it("falls back to nearest known style for generated denominations", async () => {
    const element = await fixture(
      html`<phg-chips .amount=${25000000}></phg-chips>`,
    );
    await element.updateComplete;

    const chip = element.shadowRoot.querySelector(".chip");
    expect(chip.style.getPropertyValue("--c").trim()).to.equal("#ccaa22");
    expect(chip.style.getPropertyValue("--s").trim()).to.equal("#5a2d0c");
  });
});
