import { fixture, html, expect, waitUntil } from "@open-wc/testing";
import "../../src/frontend/learn.js";

import { learnScenario as scenario } from "./fixtures/learn.js";

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

  it("uses dollar amounts and standard presets for sizing, then submits in big blinds", async () => {
    const el = await fixture(html`<phg-learn></phg-learn>`);
    await waitUntil(() => !el.busy);
    await button(el, "Continue");
    const amount = () => el.querySelector('input[type="number"]');
    expect(Number(amount().value)).to.equal(10);
    await button(el, "Max");
    expect(Number(amount().value)).to.equal(500);
    await button(el, "Min");
    expect(Number(amount().value)).to.equal(10);
    await button(el, "2.5 BB");
    expect(Number(amount().value)).to.equal(12.5);
    amount().value = "20";
    amount().dispatchEvent(new Event("input", { bubbles: true }));
    await el.updateComplete;
    expect(submissions).to.have.length(0);
    await button(el, "Check strategy");
    await waitUntil(() => !el.busy);
    expect(submissions[0].raiseTo).to.equal(4);
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
    expect(el.querySelector('input[type="number"]').value).to.equal("15");
    window.fetch = workingFetch;
    await button(el, "Check strategy");
    await waitUntil(() => !el.busy);
    expect(el.querySelector('[role="alert"]')).to.equal(null);
    expect(submissions[0].raiseTo).to.equal(3);
    expect(submissions[0].frequencies).to.deep.equal([35, 35, 30]);
  });
});
