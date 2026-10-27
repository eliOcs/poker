import { describe, it } from "node:test";
import assert from "node:assert";
import { BOTS, getBotAvatar } from "../../src/backend/bot-roster.js";
import { getAvatarRevision } from "../../src/backend/avatar.js";
import { createGameRoutes } from "../../src/backend/game-routes.js";
import { canonicalizeAvatar } from "../../src/shared/avatar.js";

describe("bot roster", () => {
  it("gives every bot a valid avatar", () => {
    for (const { player, avatar } of BOTS) {
      assert.deepStrictEqual(canonicalizeAvatar(avatar), avatar);
      assert.strictEqual(player.avatarRevision, getAvatarRevision(avatar));
      assert.strictEqual(getBotAvatar(player.id), avatar);
    }
  });

  it("uses ids that generated user ids never take", () => {
    const ids = BOTS.map((bot) => bot.player.id);
    assert.strictEqual(new Set(ids).size, ids.length);
    assert.ok(ids.every((id) => /^[a-z0-9]+$/.test(id) && id.length !== 12));
  });

  it("serves bot avatars like player avatars", () => {
    const bot = /** @type {(typeof BOTS)[number]} */ (BOTS[0]);
    const user = { id: "u1", name: undefined, settings: {} };
    const routes = createGameRoutes({ u1: user }, new Map(), () => {}, {
      mttManager: /** @type {any} */ ({}),
    });
    const route = routes.find(
      (r) => r.path instanceof RegExp && r.path.test("/api/players/x/avatar"),
    );
    /** @type {{ status?: number, body?: string }} */
    const response = {};
    route?.handler({
      req: { headers: { cookie: "phg=u1" } },
      res: {
        setHeader() {},
        writeHead(status) {
          response.status = status;
        },
        end(body) {
          response.body = body;
        },
      },
      match: ["", bot.player.id],
      log: { context: {} },
    });

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(JSON.parse(response.body ?? ""), {
      revision: bot.player.avatarRevision,
      avatar: bot.avatar,
    });
  });
});
