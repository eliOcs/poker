import { html, fixture, elementUpdated, expect } from "@open-wc/testing";
import sinon from "sinon";

import "../src/stopwatch.js";

describe("Stopwatch", function () {
  let el;
  let websocket;

  beforeEach(async function () {
    websocket = { send: sinon.stub() };
    sinon.stub(window, "WebSocket").returns(websocket);
    el = await fixture(html`<wc-stopwatch></wc-stopwatch>`);
  });

  afterEach(function () {
    WebSocket.restore();
  });

  it("should show loading", function () {
    expect(el).shadowDom.to.equal(`<span>Loading ...</span>`);
  });

  describe("when backend sends data", function () {
    beforeEach(async function () {
      websocket.onmessage({
        data: JSON.stringify({ time: "01:02:03", running: false }),
      });
      await elementUpdated(el);
    });

    it("should show time", function () {
      expect(el.shadowRoot)
        .to.have.descendant("[data-test=time]")
        .and.have.text("01:02:03");
    });

    it("should show reset button", function () {
      expect(el.shadowRoot)
        .to.have.descendant("[data-test=reset]")
        .and.have.text("Reset");
    });

    describe("when reset button is clicked", function () {
      it("should send reset message to server", function () {
        el.shadowRoot.querySelector("[data-test=reset]").click();
        sinon.assert.calledWith(websocket.send, "reset");
      });
    });

    describe("when is running", function () {
      beforeEach(async function () {
        websocket.onmessage({
          data: JSON.stringify({ time: "01:02:03", running: true }),
        });
        await elementUpdated(el);
      });

      it("should show stop button", function () {
        expect(el.shadowRoot)
          .to.have.descendant("[data-test=stop]")
          .and.have.text("Stop");
      });

      describe("when stop button is clicked", function () {
        it("should send stop message to server", function () {
          el.shadowRoot.querySelector("[data-test=stop]").click();
          sinon.assert.calledWith(websocket.send, "stop");
        });
      });
    });

    describe("when not running", function () {
      beforeEach(async function () {
        websocket.onmessage({
          data: JSON.stringify({ time: "01:02:03", running: false }),
        });
        await elementUpdated(el);
      });

      it("should show start button", function () {
        expect(el.shadowRoot)
          .to.have.descendant("[data-test=start]")
          .and.have.text("Start");
      });

      describe("when start button is clicked", function () {
        it("should send start message to server", function () {
          el.shadowRoot.querySelector("[data-test=start]").click();
          sinon.assert.calledWith(websocket.send, "start");
        });
      });
    });
  });
});
