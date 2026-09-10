import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { getTablePath } from "../src/shared/routes.js";
import { DEFAULT as DEFAULT_STAKES } from "../src/shared/stakes.js";
import { PokerPlayer } from "../test/e2e/utils/poker-player.js";
import {
  getAvailableActions,
  selectRandomAction,
} from "../test/e2e/utils/random-actions.js";
import { delay, formatError } from "../test/e2e/utils/stress-helpers.js";
import { playRandomSocialActions } from "../test/e2e/utils/random-social-actions.js";
import { takeRandomCardAction } from "../test/e2e/utils/random-card-actions.js";

const BUY_IN_BIG_BLINDS = 100;
const LOOP_DELAY_MS = 100;
const BOT_STATE_DIR = path.join(process.cwd(), "test-data", "cash-game-bots");

let stopping = false;

function readOptions() {
  const { values } = parseArgs({
    options: {
      "table-size": { type: "string", default: "6" },
      players: { type: "string", default: "5" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(`Usage: npm run test:game -- [--table-size 6] [--players 5]

  --table-size  Number of seats: 2, 6, or 9 (default: 6)
  --players     Number of bots: 1 through table size (default: 5)
  --help, -h    Show this help

With one bot, join an open seat and start the game.`);
    return;
  }

  const tableSize = Number(values["table-size"]);
  const botCount = Number(values.players);
  if (!/^(2|6|9)$/.test(values["table-size"])) {
    throw new Error("--table-size must be 2, 6, or 9.");
  }
  if (!/^\d+$/.test(values.players) || botCount < 1 || botCount > tableSize) {
    throw new Error(`--players must be an integer between 1 and ${tableSize}.`);
  }
  return { tableSize, botCount };
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopping = true;
    console.log("\nStopping cash-game bots...");
  });
}

function getServerOrigin() {
  const configuredOrigin = process.env.APP_ORIGIN;
  if (configuredOrigin) return new URL(configuredOrigin).origin;
  const host = process.env.DOMAIN || "localhost";
  const port = process.env.PORT || "3000";
  return `http://${host}:${port}`;
}

async function assertServerIsRunning(origin) {
  try {
    const response = await fetch(origin);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(
      `Poker server is not reachable at ${origin}. Run npm start first. (${formatError(error)})`,
    );
  }
}

/**
 * @param {import('@playwright/test').Browser} browser
 * @param {string} origin
 * @param {number} index
 * @param {string} statePath
 */
async function createBot(browser, origin, index, statePath) {
  const context = await browser.newContext({
    baseURL: origin,
    storageState: existsSync(statePath) ? statePath : undefined,
  });
  const page = await context.newPage();
  return new PokerPlayer(context, page, `Bot ${index + 1}`);
}

/**
 * Ensure regular app requests are keyed by the bot's guest session rather than
 * the shared local IP, then retain that session for later runs.
 * @param {PokerPlayer} bot
 * @param {string} statePath
 */
async function initializeGuestSession(bot, statePath) {
  const response = await bot.page.request.get("/api/users/me");
  if (!response.ok()) {
    const retryAfter = response.headers()["retry-after"];
    const retryMessage = retryAfter ? `; retry after ${retryAfter}s` : "";
    throw new Error(
      `Guest session initialization failed with HTTP ${response.status()}${retryMessage}`,
    );
  }
  await bot.context.storageState({ path: statePath });
}

/**
 * Create a fresh table without visiting the home page, which may redirect a
 * persisted bot session back to its previous active game.
 * @param {PokerPlayer} creator
 * @param {string} origin
 * @param {number} tableSize
 */
async function createCashGame(creator, origin, tableSize) {
  const response = await creator.page.request.post("/cash", {
    data: {
      type: "cash",
      small: DEFAULT_STAKES.small,
      big: DEFAULT_STAKES.big,
      seats: tableSize,
    },
  });
  if (!response.ok()) {
    throw new Error(`Cash game creation failed with HTTP ${response.status()}`);
  }

  const data = await response.json();
  if (!data || typeof data.id !== "string" || data.type !== "cash") {
    throw new Error("Cash game creation returned an invalid response");
  }
  return new URL(getTablePath("cash", data.id), origin).href;
}

/** @param {PokerPlayer} bot */
async function replenishBot(bot) {
  const buyInButton = bot.actionPanel.getByRole("button", {
    name: /^Buy In/,
  });
  if (!(await buyInButton.isVisible())) return false;
  await bot.buyIn(BUY_IN_BIG_BLINDS);
  return true;
}

/**
 * @param {PokerPlayer} bot
 * @param {number} index
 * @returns {Promise<string|null>}
 */
async function takeRandomAction(bot, index) {
  let attemptedAction;
  try {
    const cardAction = await takeRandomCardAction(bot);
    if (cardAction) return cardAction;
    if (!(await bot.isMyTurn())) return null;
    const availableActions = await getAvailableActions(bot);
    if (availableActions.length === 0) {
      throw new Error("turn is active but no player actions are available");
    }
    attemptedAction = selectRandomAction(availableActions);
    await (attemptedAction === "bet" || attemptedAction === "raise"
      ? bot.actWithRandomPreset(attemptedAction)
      : bot.act(attemptedAction));
    return attemptedAction;
  } catch (error) {
    const action = attemptedAction ? ` (${attemptedAction})` : "";
    console.log(
      `Bot ${index + 1} action failed${action}: ${formatError(error)}`,
    );
    return null;
  }
}

/** @param {PokerPlayer[]} bots */
async function callClockIfAvailable(bots) {
  for (const [index, bot] of bots.entries()) {
    if (await bot.hasAction("callClock")) {
      try {
        await bot.callClock();
        return;
      } catch (error) {
        console.log(
          `Bot ${index + 1} call clock failed: ${formatError(error)}`,
        );
      }
    }
  }
}

/**
 * @param {PokerPlayer} bot
 * @param {number} index
 */
async function replenishBotSafely(bot, index) {
  try {
    return await replenishBot(bot);
  } catch (error) {
    console.log(`Bot ${index + 1} buy-in failed: ${formatError(error)}`);
    return false;
  }
}

/** @param {PokerPlayer[]} bots */
async function runBots(bots) {
  const nextSocialAt = new Map();
  while (!stopping) {
    await Promise.all(bots.map((bot, index) => replenishBotSafely(bot, index)));

    await playRandomSocialActions(bots, nextSocialAt, { logActions: false });
    const actions = await Promise.all(
      bots.map((bot, index) => takeRandomAction(bot, index)),
    );
    if (!actions.some(Boolean)) await callClockIfAvailable(bots);
    await delay(LOOP_DELAY_MS);
  }
}

async function main() {
  const options = readOptions();
  if (!options) return;
  const { tableSize, botCount } = options;
  const origin = getServerOrigin();
  await assertServerIsRunning(origin);

  const browser = await chromium.launch({ headless: true });
  /** @type {PokerPlayer[]} */
  const bots = [];

  try {
    await mkdir(BOT_STATE_DIR, { recursive: true });
    for (let index = 0; index < botCount; index++) {
      const statePath = path.join(BOT_STATE_DIR, `bot-${index + 1}.json`);
      const bot = await createBot(browser, origin, index, statePath);
      await initializeGuestSession(bot, statePath);
      bots.push(bot);
    }

    const gameUrl = await createCashGame(bots[0], origin, tableSize);
    for (const bot of bots) await bot.joinGameByUrl(gameUrl);

    for (const [index, bot] of bots.entries()) {
      await bot.sitAnywhere();
      await bot.buyIn(BUY_IN_BIG_BLINDS);
      await bot.saveSettings({
        name: `Bot ${index + 1}`,
        randomizeAvatar: true,
      });
    }

    if (botCount > 1) await bots[0].startGame();
    console.log(`\nCash game ready: ${gameUrl}`);
    console.log(
      `${tableSize} seats, ${botCount} randomized ${botCount === 1 ? "bot" : "bots"}, ${tableSize - botCount} open seats.`,
    );
    if (botCount === 1) console.log("Join an open seat and start the game.");
    console.log("Press Ctrl+C to stop.\n");

    await runBots(bots);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(formatError(error));
  process.exitCode = 1;
});
