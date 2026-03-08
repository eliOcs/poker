import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import "../../src/frontend/player-profile.js";

describe("phg-player-profile", () => {
  it("renders recent games sorted data", async () => {
    const element = await fixture(html`
      <phg-player-profile
        .profile=${{
          id: "player1",
          name: "Alice",
          online: false,
          lastSeenAt: "2026-03-05T18:42:00.000Z",
          joinedAt: "2025-11-14T20:15:00.000Z",
          totalNetWinnings: 7500,
          totalHands: 8,
          recentGames: [
            {
              gameId: "tour123",
              gameType: "tournament",
              netWinnings: -500,
              handsPlayed: 3,
              lastPlayedAt: "2026-03-06T21:08:00.000Z",
              lastHandNumber: 12,
            },
            {
              gameId: "cash456",
              gameType: "cash",
              netWinnings: 8000,
              handsPlayed: 5,
              lastPlayedAt: "2026-03-05T19:42:00.000Z",
              lastHandNumber: 44,
            },
          ],
        }}
      ></phg-player-profile>
    `);

    const rows = element.shadowRoot.querySelectorAll("tbody tr");
    expect(rows.length).to.equal(2);
    expect(rows[0].textContent).to.include("Sit n Go");
    expect(rows[0].textContent).to.include("-$5");
    expect(rows[1].textContent).to.include("Cash");
    expect(rows[1].textContent).to.include("+$80");
  });

  it("navigates to the player's last hand when a row is clicked", async () => {
    const element = await fixture(html`
      <phg-player-profile
        .profile=${{
          id: "player1",
          name: "Alice",
          online: false,
          lastSeenAt: "2026-03-05T18:42:00.000Z",
          joinedAt: "2025-11-14T20:15:00.000Z",
          totalNetWinnings: 7500,
          totalHands: 8,
          recentGames: [
            {
              gameId: "tour123",
              gameType: "tournament",
              netWinnings: -500,
              handsPlayed: 3,
              lastPlayedAt: "2026-03-06T21:08:00.000Z",
              lastHandNumber: 12,
            },
          ],
        }}
      ></phg-player-profile>
    `);

    setTimeout(() => {
      element.shadowRoot.querySelector("tbody tr").click();
    });

    const event = await oneEvent(element, "navigate");
    expect(event.detail).to.deep.equal({ path: "/history/tour123/12" });
  });

  it("shows the settings item in the profile drawer", async () => {
    const element = await fixture(html`
      <phg-player-profile
        .profile=${{
          id: "player2",
          name: "Alice",
          online: false,
          lastSeenAt: "2026-03-05T18:42:00.000Z",
          joinedAt: "2025-11-14T20:15:00.000Z",
          totalNetWinnings: 7500,
          totalHands: 8,
          recentGames: [],
        }}
      ></phg-player-profile>
    `);

    element.drawerOpen = true;
    await element.updateComplete;

    setTimeout(() => {
      element.shadowRoot.querySelector("button").click();
    });

    const event = await oneEvent(element, "open-settings");
    expect(event).to.exist;
  });
});
