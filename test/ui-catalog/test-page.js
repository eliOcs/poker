/* global window, document */
/** Renders the test case named in the URL: ?test=<test-id> */
import { render } from "lit";
import { TEST_CASES } from "./test-cases.js";
import { simulateCardChoice } from "./test-cases/card-choice.js";

async function init() {
  const params = new URLSearchParams(window.location.search);
  const testId = params.get("test");
  const root = document.getElementById("root");

  if (!testId) {
    root.innerHTML = `<div style="color: #c0c0d0; padding: 20px; font-family: monospace;">No test case specified. <a href="/" style="color: #36c;">View catalog</a></div>`;
    return;
  }

  const testCase = TEST_CASES[testId];

  if (!testCase) {
    root.innerHTML = `<div style="color: red; padding: 20px;">Unknown test case: ${testId}</div>`;
    return;
  }

  render(testCase(), root);

  if (testId === "game-folded-card-choice") simulateCardChoice(root);

  if (testId === "table-6max" || testId === "table-full-ring") {
    const game = root.querySelector("phg-game");
    await game.updateComplete;
    // Show every marker together for spacing inspection in these fixtures.
    const seats = [...game.querySelectorAll("phg-seat")];
    for (const seat of seats) seat.isButton = true;
    await Promise.all(seats.map((seat) => seat.updateComplete));
  }
}

init();
