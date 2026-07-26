import { fixture, expect, html } from "@open-wc/testing";
import {
  createMockHandList,
  createMockReplay,
  mockOhhHand,
  mockOhhHandWithShowdown,
  mockOhhHandView,
  mockOhhHandWithShowdownView,
} from "./setup.js";

describe("phg-history hand replay", () => {
  let element;

  beforeEach(async () => {
    const replay = createMockReplay(mockOhhHand, "player1", mockOhhHandView);
    element = await fixture(
      html`<phg-history
        .gameId=${"test123"}
        .handNumber=${1}
        .playerId=${"player1"}
        .handList=${createMockHandList()}
        .hand=${mockOhhHand}
        .view=${mockOhhHandView}
        .replay=${replay}
      ></phg-history>`,
    );
    await element.updateComplete;
  });

  it("initially renders the terminal snapshot with boundary controls", async () => {
    expect(element.replayIndex).to.equal(element.replay.steps.length - 1);
    const previous = element.querySelector(
      '[aria-label="Previous replay step"]',
    );
    const next = element.querySelector('[aria-label="Next replay step"]');
    expect(previous.disabled).to.be.false;
    expect(next.disabled).to.be.true;
    expect(element.querySelector(".replay-progress")).to.not.exist;

    const board = element.querySelector("phg-board");
    await board.updateComplete;
    expect(board.querySelector(".winner-message")).to.exist;
  });

  it("restarts immediately when Play is pressed at the end", async () => {
    element.querySelector('[aria-label="Play replay"]').click();
    await element.updateComplete;

    expect(element.replayIndex).to.equal(0);
    expect(element.isPlaying).to.be.true;
    expect(element.querySelector('[aria-label="Pause replay"]')).to.exist;
    expect(
      element.querySelector('[aria-label="Previous replay step"]').disabled,
    ).to.be.true;
  });

  it("advances after one second and can pause and resume in place", async () => {
    element.togglePlayback();
    await new Promise((resolve) => setTimeout(resolve, 1050));
    await element.updateComplete;

    expect(element.replayIndex).to.equal(1);
    element.togglePlayback();
    expect(element.isPlaying).to.be.false;
    expect(element.replayIndex).to.equal(1);

    element.togglePlayback();
    expect(element.isPlaying).to.be.true;
    expect(element.replayIndex).to.equal(1);
    element.stopPlayback();
  });

  it("pauses playback before a manual step", () => {
    element.togglePlayback();
    element.advancePlayback();
    expect(element.replayIndex).to.equal(1);

    element.stepReplay(-1);
    expect(element.isPlaying).to.be.false;
    expect(element.replayIndex).to.equal(0);
  });

  it("stops automatically on the terminal snapshot", () => {
    element.replayIndex = element.replay.steps.length - 2;
    element.isPlaying = true;
    element.advancePlayback();

    expect(element.replayIndex).to.equal(element.replay.steps.length - 1);
    expect(element.isPlaying).to.be.false;
    expect(element.replayTimer).to.be.undefined;
  });

  it("resets to the new hand's terminal snapshot and cancels playback", async () => {
    element.togglePlayback();
    expect(element.replayIndex).to.equal(0);

    element.handNumber = 2;
    element.replay = createMockReplay(mockOhhHand, "player1", mockOhhHandView);
    await element.updateComplete;

    expect(element.isPlaying).to.be.false;
    expect(element.replayIndex).to.equal(element.replay.steps.length - 1);
    expect(element.replayTimer).to.be.undefined;
  });

  it("cleans up its timer when disconnected", () => {
    element.togglePlayback();
    expect(element.replayTimer).to.exist;

    element.remove();
    expect(element.isPlaying).to.be.false;
    expect(element.replayTimer).to.be.undefined;
  });

  it("renders replay snapshots and highlights timeline progress", async () => {
    element.togglePlayback();
    await element.updateComplete;

    const board = element.querySelector("phg-board");
    await board.updateComplete;
    expect(board.querySelector(".winner-message")).to.not.exist;
    expect(
      element.querySelectorAll(".action-item.future").length,
    ).to.be.greaterThan(0);

    element.stepReplay(1);
    await element.updateComplete;
    expect(element.querySelector(".action-item.active")).to.exist;
  });

  it("wraps showdown cards when the result entry is narrow", async () => {
    element.hand = mockOhhHandWithShowdown;
    element.view = mockOhhHandWithShowdownView;
    element.replay = createMockReplay(
      mockOhhHandWithShowdown,
      "player1",
      mockOhhHandWithShowdownView,
    );
    await element.updateComplete;

    const showdownCards = element.querySelector(".showdown-cards");
    showdownCards.style.width = "150px";
    const cards = [...showdownCards.querySelectorAll("phg-card")];
    await Promise.all(cards.map((card) => card.updateComplete));

    expect(cards.length).to.equal(5);
    expect(cards.at(-1).getBoundingClientRect().top).to.be.greaterThan(
      cards[0].getBoundingClientRect().top,
    );
  });

  it("provides accessible labels and titles for every control", () => {
    const controls = element.querySelectorAll(".replay-controls .button");
    expect(controls.length).to.equal(3);
    for (const control of controls) {
      expect(control.getAttribute("aria-label")).to.be.a("string").and.not.be
        .empty;
      expect(control.getAttribute("title")).to.equal(
        control.getAttribute("aria-label"),
      );
    }
    expect(controls[1].classList.contains("button--primary")).to.be.true;
    expect(
      [...controls].every((control) =>
        control.classList.contains("button--compact"),
      ),
    ).to.be.true;
  });

  it("uses the pixel-art Play icon", () => {
    const play = element.querySelector('[aria-label="Play replay"]');
    expect(play.querySelector("svg")).to.exist;
    expect(play.querySelector("path").getAttribute("d")).to.equal(
      "M9 5h2v2H9v10h2v2H9v2H7V3h2v2Zm4 12h-2v-2h2v2Zm2-2h-2v-2h2v2Zm2-2h-2v-2h2v2Zm-2-2h-2V9h2v2Zm-2-2h-2V7h2v2Z",
    );
  });

  it("uses the pixel-art Previous Step icon", () => {
    const previous = element.querySelector(
      '[aria-label="Previous replay step"]',
    );
    expect(previous.querySelector("svg")).to.exist;
    expect(previous.querySelector("path").getAttribute("d")).to.equal(
      "M11 19H9V17H7V15H9V9H7V7H9V5H11V19ZM21 19H19V17H17V15H19V9H17V7H19V5H21V19ZM7 15H5V13H7V15ZM17 15H15V13H17V15ZM5 13H3V11H5V13ZM15 13H13V11H15V13ZM7 11H5V9H7V11ZM17 11H15V9H17V11Z",
    );
  });

  it("uses the pixel-art Next Step icon", () => {
    const next = element.querySelector('[aria-label="Next replay step"]');
    expect(next.querySelector("svg")).to.exist;
    expect(next.querySelector("path").getAttribute("d")).to.equal(
      "M5 7H7V9H5V15H7V17H5V19H3V5H5V7ZM15 5V7H17V9H15V15H17V17H15V19H13V5H15ZM9 15H7V13H9V15ZM19 15H17V13H19V15ZM11 13H9V11H11V13ZM21 13H19V11H21V13ZM9 11H7V9H9V11ZM19 11H17V9H19V11Z",
    );
  });

  it("uses the pixel-art Pause icon during playback", async () => {
    element.togglePlayback();
    await element.updateComplete;

    const pause = element.querySelector('[aria-label="Pause replay"]');
    expect(pause.querySelector("svg")).to.exist;
    expect(pause.querySelector("path").getAttribute("d")).to.equal(
      "M10 20H4V4h6v16Zm8-16v16h-6V4h6Zm-4 2v12h2V6h-2ZM6 18h2V6H6v12Z",
    );
    element.stopPlayback();
  });
});
