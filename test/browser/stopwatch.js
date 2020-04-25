import { html, fixture, expect } from "@open-wc/testing";

import "../../src/browser/stopwatch.js";

describe("Stopwatch", function () {
  it("test", async function () {
    const el = await fixture(html`<wc-stopwatch></wc-stopwatch>`);
    expect(el).shadowDom.to.equal(`
      <span>00:00:00</span>
      <button>Start</button>
      <button>Reset</button>
    `);
  });
});
