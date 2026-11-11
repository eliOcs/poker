import { test, expect } from "./utils/fixtures.js";
import { createGame } from "./utils/game-helpers.js";
import { waitForLatestEmail } from "./utils/email.js";
import {
  signUpTournamentCreator,
  signUpTournamentRegistrant,
} from "./utils/mtt-registration.js";

test.describe("Tournament start email", () => {
  test("takes a player who registered on one device to their table on another", async ({
    player1,
    player2,
    player3,
    player4,
  }) => {
    const runId = Date.now();
    const registrantEmail = `start-email-registrant-${runId}@example.com`;
    await signUpTournamentCreator(
      player1,
      `start-email-creator-${runId}@example.com`,
    );
    const tournamentUrl = await createGame(player1, { type: "mtt" });

    await player2.joinTournamentLobbyByUrl(tournamentUrl);
    await signUpTournamentRegistrant(player2, registrantEmail);

    const startedAt = Date.now();
    await player1.startTournament();
    const startEmail = await waitForLatestEmail(registrantEmail, startedAt);
    expect(startEmail.subject).toBe(
      '"Multi-Table Tournament" tournament started',
    );

    const registrantSecondDevice = player3;
    await registrantSecondDevice.page.setContent(startEmail.html);
    await registrantSecondDevice.page
      .getByRole("link", { name: "Open my table" })
      .click();
    await expect(registrantSecondDevice.page).toHaveURL(
      /\/mtt\/[a-z0-9]+\/tables\/[a-z0-9]+$/,
    );
    await expect(registrantSecondDevice.mySeat).toBeVisible();

    const usedLinkDevice = player4;
    await usedLinkDevice.page.setContent(startEmail.html);
    await usedLinkDevice.page
      .getByRole("link", { name: "Open my table" })
      .click();
    await expect(usedLinkDevice.page.locator("phg-toasts")).toContainText(
      "This link has expired or was already used. Sign in again.",
    );
    await expect(usedLinkDevice.page).toHaveURL(
      `${tournamentUrl}?modal=sign-in`,
    );
    await expect(
      usedLinkDevice.page.locator("#profile-sign-in-email"),
    ).toHaveValue(registrantEmail);
  });
});
