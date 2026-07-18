import { fixture, expect, html } from "@open-wc/testing";
import { createMockHandList, mockOhhHand, mockOhhHandView } from "./setup.js";

describe("phg-history timeline resizing", () => {
  let element;

  function setupTimelineLayout(timelineHeight = 220, mainHeight = 600) {
    const timelinePanel = element.querySelector(".timeline-panel");
    const main = element.querySelector(".main");
    const resizeHandle = element.querySelector(".timeline-resize-handle");
    timelinePanel.getBoundingClientRect = () => ({ height: timelineHeight });
    main.getBoundingClientRect = () => ({ height: mainHeight });
    return { timelinePanel, resizeHandle };
  }

  function dispatchPointer(target, type, clientY) {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientY,
        composed: true,
      }),
    );
  }

  beforeEach(async () => {
    element = await fixture(html`
      <phg-history
        .gameId=${"test123"}
        .handNumber=${1}
        .playerId=${"player1"}
        .handList=${createMockHandList()}
        .hand=${mockOhhHand}
        .view=${mockOhhHandView}
      ></phg-history>
    `);
  });

  it("keeps the resize handle in place when the timeline scrolls", () => {
    const timeline = element.querySelector(".timeline");
    const resizeHandle = element.querySelector(".timeline-resize-handle");
    const timelineContent = element.querySelector(".timeline-content");
    timeline.style.height = "60px";
    timelineContent.style.minHeight = "300px";
    const handleTop = resizeHandle.getBoundingClientRect().top;

    timeline.scrollTop = 40;

    expect(timeline.scrollTop).to.equal(40);
    expect(resizeHandle.getBoundingClientRect().top).to.equal(handleTop);
  });

  it("resizes the timeline when its top border is dragged", async () => {
    const { timelinePanel, resizeHandle } = setupTimelineLayout();

    dispatchPointer(resizeHandle, "pointerdown", 400);
    dispatchPointer(window, "pointermove", 350);
    await element.updateComplete;

    expect(element.timelineHeight).to.equal(270);
    expect(timelinePanel.style.getPropertyValue("--timeline-height")).to.equal(
      "270px",
    );

    dispatchPointer(window, "pointerup", 350);
    dispatchPointer(window, "pointermove", 300);
    expect(element.timelineHeight).to.equal(270);
  });

  it("keeps room for the table when the timeline is expanded", () => {
    const { resizeHandle } = setupTimelineLayout();

    dispatchPointer(resizeHandle, "pointerdown", 400);
    dispatchPointer(window, "pointermove", -1000);

    expect(element.timelineHeight).to.equal(440);
    dispatchPointer(window, "pointerup", -1000);
  });

  it("stops resizing when the pointer is cancelled", () => {
    const { resizeHandle } = setupTimelineLayout();

    dispatchPointer(resizeHandle, "pointerdown", 400);
    dispatchPointer(window, "pointermove", 350);
    dispatchPointer(window, "pointercancel", 350);
    dispatchPointer(window, "pointermove", 300);

    expect(element.timelineHeight).to.equal(270);
  });

  it("supports keyboard resizing", async () => {
    const { resizeHandle } = setupTimelineLayout();

    resizeHandle.focus();
    resizeHandle.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "ArrowUp",
      }),
    );
    await element.updateComplete;

    expect(element.timelineHeight).to.equal(236);
    expect(resizeHandle.getAttribute("role")).to.equal("separator");
    expect(resizeHandle.getAttribute("aria-orientation")).to.equal(
      "horizontal",
    );
  });
});
