import { fixture, fixtureSync, expect, html } from "@open-wc/testing";
import { sendKeys, sendMouse } from "@web/test-runner-commands";
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

    it("opens as a modal dialog over an inert page", async () => {
      const element = await fixture(html`<phg-modal title="Test"></phg-modal>`);

      const dialog = element.querySelector("dialog");
      expect(dialog.matches(":modal")).to.equal(true);
      expect(dialog.getAttribute("aria-label")).to.equal("Test");
    });

    it("tolerates removal before its first render", async () => {
      const modal = document.createElement("phg-modal");
      document.body.append(modal);
      modal.remove();

      await modal.updateComplete;

      expect(modal.querySelector("dialog").open).to.equal(false);
    });

    it("reopens as a modal when moved in the document", async () => {
      const element = await fixture(html`<phg-modal title="Test"></phg-modal>`);
      const parent = element.parentElement;

      element.remove();
      parent.append(element);

      expect(element.querySelector("dialog").matches(":modal")).to.equal(true);
    });

    it("keeps the close button visible while long content scrolls", async () => {
      const element = await fixture(
        html`<phg-modal
          title="Test"
          .content=${html`<div style="height: 200vh">Long content</div>`}
        ></phg-modal>`,
      );
      const modal = element.querySelector(".modal");
      const content = element.querySelector(".modal-content");
      const closeButton = element.querySelector(".modal-close");
      const closeButtonTop = closeButton.getBoundingClientRect().top;

      content.scrollTop = content.scrollHeight;

      expect(content.scrollTop).to.be.greaterThan(0);
      expect(modal.scrollTop).to.equal(0);
      expect(closeButton.getBoundingClientRect().top).to.equal(closeButtonTop);
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

    it("emits close event when backdrop clicked", async () => {
      let closeEvent = null;
      await fixture(
        html`<phg-modal
          title="Test"
          @close=${(e) => {
            closeEvent = e;
          }}
        ></phg-modal>`,
      );

      await sendMouse({ type: "click", position: [2, 2] });

      expect(closeEvent).to.exist;
    });

    it("stays open when a drag inside the dialog ends on the backdrop", async () => {
      let closeEvent = null;
      const element = await fixture(
        html`<phg-modal
          title="Test"
          @close=${(e) => {
            closeEvent = e;
          }}
        ></phg-modal>`,
      );
      const dialog = element.querySelector("dialog");

      // A drag's click targets the nearest common ancestor: the dialog.
      element
        .querySelector("h3")
        .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      dialog.dispatchEvent(
        new MouseEvent("click", { bubbles: true, clientX: 2, clientY: 2 }),
      );

      expect(closeEvent).to.be.null;
    });

    it("emits close event when ESC key pressed", async () => {
      let closeEvent = null;
      const element = await fixture(
        html`<phg-modal
          title="Test"
          @close=${(e) => {
            closeEvent = e;
          }}
        ></phg-modal>`,
      );

      await sendKeys({ press: "Escape" });

      expect(closeEvent).to.exist;
      // The owner removes the modal; Escape alone does not close it.
      expect(element.querySelector("dialog").open).to.equal(true);
    });
  });

  describe("focus", () => {
    it("focuses the autofocus element when opened", async () => {
      const element = await fixture(
        html`<phg-modal
          title="Test"
          .content=${html`<button>First</button><input autofocus />`}
        ></phg-modal>`,
      );

      expect(document.activeElement).to.equal(element.querySelector("input"));
    });

    it("focuses the content instead of the close button by default", async () => {
      const element = await fixture(
        html`<phg-modal
          title="Test"
          .content=${html`<button>First</button>`}
        ></phg-modal>`,
      );

      expect(document.activeElement).to.equal(
        element.querySelector(".modal-content"),
      );
    });

    it("returns focus to the opener when removed", async () => {
      const container = fixtureSync(
        html`<div><button id="opener">Open</button></div>`,
      );
      const opener = container.querySelector("#opener");
      opener.focus();
      const modal = document.createElement("phg-modal");
      modal.content = html`<input autofocus />`;
      container.append(modal);
      await modal.updateComplete;
      expect(document.activeElement).to.equal(modal.querySelector("input"));

      modal.remove();

      expect(document.activeElement).to.equal(opener);
    });
  });
});
