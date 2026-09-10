import { test, expect } from "@playwright/test";
import { watchPlayerActions } from "./utils/action-observer.js";
import { startActionRunner } from "./utils/action-runner.js";
import { PokerPlayer } from "./utils/poker-player.js";
import { createGame } from "./utils/game-helpers.js";
import { takeAvailableAction } from "./utils/random-actions.js";

test("action notifications follow decisions through renders and navigation", async ({
  page,
}) => {
  await page.route("**/observer-test/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<phg-game><phg-action-panel><button>Fold</button></phg-action-panel></phg-game>",
    }),
  );
  await page.goto("/observer-test/first");
  const notifications = [];
  const stop = await watchPlayerActions(page, (ready) =>
    notifications.push(ready),
  );
  try {
    await expect.poll(() => notifications).toEqual([true]);
    await page.evaluate(() => {
      const clock = document.createElement("span");
      clock.textContent = "20 seconds";
      document.body.append(clock);
      document
        .querySelector("phg-action-panel")
        .insertAdjacentHTML(
          "beforeend",
          '<button class="button--pre-action">Check</button><button disabled>Rebuy</button><button hidden>Bet $50</button>',
        );
    });
    // Removing choices provides a synchronization point after the ignored updates.
    await page.locator("phg-action-panel").evaluate((panel) => {
      panel.textContent = "Reconnecting...";
    });
    await expect.poll(() => notifications).toEqual([true, false]);
    await page.locator("phg-action-panel").evaluate((panel) => {
      panel.outerHTML =
        "<phg-action-panel><button>Fold</button></phg-action-panel>";
    });
    await expect.poll(() => notifications).toEqual([true, false, true]);
    await page.goto("/observer-test/second");
    await expect.poll(() => notifications.filter(Boolean).length).toBe(3);
  } finally {
    await stop();
  }
});

test("a busy player coalesces notifications and does not block another tab", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  const markup =
    "<phg-game><phg-action-panel><button>Fold</button></phg-action-panel></phg-game>";
  await page.setContent(markup);
  await other.setContent(markup);
  const gate = Promise.withResolvers();
  const calls = [];
  const errors = [];
  let first = true;
  const slow = await startActionRunner(page, {
    act: async () => {
      calls.push("slow-start");
      if (first) {
        first = false;
        await gate.promise;
      }
      calls.push("slow-end");
    },
    social: async () => {
      calls.push("social");
    },
    onError: (error) => errors.push(error),
  });
  const fast = await startActionRunner(other, {
    act: async () => {
      calls.push("fast");
    },
    onError: (error) => errors.push(error),
  });
  try {
    await expect.poll(() => calls).toEqual(["slow-start", "fast"]);
    slow.requestSocial();
    await page.locator("button").evaluate((button) => {
      button.textContent = "Call $50";
    });
    await page.locator("button").evaluate((button) => {
      button.textContent = "Call $100";
    });
    // Let the browser deliver mutation callbacks before releasing the blocked task.
    await page.evaluate(() => new Promise(requestAnimationFrame));
    expect(calls).toEqual(["slow-start", "fast"]);
    gate.resolve();
    await expect
      .poll(() => calls)
      .toEqual([
        "slow-start",
        "fast",
        "slow-end",
        "slow-start",
        "slow-end",
        "social",
      ]);
    expect(errors).toEqual([]);
  } finally {
    gate.resolve();
    await Promise.all([slow.stop(), fast.stop()]);
    await other.close();
  }
});

test("shutdown drains the current action and discards queued work", async ({
  page,
}) => {
  await page.setContent(
    "<phg-game><phg-action-panel><button>Fold</button></phg-action-panel></phg-game>",
  );
  const gate = Promise.withResolvers();
  const calls = [];
  const runner = await startActionRunner(page, {
    act: async () => {
      calls.push("action");
      await gate.promise;
    },
    social: async () => {
      calls.push("social");
    },
    onError: (error) => {
      throw error;
    },
  });
  try {
    await expect.poll(() => calls).toEqual(["action"]);
    runner.requestSocial();
    await page.locator("button").evaluate((button) => {
      button.textContent = "Check";
    });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    let stopped = false;
    const stopping = runner.stop().then(() => {
      stopped = true;
    });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    expect(stopped).toBe(false);
    gate.resolve();
    await stopping;
    await page.locator("button").evaluate((button) => {
      button.textContent = "Fold";
    });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    expect(calls).toEqual(["action"]);
  } finally {
    gate.resolve();
    await runner.stop();
  }
});

test("a cash bot buys in when the UI offers replenishment", async ({
  page,
  context,
}) => {
  const player = new PokerPlayer(context, page, "Cash bot");
  await createGame(player);
  const actions = [];
  const errors = [];
  const runner = await startActionRunner(page, {
    act: async () => {
      actions.push(await takeAvailableAction(player, { buyInBigBlinds: 100 }));
    },
    onError: (error) => errors.push(error),
  });
  try {
    await player.sitAnywhere();
    await expect.poll(() => actions).toContain("buyIn");
    await expect(
      player.actionPanel.getByRole("button", { name: /^Buy In/ }),
    ).toBeHidden();
    await expect(player.mySeat.locator(".stack")).toHaveText("$1");
    expect(errors).toEqual([]);
  } finally {
    await runner.stop();
  }
});
