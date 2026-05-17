import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import "../../src/frontend/edit-label.js";

describe("phg-edit-label", () => {
  it("renders the current value and pencil icon in view mode", async () => {
    const element = await fixture(
      html`<phg-edit-label value="Editable label"></phg-edit-label>`,
    );

    const labelButton = element.shadowRoot.querySelector(".label-button");
    const editButton = element.shadowRoot.querySelector(
      'button[aria-label="Edit label"]',
    );

    expect(labelButton.textContent.trim()).to.equal("Editable label");
    expect(editButton.querySelector("svg")).to.exist;
    expect(element.shadowRoot.querySelector("input")).to.not.exist;
  });

  it("switches to edit mode and focuses the input when the text is clicked", async () => {
    const element = await fixture(
      html`<phg-edit-label value="Table name"></phg-edit-label>`,
    );

    element.shadowRoot.querySelector(".label-button").click();
    await element.updateComplete;

    const input = element.shadowRoot.querySelector("input");
    expect(element.editing).to.equal(true);
    expect(input.value).to.equal("Table name");
    expect(element.shadowRoot.activeElement).to.equal(input);
  });

  it("switches to edit mode when the pencil icon is clicked", async () => {
    const element = await fixture(
      html`<phg-edit-label value="Table name"></phg-edit-label>`,
    );

    element.shadowRoot.querySelector('button[aria-label="Edit label"]').click();
    await element.updateComplete;

    expect(element.editing).to.equal(true);
    expect(element.shadowRoot.querySelector("input")).to.exist;
  });

  it("submits with Enter and emits value-changed", async () => {
    const element = await fixture(
      html`<phg-edit-label value="Old name"></phg-edit-label>`,
    );

    element.startEditing();
    await element.updateComplete;

    const input = element.shadowRoot.querySelector("input");
    input.value = "New name";
    input.dispatchEvent(new Event("input"));
    setTimeout(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          composed: true,
        }),
      );
    });

    const event = await oneEvent(element, "value-changed");
    await element.updateComplete;

    expect(event.detail.value).to.equal("New name");
    expect(element.value).to.equal("New name");
    expect(element.editing).to.equal(false);
  });

  it("submits with the check icon button", async () => {
    const element = await fixture(
      html`<phg-edit-label value="Old name"></phg-edit-label>`,
    );

    element.startEditing();
    await element.updateComplete;

    const input = element.shadowRoot.querySelector("input");
    input.value = "Saved name";
    input.dispatchEvent(new Event("input"));
    setTimeout(() => {
      element.shadowRoot
        .querySelector('button[aria-label="Save label"]')
        .click();
    });

    const event = await oneEvent(element, "value-changed");
    await element.updateComplete;

    expect(event.detail.value).to.equal("Saved name");
    expect(
      element.shadowRoot.querySelector(".label-button").textContent.trim(),
    ).to.equal("Saved name");
  });

  it("cancels with Escape and restores the committed value", async () => {
    const element = await fixture(
      html`<phg-edit-label value="Original"></phg-edit-label>`,
    );

    element.startEditing();
    await element.updateComplete;

    const input = element.shadowRoot.querySelector("input");
    input.value = "Draft";
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        composed: true,
      }),
    );
    await element.updateComplete;

    expect(element.value).to.equal("Original");
    expect(element.editing).to.equal(false);
    expect(
      element.shadowRoot.querySelector(".label-button").textContent.trim(),
    ).to.equal("Original");
  });

  it("cancels with the cross icon button", async () => {
    const element = await fixture(
      html`<phg-edit-label value="Original"></phg-edit-label>`,
    );

    element.startEditing();
    await element.updateComplete;

    const input = element.shadowRoot.querySelector("input");
    input.value = "Draft";
    input.dispatchEvent(new Event("input"));
    element.shadowRoot
      .querySelector('button[aria-label="Cancel editing"]')
      .click();
    await element.updateComplete;

    expect(element.value).to.equal("Original");
    expect(element.editing).to.equal(false);
  });
});
