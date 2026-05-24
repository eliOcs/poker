import { expect } from "@open-wc/testing";
import { resolveMttRedirectPath } from "../../src/frontend/app-mtt-routing.js";

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
});
