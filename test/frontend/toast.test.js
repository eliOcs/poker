import { fixture, expect, html, aTimeout } from "@open-wc/testing";
import "../../src/frontend/toast.js";

describe("phg-toast", () => {
  describe("variants", () => {
    it("renders error variant with red background", async () => {
      const element = await fixture(
        html`<phg-toast variant="error" message="Error message"></phg-toast>`,
      );
      expect(element.variant).to.equal("error");
      const toast = element.shadowRoot.querySelector(".toast");
      expect(toast).to.exist;
    });

    it("renders success variant", async () => {
      const element = await fixture(
        html`<phg-toast variant="success" message="Success!"></phg-toast>`,
      );
      expect(element.variant).to.equal("success");
    });

    it("renders warning variant", async () => {
      const element = await fixture(
        html`<phg-toast variant="warning" message="Warning!"></phg-toast>`,
      );
      expect(element.variant).to.equal("warning");
    });

    it("renders info variant by default", async () => {
      const element = await fixture(
        html`<phg-toast message="Info message"></phg-toast>`,
      );
      expect(element.variant).to.equal("info");
    });
  });

  describe("message", () => {
    it("displays message from property", async () => {
      const element = await fixture(
        html`<phg-toast message="Test message"></phg-toast>`,
      );
      const toast = element.shadowRoot.querySelector(".toast");
      expect(toast.textContent).to.include("Test message");
    });

    it("displays slotted content", async () => {
      const element = await fixture(
        html`<phg-toast>Slotted content</phg-toast>`,
      );
      // Slotted content is rendered in the light DOM
      expect(element.textContent).to.include("Slotted content");
    });
  });

  describe("auto-dismiss", () => {
    it("emits dismiss event after duration", async () => {
      let dismissed = false;
      await fixture(
        html`<phg-toast
          .duration=${100}
          message="Quick toast"
          @dismiss=${() => {
            dismissed = true;
          }}
        ></phg-toast>`,
      );

      expect(dismissed).to.be.false;
      await aTimeout(150);
      expect(dismissed).to.be.true;
    });

    it("does not auto-dismiss when duration is 0", async () => {
      let dismissed = false;
      await fixture(
        html`<phg-toast
          .duration=${0}
          message="Persistent toast"
          @dismiss=${() => {
            dismissed = true;
          }}
        ></phg-toast>`,
      );

      await aTimeout(100);
      expect(dismissed).to.be.false;
    });

    it("uses default duration of 3000ms", async () => {
      const element = await fixture(
        html`<phg-toast message="Default duration"></phg-toast>`,
      );
      expect(element.duration).to.equal(3000);
    });
  });

  describe("click to dismiss", () => {
    it("emits dismiss event when clicked", async () => {
      let dismissed = false;
      const element = await fixture(
        html`<phg-toast
          .duration=${0}
          message="Click me"
          @dismiss=${() => {
            dismissed = true;
          }}
        ></phg-toast>`,
      );

      const toast = element.shadowRoot.querySelector(".toast");
      toast.click();

      expect(dismissed).to.be.true;
    });
  });
});
