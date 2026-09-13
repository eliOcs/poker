import { test, expect } from "@playwright/test";
import { TABLE_SIZE_IDS } from "./test-cases/table-size-ids.js";
import { waitForAvatars } from "./visual-assets.js";

/** Compare rendered contents, including cards and bets outside the seat background. */
async function layoutProblems(page) {
  return page.locator("phg-table-layout").evaluate((stage) => {
    const outside = (rect, bounds) =>
      [
        bounds.left - rect.left,
        rect.right - bounds.right,
        bounds.top - rect.top,
        rect.bottom - bounds.bottom,
      ].some((overflow) => overflow > 1);
    const intersects = (a, b) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    const bounds = stage.getBoundingClientRect();
    const elements = [
      ...stage.querySelectorAll(
        "phg-seat, phg-avatar, .hole-cards phg-card, .board-info, .bet-indicator, .dealer-button",
      ),
    ];
    const boxes = elements.map((element) => {
      const rect = element.getBoundingClientRect();
      if (element.matches("phg-seat:not(.empty)")) {
        // Check the nameplate and cards separately, leaving their empty corners free.
        const style = getComputedStyle(element);
        const scale = rect.height / element.offsetHeight;
        const top =
          parseFloat(style.getPropertyValue("--seat-panel-top")) * scale;
        const bottom =
          parseFloat(style.getPropertyValue("--seat-panel-bottom")) * scale;
        rect.y += top;
        rect.height -= top + bottom;
      }
      return {
        name: element.matches("phg-seat")
          ? `seat ${element.getAttribute("data-seat")}`
          : element.matches(".bet-indicator, .dealer-button")
            ? `${element.className} ${element.closest("phg-seat").getAttribute("data-seat")}`
            : element.matches("phg-avatar")
              ? `avatar ${element.closest("phg-seat").getAttribute("data-seat")}`
              : element.matches("phg-card")
                ? `card ${element.closest("phg-seat").getAttribute("data-seat")}`
                : "board",
        seat: element.closest("phg-seat"),
        rect,
      };
    });
    const surface = stage.querySelector(".table-surface");
    const surfaceRect = surface.getBoundingClientRect();
    const scale = surfaceRect.width / surface.clientWidth;
    const feltStyle = getComputedStyle(surface, "::before");
    const border = parseFloat(feltStyle.borderTopWidth);
    const left = parseFloat(feltStyle.left) + border;
    const top = parseFloat(feltStyle.top) + border;
    const right = surface.clientWidth - parseFloat(feltStyle.right) - border;
    const bottom = surface.clientHeight - parseFloat(feltStyle.bottom) - border;
    const radius = Math.min((right - left) / 2, (bottom - top) / 2);
    const onFelt = (x, y) => {
      const cx = Math.max(left + radius, Math.min(x, right - radius));
      const cy = Math.max(top + radius, Math.min(y, bottom - radius));
      return Math.hypot(x - cx, y - cy) <= radius + 1;
    };
    const betLeavesFelt = (bet) => {
      const r = bet.getBoundingClientRect();
      return [r.left, r.right].some((x) =>
        [r.top, r.bottom].some(
          (y) =>
            !onFelt(
              (x - surfaceRect.left) / scale,
              (y - surfaceRect.top) / scale,
            ),
        ),
      );
    };
    const problems = [
      ...stage.querySelectorAll(".bet-indicator, .dealer-button"),
    ]
      .filter(betLeavesFelt)
      .map((element) => `${element.className} leaves the felt`);
    for (const [index, { name, rect, seat }] of boxes.entries()) {
      if (outside(rect, bounds)) {
        problems.push(`${name} is outside the table`);
      }
      for (const other of boxes.slice(index + 1)) {
        if (seat && seat === other.seat) continue;
        if (intersects(rect, other.rect)) {
          problems.push(`${name} overlaps ${other.name}`);
        }
      }
    }
    const reference = stage.querySelector("phg-card:has(.rank)");
    const referenceCard = reference
      ?.querySelector(".card")
      .getBoundingClientRect();
    stage.querySelectorAll("phg-card").forEach((card) => {
      const bounds = card.querySelector(".card").getBoundingClientRect();
      if (
        Math.abs(bounds.width - referenceCard.width) > 0.1 ||
        Math.abs(bounds.height - referenceCard.height) > 0.1
      )
        problems.push("card sizes differ between the board and seats");
      for (const selector of [".rank", ".suit"]) {
        const symbol = card.querySelector(selector)?.getBoundingClientRect();
        const expected = reference
          .querySelector(selector)
          .getBoundingClientRect();
        if (
          symbol &&
          (Math.abs(symbol.height - expected.height) > 0.1 ||
            Math.abs(
              symbol.top - bounds.top - (expected.top - referenceCard.top),
            ) > 0.1)
        )
          problems.push("card typography differs between the board and seats");
      }
    });
    stage.querySelectorAll("phg-seat").forEach((seat) => {
      const outer = seat.getBoundingClientRect();
      const markers = [
        ...seat.querySelectorAll(".bet-indicator, .dealer-button"),
      ].map((element) => element.getBoundingClientRect());
      if (markers.length === 2 && intersects(markers[0], markers[1]))
        problems.push("dealer covers its own bet");
      for (const child of seat.querySelectorAll(
        ".hole-cards phg-card, .player-info, .stack, .last-action, .hand-result, .hand-rank, .clock-countdown",
      )) {
        const rect = child.getBoundingClientRect();
        if (markers.some((marker) => intersects(marker, rect)))
          problems.push("table marker covers its own seat contents");
        if (outside(rect, outer))
          problems.push(`${child.className} leaves its seat`);
      }
    });
    if (stage.dataset.layout === "landscape") {
      stage.querySelectorAll(".hole-cards").forEach((cards) => {
        const second = cards.children[1]?.getBoundingClientRect();
        const first = cards.children[0];
        first?.querySelectorAll(".rank, .suit").forEach((symbol) => {
          if (second && intersects(symbol.getBoundingClientRect(), second))
            problems.push("stacked card hides a rank or suit");
        });
      });
    }
    return problems;
  });
}

async function openTable(page, id) {
  await page.goto(`/test.html?test=${id}`);
  await page.locator("phg-table-layout[data-layout]").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await waitForAvatars(page);
}

// Exercise resizing alongside the catalog's desktop/mobile snapshots.
test.describe("table clearance", () => {
  test.setTimeout(20000);
  for (const id of TABLE_SIZE_IDS) {
    test(`${id} fits through portrait and landscape resizing`, async ({
      page,
    }) => {
      await openTable(page, id);
      for (const [width, height, minTableWidth = 0] of [
        [320, 568],
        [390, 844],
        [768, 1024],
        [799, 600],
        [800, 600],
        [844, 390],
        [896, 414],
        [1024, 768],
        [1280, 720],
        [1280, 900],
        [2048, 1200, 1000],
        [3840, 2160, 1000],
        [1200, 2048],
      ]) {
        await page.setViewportSize({ width, height });
        await expect
          .poll(() => layoutProblems(page), {
            message: `${id} at ${width} × ${height}`,
          })
          .toEqual([]);
        await expect
          .poll(
            () =>
              page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth,
              ),
            { message: `horizontal overflow at ${width} × ${height}` },
          )
          .toBe(false);
        const panel = await page.locator("phg-action-panel").boundingBox();
        expect(panel.y).toBeGreaterThanOrEqual(0);
        expect(panel.y + panel.height).toBeLessThanOrEqual(height + 1);
        const surface = await page.locator(".table-surface").boundingBox();
        expect(surface.width).toBeLessThanOrEqual(1200);
        expect(surface.height).toBeLessThanOrEqual(1050);
        await expect
          .poll(
            async () =>
              (await page.locator(".table-surface").boundingBox()).width,
          )
          .toBeGreaterThan(minTableWidth);
      }
    });
  }

  test("every seat can carry the action clock after rotation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openTable(page, "table-full-ring");
    await expect(page.locator(".dealer-button")).toHaveCount(9);
    await expect(page.locator(".hole-cards .rank")).toHaveCount(18);
    for (const [width, height] of [
      [390, 844],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      for (let hero = 0; hero < 9; hero++) {
        await page.locator("phg-game").evaluate(async (game, index) => {
          game.game = {
            ...game.game,
            seats: game.game.seats.map((seat, i) => ({
              ...seat,
              isCurrentPlayer: i === index,
            })),
          };
          await game.updateComplete;
        }, hero);
        await expect.poll(() => layoutProblems(page)).toEqual([]);
      }
    }
  });

  test("tall portrait tables use spare height without enlarging cards", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 413, height: 915 });
    await openTable(page, "table-full-ring");
    const surface = page.locator(".table-surface");
    const card = page.locator(".community-cards phg-card").first();
    const tableBefore = await surface.boundingBox();
    const cardBefore = await card.boundingBox();
    await page.setViewportSize({ width: 413, height: 1000 });
    await expect
      .poll(async () => (await surface.boundingBox()).height)
      .toBeCloseTo(tableBefore.height + 85, 1);
    const cardAfter = await card.boundingBox();
    expect(cardAfter.width).toBeCloseTo(cardBefore.width, 1);
    expect(cardAfter.height).toBeCloseTo(cardBefore.height, 1);
    const gap = await page.locator("phg-game").evaluate((game) => {
      const hero = game.querySelector('phg-seat[data-slot="0"]');
      const seat = hero.getBoundingClientRect();
      const padding = parseFloat(
        getComputedStyle(hero).getPropertyValue("--seat-panel-bottom"),
      );
      const panel = game
        .querySelector("phg-action-panel")
        .getBoundingClientRect();
      return (
        panel.top - (seat.bottom - padding * (seat.height / hero.offsetHeight))
      );
    });
    expect(gap).toBeGreaterThanOrEqual(3);
    expect(gap).toBeLessThanOrEqual(5);
    await expect.poll(() => layoutProblems(page)).toEqual([]);
  });

  test("history shares the table's clearance", async ({ page }) => {
    await openTable(page, "history-replay-final");
    for (const [width, height] of [
      [390, 844],
      [844, 390],
      [1280, 720],
    ]) {
      await page.setViewportSize({ width, height });
      await expect.poll(() => layoutProblems(page)).toEqual([]);
    }
  });

  test("dealer stays on the felt for every seat, with and without bets", async ({
    page,
  }) => {
    await openTable(page, "table-full-ring");
    for (const [width, height] of [
      [390, 844],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      for (const size of [2, 6, 9]) {
        await openTable(
          page,
          size === 2
            ? "table-heads-up"
            : size === 6
              ? "table-6max"
              : "table-full-ring",
        );
        for (let button = 0; button < size; button++) {
          await page.locator("phg-game").evaluate(async (game, button) => {
            game.game = { ...game.game, button };
            await game.updateComplete;
          }, button);
          await expect.poll(() => layoutProblems(page)).toEqual([]);
          const gap = await page
            .locator(`phg-seat[data-seat="${button}"] .dealer-button`)
            .evaluate((dealer) => {
              const seat = dealer.closest("phg-seat");
              const panel = seat.getBoundingClientRect();
              const chip = dealer.getBoundingClientRect();
              const style = getComputedStyle(
                seat.querySelector(".seat-content"),
                "::before",
              );
              const scale = panel.height / seat.offsetHeight;
              const top = panel.top + parseFloat(style.top) * scale;
              const bottom = panel.bottom - parseFloat(style.bottom) * scale;
              return (
                Math.hypot(
                  Math.max(panel.left - chip.right, chip.left - panel.right, 0),
                  Math.max(top - chip.bottom, chip.top - bottom, 0),
                ) / scale
              );
            });
          expect(gap).toBeLessThanOrEqual(16);
          await page.locator("phg-game").evaluate(async (game) => {
            game.game = {
              ...game.game,
              hand: { ...game.game.hand, collectingBets: true },
            };
            await game.updateComplete;
          });
          await expect.poll(() => layoutProblems(page)).toEqual([]);
          await page.locator("phg-game").evaluate(async (game) => {
            game.game = {
              ...game.game,
              hand: { ...game.game.hand, collectingBets: false },
            };
            await game.updateComplete;
          });
        }
      }
    }
  });

  test("player panels stay the same height as the timer and hand rank change", async ({
    page,
  }) => {
    await openTable(page, "table-full-ring");
    for (const [width, height] of [
      [390, 844],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      await expect.poll(() => layoutProblems(page)).toEqual([]);
      const hero = page.locator('phg-seat[data-slot="0"]');
      // Let the resize observer apply the new scale before measuring stability.
      await page.evaluate(
        () =>
          new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          }),
      );
      const before = await hero.boundingBox();
      for (const clock of [undefined, 9, 18]) {
        await page.locator("phg-game").evaluate(async (game, remaining) => {
          game.game = {
            ...game.game,
            hand: { ...game.game.hand, clockRemaining: remaining },
            seats: game.game.seats.map((seat) =>
              seat.isCurrentPlayer
                ? {
                    ...seat,
                    lastAction: remaining ? "Call $125" : null,
                    handRank: "Full House, Kings over Queens",
                  }
                : seat,
            ),
          };
          await game.updateComplete;
        }, clock);
        await expect(page.locator("phg-board .current-hand-rank")).toHaveText(
          "Full House, Kings over Queens",
        );
        await expect(hero.locator(".hand-rank")).toHaveCount(0);
        const after = await hero.boundingBox();
        expect(after.height).toBeCloseTo(before.height, 1);
        expect(after.y).toBeCloseTo(before.y, 1);
        await expect.poll(() => layoutProblems(page)).toEqual([]);
      }
    }
  });

  test("visual rotation preserves seat actions and dealer identity", async ({
    page,
  }) => {
    await openTable(page, "table-full-ring");
    const hero = page.locator('phg-seat[data-slot="0"]');
    await expect(hero).toHaveAttribute("data-seat", "4");
    await expect(
      page.locator('phg-seat[data-seat="8"] .dealer-button'),
    ).toHaveText("D");
    await page.locator("phg-game").evaluate((game) => {
      game.addEventListener("game-action", (event) => {
        game.dataset.sent = JSON.stringify(event.detail);
      });
    });
    await page.getByRole("button", { name: "Fold", exact: true }).click();
    await expect(page.locator("phg-game")).toHaveAttribute(
      "data-sent",
      /"action":"fold"/,
    );
  });

  test("chip collection coordinates remain aligned when the table is scaled", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openTable(page, "table-full-ring");
    const error = await page.locator("phg-game").evaluate(async (game) => {
      const { snapshotBetPositions, animateBetCollection } =
        await import("/src/frontend/bet-collection.js");
      const container = game.querySelector("#container");
      const seat = game.querySelector('phg-seat[data-seat="0"] .bet-indicator');
      const sources = snapshotBetPositions(game, [{ index: 0, bet: 12500 }]);
      animateBetCollection(container, sources);
      const chip = container.querySelector(".collecting-chip");
      const animation = chip.getAnimations()[0];
      animation.pause();
      animation.currentTime = 0;
      const start = chip.getBoundingClientRect();
      const source = seat.getBoundingClientRect();
      animation.currentTime = 400;
      const end = chip.getBoundingClientRect();
      const pot = game.querySelector("phg-board .pot").getBoundingClientRect();
      const result = [
        start.left - source.left,
        start.top - source.top,
        end.left - pot.left - pot.width / 2,
        end.top - pot.top - pot.height / 2,
      ];
      animation.cancel();
      chip.remove();
      return result;
    });
    for (const delta of error) expect(Math.abs(delta)).toBeLessThan(1);
  });
});
