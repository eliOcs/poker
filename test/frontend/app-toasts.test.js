import { expect } from "@open-wc/testing";
import { dismissToast, showToast } from "../../src/frontend/app-toasts.js";

describe("app-toasts", () => {
  const originalSetTimeout = globalThis.setTimeout;
  /** @type {{ callback: () => void, delay: number }[]} */
  let timers;

  beforeEach(() => {
    timers = [];
    globalThis.setTimeout = (callback, delay) =>
      timers.push({ callback, delay });
  });

  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout;
  });

  it("shows new toasts below earlier ones", () => {
    const app = { toasts: [] };
    showToast(app, { message: "Settings saved", variant: "success" });
    showToast(app, { message: "Unable to sign in", variant: "error" });

    expect(app.toasts).to.deep.equal([
      { message: "Settings saved", variant: "success" },
      { message: "Unable to sign in", variant: "error" },
    ]);
  });

  it("keeps only the three newest toasts", () => {
    const app = { toasts: [] };
    for (const message of ["1", "2", "3", "4"]) {
      showToast(app, { message, variant: "info" });
    }

    expect(app.toasts.map((toast) => toast.message)).to.deep.equal([
      "2",
      "3",
      "4",
    ]);
  });

  it("removes each toast after three seconds", () => {
    const app = { toasts: [] };
    showToast(app, { message: "First", variant: "info" });
    showToast(app, { message: "Second", variant: "info" });

    expect(timers.map((timer) => timer.delay)).to.deep.equal([3000, 3000]);
    timers[0].callback();
    expect(app.toasts.map((toast) => toast.message)).to.deep.equal(["Second"]);
  });

  it("dismisses only the given toast, even when the same message repeats", () => {
    const app = { toasts: [] };
    showToast(app, { message: "Game not found", variant: "error" });
    showToast(app, { message: "Game not found", variant: "error" });
    const [first] = app.toasts;

    dismissToast(app, first);
    expect(app.toasts).to.have.length(1);
    expect(app.toasts[0]).to.not.equal(first);

    timers[0].callback();
    expect(app.toasts).to.have.length(1);
  });
});
