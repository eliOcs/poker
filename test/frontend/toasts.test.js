import { fixture, expect, html } from "@open-wc/testing";
import "../../src/frontend/toasts.js";

describe("phg-toasts", () => {
  it("stacks toasts in order and announces errors assertively", async () => {
    const element = await fixture(
      html`<phg-toasts
        .toasts=${[
          { message: "Settings saved", variant: "success" },
          { message: "Unable to sign in", variant: "error" },
        ]}
      ></phg-toasts>`,
    );

    const toasts = [...element.querySelectorAll(".toast")];
    expect(toasts.map((toast) => toast.textContent.trim())).to.deep.equal([
      "Settings saved",
      "Unable to sign in",
    ]);
    expect(toasts.map((toast) => toast.getAttribute("role"))).to.deep.equal([
      "status",
      "alert",
    ]);
    expect(toasts[1].classList.contains("toast--error")).to.equal(true);
  });

  it("makes a toast with an action a link", async () => {
    const element = await fixture(
      html`<phg-toasts
        .toasts=${[
          {
            message: "Your turn to act",
            variant: "warning",
            action: { label: "Back to table", href: "/cash/table1" },
          },
        ]}
      ></phg-toasts>`,
    );

    const link = element.querySelector(".toast a");
    expect(link.getAttribute("href")).to.equal("/cash/table1");
    expect(link.textContent).to.include("Your turn to act");
    expect(link.textContent).to.include("Back to table");
  });

  it("asks to dismiss the clicked toast", async () => {
    const toasts = [
      { message: "First", variant: "info" },
      { message: "Second", variant: "info" },
    ];
    let dismissed;
    const element = await fixture(
      html`<phg-toasts
        .toasts=${toasts}
        @dismiss=${(event) => {
          dismissed = event.detail;
        }}
      ></phg-toasts>`,
    );

    element.querySelectorAll(".toast")[1].click();

    expect(dismissed).to.equal(toasts[1]);
  });

  it("shows in the top layer only while it has toasts", async () => {
    const element = await fixture(html`<phg-toasts></phg-toasts>`);
    expect(element.matches(":popover-open")).to.equal(false);

    element.toasts = [{ message: "Unable to save settings", variant: "error" }];
    await element.updateComplete;
    expect(element.matches(":popover-open")).to.equal(true);

    element.toasts = [];
    await element.updateComplete;
    expect(element.matches(":popover-open")).to.equal(false);
  });
});
