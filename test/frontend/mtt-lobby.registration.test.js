import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import "../../src/frontend/mtt-lobby.js";
import {
  actionButtonLabels,
  createTournamentView,
  findActionButton,
} from "./mtt-lobby-test-helpers.js";

describe("phg-mtt-lobby registration", () => {
  const originalLocation = window.location.href;

  afterEach(() => {
    history.replaceState({}, "", originalLocation);
  });

  it("opens sign-up instead of registering when the user has no email", async () => {
    const view = createTournamentView();
    view.status = "registration";
    view.currentPlayer = {
      isOwner: false,
      status: "not_registered",
      tableId: null,
      seatIndex: null,
    };
    view.actions = {
      canRegister: true,
      canUnregister: false,
      canStart: false,
      canRename: false,
    };

    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${view}
        .user=${{ name: "Guest" }}
      ></phg-mtt-lobby>
    `);

    setTimeout(() => {
      findActionButton(element, "Register").click();
    });

    const event = await oneEvent(element, "open-sign-up");
    expect(event).to.exist;
    expect(window.location.pathname).to.equal("/mtt/mtt123");
    expect(window.location.search).to.equal("?action=register");
  });

  it("asks a guest whether they already registered, since they may have registered on another device", async () => {
    const view = createTournamentView();
    view.status = "registration";
    view.currentPlayer = {
      isOwner: false,
      status: "not_registered",
      tableId: null,
      seatIndex: null,
    };
    view.actions = {
      canRegister: true,
      canUnregister: false,
      canStart: false,
      canRename: false,
    };

    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${view}
        .user=${{ name: "Guest" }}
      ></phg-mtt-lobby>
    `);

    expect(actionButtonLabels(element).slice(0, 2)).to.deep.equal([
      "Register",
      "Already registered? Sign in",
    ]);
    setTimeout(() => {
      findActionButton(element, "Already registered? Sign in").click();
    });
    await oneEvent(element, "open-sign-in");
  });

  it("still offers a guest to sign in after late registration closes", async () => {
    const view = createTournamentView();
    view.entryPeriodOpen = false;
    view.currentPlayer = {
      isOwner: false,
      status: "not_registered",
      tableId: null,
      seatIndex: null,
    };

    const element = await fixture(html`
      <phg-mtt-lobby tournament-id="mtt123" .tournament=${view}></phg-mtt-lobby>
    `);

    expect(actionButtonLabels(element)).to.include(
      "Already registered? Sign in",
    );
  });

  it("does not offer a guest to sign in once the tournament has finished", async () => {
    const view = createTournamentView();
    view.status = "finished";
    view.currentPlayer = {
      isOwner: false,
      status: "not_registered",
      tableId: null,
      seatIndex: null,
    };

    const element = await fixture(html`
      <phg-mtt-lobby tournament-id="mtt123" .tournament=${view}></phg-mtt-lobby>
    `);

    expect(actionButtonLabels(element)).not.to.include(
      "Already registered? Sign in",
    );
  });

  it("allows signed-up users to register from the lobby controls", async () => {
    const view = createTournamentView();
    view.status = "registration";
    view.currentPlayer = {
      isOwner: false,
      status: "not_registered",
      tableId: null,
      seatIndex: null,
    };
    view.actions = {
      canRegister: true,
      canUnregister: false,
      canStart: false,
      canRename: false,
    };

    const element = await fixture(html`
      <phg-mtt-lobby
        tournament-id="mtt123"
        .tournament=${view}
        .user=${{ email: "player@example.com" }}
      ></phg-mtt-lobby>
    `);

    setTimeout(() => {
      element.querySelector(".action-row button.button").click();
    });

    const event = await oneEvent(element, "mtt-action");
    expect(event.detail).to.deep.equal({ action: "register" });
  });
});
