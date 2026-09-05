import { expect, fixture, html, waitUntil } from "@open-wc/testing";
import { DEFAULT_AVATAR } from "../../src/shared/avatar.js";
import { getAvatarSpritePaths } from "../../src/frontend/avatar-sprite-loader.js";
import { loadPlayerAvatar } from "../../src/frontend/avatar-loader.js";
import "../../src/frontend/avatar.js";

describe("phg-avatar", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("selects only the sprite files used by the avatar", () => {
    const paths = getAvatarSpritePaths(DEFAULT_AVATAR);

    expect(paths).to.include("/assets/avatar/face/oval-skin.png");
    expect(paths).to.include("/assets/avatar/eyes/round-iris-left.png");
    expect(paths).to.include("/assets/avatar/eyes/round-iris-right.png");
    expect(paths).to.not.include("/assets/avatar/face/round-skin.png");
    expect(paths.some((path) => path.includes("sparkle"))).to.be.false;
    expect(paths.some((path) => path.includes("facial-hair"))).to.be.false;
  });

  it("rejects invalid configurations received from the public API", async () => {
    const avatar = structuredClone(DEFAULT_AVATAR);
    delete avatar.face.type;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ revision: "invalid", avatar }),
    });
    let error;
    try {
      await loadPlayerAvatar("invalidplayer", "invalid");
    } catch (caught) {
      error = caught;
    }
    expect(error).to.be.instanceOf(TypeError);
  });

  it("fetches a player revision only once", async () => {
    let requestCount = 0;
    globalThis.fetch = async (url) => {
      if (url !== "/api/players/player1/avatar") return originalFetch(url);
      requestCount += 1;
      return {
        ok: true,
        json: async () => ({
          revision: "revision-1",
          avatar: DEFAULT_AVATAR,
        }),
      };
    };
    const [first, second] = await Promise.all([
      loadPlayerAvatar("player1", "revision-1"),
      loadPlayerAvatar("player1", "revision-1"),
    ]);

    expect(first).to.deep.equal(DEFAULT_AVATAR);
    expect(second).to.equal(first);
    expect(requestCount).to.equal(1);
  });

  it("loads and draws a configured player avatar", async () => {
    globalThis.fetch = async (url) => {
      if (url !== "/api/players/player2/avatar") return originalFetch(url);
      return {
        ok: true,
        json: async () => ({
          revision: "revision-2",
          avatar: DEFAULT_AVATAR,
        }),
      };
    };
    const element = await fixture(
      html`<phg-avatar playerId="player2" revision="revision-2"></phg-avatar>`,
    );
    const canvas = element.querySelector("canvas");

    await waitUntil(() => canvas.dataset.revision === "revision-2");

    expect(canvas.dataset.error).to.be.undefined;
  });

  it("draws a local avatar configuration", async () => {
    const element = await fixture(
      html`<phg-avatar .avatar=${DEFAULT_AVATAR}></phg-avatar>`,
    );
    const canvas = element.querySelector("canvas");

    await waitUntil(() => canvas.hasAttribute("data-rendered"));

    expect(canvas.dataset.error).to.be.undefined;
  });

  it("redraws an avatar restored after removal without fetching it again", async () => {
    let requests = 0;
    globalThis.fetch = async () => {
      requests += 1;
      return {
        ok: true,
        json: async () => ({ revision: "restored", avatar: DEFAULT_AVATAR }),
      };
    };
    const element = await fixture(
      html`<phg-avatar
        playerId="restoredplayer"
        revision="restored"
      ></phg-avatar>`,
    );
    await waitUntil(() =>
      element.querySelector("canvas")?.hasAttribute("data-rendered"),
    );
    const original = element.querySelector("canvas").toDataURL();
    element.revision = undefined;
    await element.updateComplete;
    expect(element.querySelector("canvas")).to.not.exist;

    element.revision = "restored";
    await element.updateComplete;
    await waitUntil(() =>
      element.querySelector("canvas")?.hasAttribute("data-rendered"),
    );
    expect(element.querySelector("canvas").toDataURL()).to.equal(original);
    expect(requests).to.equal(1);
  });

  it("renders the sign-in icon when no avatar is configured", async () => {
    const element = await fixture(
      html`<phg-avatar label="No avatar selected"></phg-avatar>`,
    );
    const emptyAvatar = element.querySelector(".avatar-empty");

    expect(emptyAvatar).to.exist;
    expect(emptyAvatar.getAttribute("aria-label")).to.equal(
      "No avatar selected",
    );
    expect(emptyAvatar.querySelector("svg")).to.exist;
    expect(element.querySelector("canvas")).to.not.exist;
  });
});
