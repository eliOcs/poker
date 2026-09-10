import { test, expect } from "@playwright/test";
import { waitForAvatars } from "./visual-assets.js";

const social = [{ action: "emote" }, { action: "chat" }];
const show = [
  { action: "muck" },
  { action: "showCard1", cards: ["As"] },
  { action: "showCard2", cards: ["Kd"] },
  { action: "showBothCards", cards: ["As", "Kd"] },
];
const states = [
  { actions: [{ action: "check" }, { action: "bet", min: 50, max: 50000 }] },
  {
    actions: [
      { action: "fold" },
      { action: "call", amount: 5000, allIn: true },
    ],
  },
  {
    actions: [{ action: "callClock" }, ...social],
    isActing: false,
    inHand: true,
  },
  { actions: [{ action: "callClock" }, ...show, ...social], inHand: false },
  { actions: [{ action: "start" }, ...show, ...social], inHand: false },
  { actions: [{ action: "buyIn", min: 20, max: 100, bigBlind: 50 }] },
  { actions: [{ action: "sitIn" }, { action: "leave" }] },
  { actions: [{ action: "rebuy" }, { action: "leave" }] },
  { actions: social, inHand: false },
  { actions: [], seatIndex: -1, seatedCount: 1, canSit: true },
  { actionPending: true },
  { connectionStatus: "connecting" },
  { bustedPosition: 3 },
  { isWinner: true },
];

for (const [width, height] of [
  [320, 568],
  [390, 844],
  [844, 390],
  [896, 414],
  [1280, 720],
  [2048, 1200],
]) {
  test(`action panel stays fixed through hand transitions at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/test.html?test=table-full-ring");
    await page.evaluate(() => document.fonts.ready);
    await waitForAvatars(page);
    const results = await page
      .locator("phg-action-panel")
      .evaluate(async (panel, transitions) => {
        const initial = Object.fromEntries(
          [
            "actions",
            "seatIndex",
            "isActing",
            "inHand",
            "seatedCount",
            "canSit",
            "actionPending",
            "connectionStatus",
            "bustedPosition",
            "isWinner",
          ].map((key) => [key, panel[key]]),
        );
        const geometry = () =>
          [
            ...document.querySelectorAll(
              "phg-table-layout, .table-surface, phg-action-panel",
            ),
          ].map((element) => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return [x, y, width, height].map(
              (value) => Math.round(value * 10) / 10,
            );
          });
        const settle = () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
        await settle();
        const before = geometry();
        const results = [];
        for (const state of [initial, ...transitions, initial]) {
          Object.assign(panel, initial, state);
          await panel.updateComplete;
          await settle();
          const bounds = panel.getBoundingClientRect();
          const clipped = [
            ...panel.querySelectorAll("button, input, .waiting"),
          ].some((element) => {
            const rect = element.getBoundingClientRect();
            return (
              rect.left < bounds.left - 1 ||
              rect.right > bounds.right + 1 ||
              rect.top < bounds.top - 1 ||
              rect.bottom > bounds.bottom + 1
            );
          });
          results.push({
            state,
            before,
            after: geometry(),
            clipped,
            overflow: panel.scrollHeight > panel.clientHeight + 1,
          });
        }
        return results;
      }, states);
    for (const result of results) {
      expect(result.after).toEqual(result.before);
      expect(result.clipped, JSON.stringify(result.state)).toBe(false);
      expect(result.overflow, JSON.stringify(result.state)).toBe(false);
    }
  });
}
