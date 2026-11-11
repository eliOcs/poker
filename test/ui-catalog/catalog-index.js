/* global document */
import { html, render } from "lit";
import { TEST_CASES } from "./test-cases.js";

/** @returns {Map<string, string[]>} */
function groupTestCases() {
  const groups = new Map();
  for (const testCase of Object.keys(TEST_CASES)) {
    const [name = testCase] = testCase.split("-");
    groups.set(name, [...(groups.get(name) ?? []), testCase]);
  }
  return groups;
}

render(
  html`${[...groupTestCases()].map(
    ([name, testCases]) =>
      html`<h2>${name}</h2>
        <ul>
          ${testCases.map(
            (testCase) =>
              html`<li>
                <a href=${`/test.html?test=${testCase}`}>${testCase}</a>
              </li>`,
          )}
        </ul>`,
  )}`,
  /** @type {HTMLElement} */ (document.getElementById("test-cases")),
);
