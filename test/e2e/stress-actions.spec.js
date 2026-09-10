import { test, expect } from "@playwright/test";
import { PokerPlayer } from "./utils/poker-player.js";
import { getAvailableActions } from "./utils/random-actions.js";

test("stress actions use visible choices and exclude pre-action toggles", async ({
  page,
  context,
}) => {
  await page.setContent(`
    <phg-game>
      <phg-action-panel>
        <button class="button--pre-action">Check</button>
        <button style="display: none">Rebuy</button>
        <button>Fold</button>
        <button><span>Call\n $50</span></button>
        <button>Raise to $100</button>
        <input type="range">
        <button>Call the clock</button>
      </phg-action-panel>
    </phg-game>
  `);
  await page.locator("phg-game").evaluate((game) => {
    game.connectionStatus = "connected";
  });
  const player = new PokerPlayer(context, page, "Stress player");
  expect(await getAvailableActions(player)).toEqual([
    "call",
    "fold",
    "raise",
    "allIn",
    "callClock",
  ]);

  await page.locator("phg-action-panel").evaluate((panel) => {
    panel.innerHTML = "<button>Leave</button><button>Rebuy</button>";
  });
  expect(await getAvailableActions(player)).toEqual(["rebuy", "leave"]);

  await page.locator("phg-game").evaluate((game) => {
    game.connectionStatus = "reconnecting";
  });
  expect(await getAvailableActions(player)).toEqual([]);
});
