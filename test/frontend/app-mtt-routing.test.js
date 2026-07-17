import { expect } from "@open-wc/testing";
import {
  performMttAction,
  resolveMttRedirectPath,
} from "../../src/frontend/app-mtt-routing.js";
import { OriginalFetch } from "./setup.js";

function createRunningMttApp() {
  return {
    path: "/mtt/mtt123/tables/table2",
    _allowMttLobby: false,
    _mttTournamentId: "mtt123",
    _mttView: {
      status: "running",
      currentPlayer: {
        tableId: "table1",
      },
    },
  };
}

describe("app-mtt-routing", () => {
  const originalLocation = window.location.href;

  afterEach(() => {
    globalThis.fetch = OriginalFetch;
    history.replaceState({}, "", originalLocation);
  });

  it("redirects from the tournament lobby into the assigned table", () => {
    const app = createRunningMttApp();

    const redirectPath = resolveMttRedirectPath(app, {
      kind: "mtt",
      tournamentId: "mtt123",
    });

    expect(redirectPath).to.equal("/mtt/mtt123/tables/table1");
  });

  it("allows intentional navigation to another tournament table", () => {
    const app = createRunningMttApp();

    const redirectPath = resolveMttRedirectPath(app, {
      kind: "mtt_table",
      tournamentId: "mtt123",
      tableId: "table2",
    });

    expect(redirectPath).to.be.undefined;
  });

  it("shows feedback when late registration is queued", async () => {
    const app = createRunningMttApp();
    app.path = "/mtt/mtt123";
    app._setMttLobbyOverride = (allowMttLobby) => {
      app._allowMttLobby = allowMttLobby;
    };
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        status: "running",
        currentPlayer: { status: "registered", tableId: null },
      }),
    });

    await performMttAction(app, "register");

    expect(app.toast).to.deep.equal({
      message: "Registered. Waiting for a table.",
      variant: "info",
    });
    expect(app.path).to.equal("/mtt/mtt123");
  });

  it("leaves assigned registration feedback to the player move flow", async () => {
    const app = createRunningMttApp();
    app.path = "/mtt/mtt123";
    app._allowMttLobby = true;
    app.toast = undefined;
    app._setMttLobbyOverride = (allowMttLobby) => {
      app._allowMttLobby = allowMttLobby;
    };
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        status: "running",
        currentPlayer: { status: "seated", tableId: "table1" },
      }),
    });

    await performMttAction(app, "register");

    expect(app.toast).to.be.undefined;
    expect(app.path).to.equal("/mtt/mtt123");
  });

  it("shows the backend error for a stale late registration action", async () => {
    const app = createRunningMttApp();
    globalThis.fetch = async () => ({
      ok: false,
      json: async () => ({ error: "registration is closed" }),
    });

    await performMttAction(app, "register");

    expect(app.toast).to.deep.equal({
      message: "registration is closed",
      variant: "error",
    });
  });
});
