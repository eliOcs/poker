import { expect } from "@open-wc/testing";
import "../../src/frontend/avatar-maker.js";
import { drawAvatarPartPreview } from "../../src/frontend/avatar-drawing.js";
import { drawEyes } from "../../src/frontend/avatar-eyes.js";
import { DEFAULT_AVATAR } from "../../src/frontend/avatar-maker-data.js";
import { getAvatarSpriteTypes } from "../../src/frontend/avatar-sprite-data.js";
import {
  avatarSpritesReady,
  drawSpriteAvatar,
} from "../../src/frontend/avatar-sprites.js";
import { drawPixelated } from "../../src/frontend/canvas-pixel-renderer.js";

describe("phg-avatar-maker invalid state", () => {
  before(() => avatarSpritesReady);

  it("reports an unknown active tab", () => {
    const maker = document.createElement("phg-avatar-maker");
    maker.activeTab = "unknown";

    expect(() => maker.render()).to.throw("Unknown avatar maker tab: unknown");
  });

  it("reports a missing avatar preview canvas", () => {
    const maker = document.createElement("phg-avatar-maker");

    expect(() => maker.updated()).to.throw("Avatar preview canvas not found");
  });

  it("reports an unavailable pixel-art buffer", () => {
    const context = document.createElement("canvas").getContext("2d");
    const getContext = HTMLCanvasElement.prototype.getContext;
    try {
      HTMLCanvasElement.prototype.getContext = () => null;

      expect(() => drawPixelated(context, 128, () => {})).to.throw(
        "Could not create the pixel-art canvas context",
      );
    } finally {
      HTMLCanvasElement.prototype.getContext = getContext;
    }
  });

  it("reports unknown sprite parts and types", () => {
    expect(() => getAvatarSpriteTypes("unknown")).to.throw(
      "Unknown avatar sprite part: unknown",
    );

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    const missingPartAvatar = structuredClone(DEFAULT_AVATAR);
    delete missingPartAvatar.torso;
    expect(() => drawSpriteAvatar(context, missingPartAvatar)).to.throw(
      "Missing avatar part: torso",
    );

    const unknownTypeAvatar = structuredClone(DEFAULT_AVATAR);
    unknownTypeAvatar.face.type = "unknown";
    expect(() => drawSpriteAvatar(context, unknownTypeAvatar)).to.throw(
      "Unknown face sprite type: unknown",
    );
  });

  it("reports unknown fallback face and eye types", () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 96;
    const context = canvas.getContext("2d");

    expect(() =>
      drawAvatarPartPreview(context, DEFAULT_AVATAR, "face", "unknown"),
    ).to.throw("Unknown face sprite type: unknown");
    expect(() =>
      drawEyes(context, {
        type: "unknown",
        position: 0,
        spacing: 0,
        rotation: 0,
        size: 0,
        color: "#39758c",
      }),
    ).to.throw("Unknown eye type: unknown");
  });
});
