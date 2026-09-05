import { test as base, expect } from "@playwright/test";
import { DEFAULT_AVATAR } from "../../src/shared/avatar.js";

/** @type {import('@playwright/test').BrowserContext} */
let guestContext;

// Keep the HTTP cache and guest session, but isolate page state between tests.
const test = base.extend({
  page: async ({}, use) => {
    const page = await guestContext.newPage();
    await use(page);
    await page.close();
  },
});

test.beforeAll(async ({ browser }, testInfo) => {
  guestContext = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
  });
  const response = await guestContext.request.get("/api/users/me");
  expect(response.ok()).toBeTruthy();
});

test.afterAll(async () => {
  await guestContext.close();
});

test.beforeEach(async ({ page }) => {
  const response = await page.request.put("/api/users/me", {
    data: {
      name: "",
      settings: { volume: 0.75, vibration: true, avatar: null },
    },
  });
  expect(response.ok()).toBeTruthy();
});

test("opens the avatar maker from settings and loads its sprites", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("link", { name: "Change" }).click();

  await expect(page).toHaveURL(/\/avatar$/);
  const avatarMaker = page.locator("phg-avatar-maker");
  await expect(avatarMaker).toBeVisible();
  await avatarMaker.evaluate(
    (element) => /** @type {any} */ (element).assetsReady,
  );

  const loadedSprites = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter(({ name }) => name.includes("/assets/avatar/")),
  );
  expect(loadedSprites.length).toBeGreaterThan(0);
});

async function openSettingsWithAvatar(page) {
  const response = await page.request.put("/api/users/me", {
    data: { name: "Alice", settings: { avatar: DEFAULT_AVATAR } },
  });
  expect(response.ok()).toBeTruthy();
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
}

for (const action of ["Done", "Cancel"]) {
  test(`preserves saved settings after reloading the editor and choosing ${action}`, async ({
    page,
  }) => {
    await openSettingsWithAvatar(page);
    await page.getByRole("link", { name: "Change", exact: true }).click();
    await page.reload();
    await page
      .getByRole("button", { name: "Bigger Face", exact: true })
      .click();
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(page).toHaveURL(/modal=settings/);
    await expect(
      page.getByRole("textbox", { name: "Name", exact: true }),
    ).toHaveValue("Alice");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).not.toHaveURL(/modal=settings/);

    const user = await (await page.request.get("/api/users/me")).json();
    expect(user.name).toBe("Alice");
    expect(user.settings.avatar.face.size).toBe(action === "Done" ? 1 : 0);
  });
}

test("preserves the applied draft when returning to the editor with Forward", async ({
  page,
}) => {
  await openSettingsWithAvatar(page);
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Draft name");
  await page.getByRole("link", { name: "Change", exact: true }).click();
  await page.getByRole("button", { name: "Bigger Face", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page).toHaveURL(/modal=settings/);
  await page.goForward();
  await expect(
    page.getByRole("button", { name: "Set Face size to 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Bigger Face", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("Draft name");
  const beforeSave = await (await page.request.get("/api/users/me")).json();
  expect(beforeSave.name).toBe("Alice");
  expect(beforeSave.settings.avatar.face.size).toBe(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).not.toHaveURL(/modal=settings/);
  const saved = await (await page.request.get("/api/users/me")).json();
  expect(saved.name).toBe("Draft name");
  expect(saved.settings.avatar.face.size).toBe(1);
});

for (const [action, leaveSettings] of [
  [
    "Cancel",
    (page) => page.getByRole("button", { name: "Cancel", exact: true }).click(),
  ],
  ["Back", (page) => page.goBack()],
]) {
  test(`discards settings when leaving with ${action} and reopening with Forward`, async ({
    page,
  }) => {
    await openSettingsWithAvatar(page);
    await page
      .getByRole("textbox", { name: "Name", exact: true })
      .fill("Discard me");
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await leaveSettings(page);
    await expect(page).not.toHaveURL(/modal=settings/);
    await page.goForward();
    await expect(
      page.getByRole("textbox", { name: "Name", exact: true }),
    ).toHaveValue("Alice");
    await expect(
      page.getByRole("button", { name: "Remove", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).not.toHaveURL(/modal=settings/);
    const saved = await (await page.request.get("/api/users/me")).json();
    expect(saved.name).toBe("Alice");
    expect(saved.settings.avatar).toEqual(DEFAULT_AVATAR);
  });
}

for (const [recovery, recover] of [
  [
    "Retry",
    (page) => page.getByRole("button", { name: "Retry", exact: true }).click(),
  ],
  [
    "reopen",
    async (page) => {
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.getByRole("link", { name: "Change", exact: true }).click();
    },
  ],
]) {
  test(`recovers from a failed sprite request using ${recovery}`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let failSprite = true;
    await page.route("**/assets/avatar/face/oval-skin.png", (route) =>
      failSprite ? route.abort() : route.continue(),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("link", { name: "Change", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Unable to load avatar styles.",
    );
    failSprite = false;
    await recover(page);
    await page
      .getByRole("button", { name: "Bigger Face", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Set Face size to 1", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.locator(".avatar-maker__canvas-frame canvas"),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}
