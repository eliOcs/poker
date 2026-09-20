import { fixture, html, expect, waitUntil } from "@open-wc/testing";
import "../../src/frontend/learn.js";

import {
  learnScenario as scenario,
  followupScenario,
  openFollowupScenario,
  hijackScenario,
  cutoffScenario,
} from "./fixtures/learn.js";

describe("Learn strategy flow", () => {
  let originalFetch;
  let submissions;
  beforeEach(() => {
    originalFetch = window.fetch;
    submissions = [];
    window.fetch = async (url, options) => {
      if (String(url).endsWith("evaluate")) {
        submissions.push(JSON.parse(options.body));
        return new Response(
          JSON.stringify({
            expected: [0, 50, 50],
            grade: "correct",
            distributionMatch: true,
            playability: {
              cards: [
                { title: "Pocket pair", text: "You already have a pair." },
              ],
              situation: [],
            },
            actionsMatch: true,
            frequencyMatch: true,
            sizingMatch: true,
            raiseTo: 3,
            explanation: "Calling costs half a blind.",
            page: 182,
            chart: 32,
            hands: { AA: [0, 50, 50] },
            rangeTotals: [20, 60, 20],
          }),
        );
      }
      return new Response(JSON.stringify(scenario));
    };
  });
  afterEach(() => {
    window.fetch = originalFetch;
  });
  async function button(el, label) {
    const target = [...el.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === label,
    );
    expect(target, label).to.exist;
    target.click();
    await el.updateComplete;
  }

  async function slide(el, action, value) {
    const input = el.querySelector(`input[aria-label="${action}"]`);
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;
  }

  it("shows all actions without numeric entry and checks the completed mix", async () => {
    const el = await fixture(html`<phg-learn></phg-learn>`);
    await waitUntil(() => !el.busy);
    expect(el.querySelectorAll('input[type="range"]')).to.have.length(3);
    expect(el.querySelector('input[type="number"]')).to.equal(null);
    await slide(el, "Fold", 0);
    await slide(el, "Call", 50);
    expect(el.frequencies).to.deep.equal([0, 50, 50]);
    expect(el.textContent).not.to.include("3 BB");
    await button(el, "Continue");
    expect(submissions).to.have.length(0);
    await button(el, "3 BB");
    expect(submissions).to.have.length(0);
    await button(el, "Check strategy");
    await waitUntil(() => !el.busy);
    expect(submissions[0]).to.deep.equal({
      id: "SB-AA",
      frequencies: [0, 50, 50],
      raiseTo: 3,
    });
    await button(el, "Next hand");
    await waitUntil(() => !el.busy);
    expect(el.frequencies).to.deep.equal([35, 35, 30]);
    expect(el.raiseTo).to.equal(0);
  });

  it("defaults to big blinds for stacks, bets and sizing", async () => {
    const el = await fixture(html`<phg-learn></phg-learn>`);
    await waitUntil(() => !el.busy);
    await button(el, "Continue");
    const amount = () => el.querySelector('input[type="number"]');
    expect(el.querySelector(".current-player .stack").textContent).to.include(
      "99.5 BB",
    );
    expect(
      el.querySelector(".current-player .bet-indicator").textContent,
    ).to.include("0.5 BB");
    expect(el.querySelector(".info-blinds")).not.to.exist;
    expect(Number(amount().value)).to.equal(2);
    await button(el, "Max");
    expect(Number(amount().value)).to.equal(100);
    await button(el, "Min");
    expect(Number(amount().value)).to.equal(2);
    await button(el, "2.5 BB");
    expect(Number(amount().value)).to.equal(2.5);
    amount().value = "4";
    amount().dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;
    expect(submissions).to.have.length(0);
    await button(el, "Check strategy");
    await waitUntil(() => !el.busy);
    expect(submissions[0].raiseTo).to.equal(4);
  });

  it("switches units without changing the chosen bet and submits currency input in BB", async () => {
    const el = await fixture(html`<phg-learn></phg-learn>`);
    await waitUntil(() => !el.busy);
    await button(el, "Continue");
    await button(el, "3 BB");
    el.user = { id: "hero", settings: { amountDisplay: "currency" } };
    await el.updateComplete;
    const amount = el.querySelector('input[type="number"]');
    expect(Number(amount.value)).to.equal(15);
    expect(el.querySelector(".current-player .stack").textContent).to.include(
      "$497.50",
    );
    expect(el.betAmount).to.equal(1500);
    amount.value = "20";
    amount.dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;
    await button(el, "Check strategy");
    await waitUntil(() => !el.busy);
    expect(submissions[0].raiseTo).to.equal(4);
    expect(el.querySelector(".learn-strategy").textContent).to.include(
      "Raise to $15",
    );
  });

  it("supports pure actions and redistributes from zero while preserving 100%", async () => {
    const el = await fixture(html`<phg-learn></phg-learn>`);
    await waitUntil(() => !el.busy);
    for (const [action, value] of [
      ["Fold", 100],
      ["Fold", 0],
      ["Call", 100],
      ["Call", 5],
      ["Raise", 100],
      ["Raise", 0],
    ]) {
      await slide(el, action, value);
      expect(el.frequencies.reduce((a, b) => a + b, 0)).to.equal(100);
      expect(
        el.frequencies.every((n) => n >= 0 && n <= 100 && n % 5 === 0),
      ).to.equal(true);
    }
    await slide(el, "Fold", 100);
    expect(el.querySelector('input[type="number"]')).to.equal(null);
    await button(el, "Check strategy");
    await waitUntil(() => !el.busy);
    expect(submissions[0].frequencies).to.deep.equal([100, 0, 0]);
  });

  it("requires sizing only when raising and accepts calls from LJ", async () => {
    const el = await fixture(html`<phg-learn></phg-learn>`);
    await waitUntil(() => !el.busy);
    el.scenario = { ...scenario, id: "LJ-AA", position: "LJ" };
    await el.updateComplete;
    await slide(el, "Call", 100);
    await button(el, "Check strategy");
    await waitUntil(() => !el.busy);
    expect(submissions[0].frequencies).to.deep.equal([0, 100, 0]);
  });

  it("keeps the strategy and sizing available after a failed evaluation", async () => {
    const el = await fixture(html`<phg-learn></phg-learn>`);
    await waitUntil(() => !el.busy);
    await button(el, "Continue");
    await button(el, "3 BB");
    const workingFetch = window.fetch;
    window.fetch = async () => new Response("Unavailable", { status: 503 });
    await button(el, "Check strategy");
    await waitUntil(() => !el.busy);
    expect(el.querySelector('[role="alert"]').textContent).to.include(
      "try again",
    );
    expect(el.querySelector('input[type="number"]').value).to.equal("3");
    window.fetch = workingFetch;
    await button(el, "Check strategy");
    await waitUntil(() => !el.busy);
    expect(el.querySelector('[role="alert"]')).to.equal(null);
    expect(submissions[0].raiseTo).to.equal(3);
    expect(submissions[0].frequencies).to.deep.equal([35, 35, 30]);
  });

  it("shows opponent probabilities with hover and tap details and respects display units", async () => {
    const fetch = window.fetch;
    window.fetch = async (url, options) => {
      const response = await fetch(url, options);
      if (!String(url).endsWith("evaluate")) return response;
      const result = await response.json();
      result.opponentRange = {
        position: "SB",
        action: "3-bet",
        raiseTo: 10,
        totalWeight: 4,
        hands: Object.fromEntries(
          [..."AKQJT98765432"].flatMap((rank, row, ranks) =>
            ranks.map((other, col) => {
              const hand =
                row === col
                  ? rank + other
                  : row < col
                    ? rank + other + "s"
                    : other + rank + "o";
              return [
                hand,
                {
                  frequency: hand === "AA" ? 100 : hand === "KQs" ? 75 : 0,
                  combinations: hand === "AA" ? 1 : 4,
                  blockedCombinations: hand === "AA" ? 5 : 0,
                  probability: hand === "AA" ? 25 : hand === "KQs" ? 75 : 0,
                },
              ];
            }),
          ),
        ),
      };
      return new Response(JSON.stringify(result));
    };
    const el = await fixture(html`<phg-learn></phg-learn>`);
    await waitUntil(() => !el.busy);
    el.scenario = openFollowupScenario("BTN", "SB");
    await slide(el, "Fold", 100);
    await button(el, "Check strategy");
    await waitUntil(() => !el.busy);
    expect(el.querySelector(".learn-opponent-range")).not.to.exist;
    el.rangeOpen = true;
    await el.updateComplete;
    const section = el.querySelector(".learn-opponent-range");
    expect(section.textContent.replace(/\s+/g, " ")).to.include(
      "Oponent range:",
    );
    expect(section.textContent.replace(/\s+/g, " ")).to.include(
      "Oponent range: Small Blind, 3-bet to 10 BB",
    );
    expect(section.querySelectorAll(".learn-range > *")).to.have.length(169);
    const aces = section.querySelector('[aria-label="AA: 25.00% probability"]');
    const mixed = section.querySelector(
      '[aria-label="KQs: 75.00% probability"]',
    );
    expect(mixed.style.background).to.include("100%");
    expect(section.querySelector('[title="72o: Not in range"]')).to.have.class(
      "legend-unavailable",
    );
    mixed.dispatchEvent(new PointerEvent("pointerenter"));
    const info = mixed.nextElementSibling;
    expect(info.matches(":popover-open")).to.equal(true);
    expect(info.textContent).to.include("75.00% probability");
    expect(info.textContent).to.include("4 available");
    expect(info.textContent.replace(/\s+/g, " ")).to.include(
      "3-bet frequency: 75%",
    );
    expect(info.textContent).not.to.include("after removing your cards");
    mixed.dispatchEvent(new PointerEvent("pointerleave"));
    expect(info.matches(":popover-open")).to.equal(false);
    aces.click();
    expect(aces.nextElementSibling.matches(":popover-open")).to.equal(true);
    expect(aces.nextElementSibling.textContent.replace(/\s+/g, " ")).to.include(
      "1 available combination after removing your cards.",
    );
    aces.focus();
    aces.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(aces.nextElementSibling.matches(":popover-open")).to.equal(false);
    expect(el.querySelector("phg-modal")).to.exist;
    expect(section.querySelector(".selected")).not.to.exist;
    el.user = { settings: { amountDisplay: "currency" } };
    await el.updateComplete;
    expect(section.textContent.replace(/\s+/g, " ")).to.include(
      "Oponent range: Small Blind, 3-bet to $50",
    );
    await button(el, "Next hand");
    await waitUntil(() => !el.busy);
    expect(el.querySelector(".learn-opponent-range")).not.to.exist;
  });

  it("omits opponent ranges for first-in feedback", async () => {
    const el = await fixture(html`<phg-learn></phg-learn>`);
    await waitUntil(() => !el.busy);
    await slide(el, "Fold", 100);
    await button(el, "Check strategy");
    await waitUntil(() => !el.busy);
    el.rangeOpen = true;
    await el.updateComplete;
    expect(el.querySelector("phg-modal")).to.exist;
    expect(el.querySelector(".learn-opponent-range")).not.to.exist;
  });

  for (const [lesson, min, halfPot, pot, raiseTo] of [
    [cutoffScenario("LJ"), 4, 5.75, 9, 8.5],
    [cutoffScenario("HJ"), 4, 5.75, 9, 8.5],
    [cutoffScenario("LJ", true), 37.5, 46.75, 70.5, 100],
    [cutoffScenario("HJ", true), 37.5, 46.75, 70.5, 100],
    [hijackScenario(), 4, 5.75, 9, 8.5],
    [hijackScenario(true), 37.5, 46.75, 70.5, 100],
    [followupScenario(), 6, 7, 10.5, 13],
    [followupScenario(true), 15, 18, 27, 24],
    [openFollowupScenario("BTN", "SB"), 17.5, 20.5, 31, 23],
    [openFollowupScenario("BTN", "BB"), 17.5, 20.25, 30.5, 23],
    [openFollowupScenario("CO", "BTN"), 14.5, 17.75, 27, 23],
    [openFollowupScenario("CO", "SB"), 17.5, 20.5, 31, 23],
    [openFollowupScenario("CO", "BB"), 17.5, 20.25, 30.5, 23],
    [openFollowupScenario("HJ", "CO"), 14.5, 17.75, 27, 23],
    [openFollowupScenario("HJ", "BTN"), 14.5, 17.75, 27, 23],
    [openFollowupScenario("HJ", "SB"), 17.5, 20.5, 31, 23],
    [openFollowupScenario("HJ", "BB"), 17.5, 20.25, 30.5, 23],
    [openFollowupScenario("LJ", "HJ"), 14.5, 17.75, 27, 23],
    [openFollowupScenario("LJ", "CO"), 14.5, 17.75, 27, 23],
    [openFollowupScenario("LJ", "BTN"), 14.5, 17.75, 27, 23],
    [openFollowupScenario("LJ", "SB"), 17.5, 20.5, 31, 23],
    [openFollowupScenario("LJ", "BB"), 17.5, 20.25, 30.5, 23],
  ]) {
    it(`supports legal sizing for ${lesson.title}`, async () => {
      const el = await fixture(html`<phg-learn></phg-learn>`);
      await waitUntil(() => !el.busy);
      el.scenario = lesson;
      await el.updateComplete;
      await button(el, "Continue");
      const amount = () => el.querySelector('input[type="number"]');
      expect(Number(amount().min)).to.equal(min);
      expect(Number(amount().value)).to.equal(min);
      await button(el, "+");
      expect(Number(amount().value)).to.equal(min + 0.5);
      await button(el, "-");
      expect(Number(amount().value)).to.equal(min);
      expect(
        [...el.querySelectorAll("button")].some(
          (button) => button.textContent.trim() === "2.5 BB",
        ),
      ).to.equal(false);
      await button(el, "½ Pot");
      expect(Number(amount().value)).to.equal(halfPot);
      await button(el, "Pot");
      expect(Number(amount().value)).to.equal(pot);
      amount().value = String(raiseTo);
      amount().dispatchEvent(new Event("input", { bubbles: true }));
      await el.updateComplete;
      await button(el, "Check strategy");
      await waitUntil(() => !el.busy);
      expect(submissions[0].id).to.equal(el.scenario.id);
      expect(submissions[0].raiseTo).to.equal(raiseTo);
      el.rangeOpen = true;
      await el.updateComplete;
      expect(el.querySelector("phg-modal").textContent).to.include(
        el.scenario.title,
      );
      expect(el.querySelectorAll(".learn-range span")).to.have.length(169);
      expect(
        [...el.querySelectorAll(".learn-range-total")].map((span) =>
          span.textContent.replace(/\s+/g, " ").trim(),
        ),
      ).to.deep.equal(["Fold 20%", "Call 60%", "Raise 20%"]);
      expect(el.querySelector('[title="72o: Not in range"]')).to.exist;
    });
  }
});
