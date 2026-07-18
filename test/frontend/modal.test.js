import { fixture, expect, html } from "@open-wc/testing";
import "../../src/frontend/modal.js";

describe("phg-modal", () => {
  describe("rendering", () => {
    it("renders with title", async () => {
      const element = await fixture(
        html`<phg-modal title="Test Modal"></phg-modal>`,
      );

      const header = element.querySelector("h3");
      expect(header.textContent).to.equal("Test Modal");
    });

    it("renders template content", async () => {
      const element = await fixture(
        html`<phg-modal
          title="Test"
          .content=${html`<p>Modal content</p>`}
        ></phg-modal>`,
      );

      expect(element.querySelector("p").textContent).to.equal("Modal content");
    });

    it("has close button", async () => {
      const element = await fixture(html`<phg-modal title="Test"></phg-modal>`);

      const closeBtn = element.querySelector(".modal-close");
      expect(closeBtn).to.exist;
    });

    it("has overlay", async () => {
      const element = await fixture(html`<phg-modal title="Test"></phg-modal>`);

      const overlay = element.querySelector(".modal-overlay");
      expect(overlay).to.exist;
    });
  });

  describe("close behavior", () => {
    it("emits close event when close button clicked", async () => {
      let closeEvent = null;
      const element = await fixture(
        html`<phg-modal
          title="Test"
          @close=${(e) => {
            closeEvent = e;
          }}
        ></phg-modal>`,
      );

      const closeBtn = element.querySelector(".modal-close");
      closeBtn.click();

      expect(closeEvent).to.exist;
    });

    it("emits close event when overlay clicked", async () => {
      let closeEvent = null;
      const element = await fixture(
        html`<phg-modal
          title="Test"
          @close=${(e) => {
            closeEvent = e;
          }}
        ></phg-modal>`,
      );

      const overlay = element.querySelector(".modal-overlay");
      overlay.click();

      expect(closeEvent).to.exist;
    });

    it("emits close event when ESC key pressed", async () => {
      let closeEvent = null;
      await fixture(
        html`<phg-modal
          title="Test"
          @close=${(e) => {
            closeEvent = e;
          }}
        ></phg-modal>`,
      );

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(closeEvent).to.exist;
    });

    it("does not emit close event for other keys", async () => {
      let closeEvent = null;
      await fixture(
        html`<phg-modal
          title="Test"
          @close=${(e) => {
            closeEvent = e;
          }}
        ></phg-modal>`,
      );

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(closeEvent).to.be.null;
    });

    it("removes keydown listener on disconnect", async () => {
      let closeEvent = null;
      const element = await fixture(
        html`<phg-modal
          title="Test"
          @close=${(e) => {
            closeEvent = e;
          }}
        ></phg-modal>`,
      );

      element.remove();

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(closeEvent).to.be.null;
    });
  });
});
