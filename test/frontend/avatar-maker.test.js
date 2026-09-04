import { fixture, expect, html, oneEvent } from "@open-wc/testing";
import "../../src/frontend/avatar-maker.js";
import { avatarSpritesReady } from "../../src/frontend/avatar-sprites.js";
import { AVATAR_SPRITE_SIZE } from "../../src/frontend/avatar-sprite-data.js";
import {
  eyeSpriteRenderingMatchesSource,
  getOpaqueCenter,
  getOpaqueOverlap,
  renderIsolatedFacialHair,
  renderIsolatedFeatures,
  randomizedAdjustmentsStayWithinInnerRange,
  spriteHalvesAreSeparated,
} from "./avatar-maker-test-helpers.js";

describe("phg-avatar-maker", () => {
  before(() => avatarSpritesReady);

  it("starts on the face controls with all feature tabs available", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);

    const tabs = [...maker.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.textContent.trim())).to.deep.equal([
      "Face",
      "Eyes",
      "Eyebrows",
      "Nose",
      "Mouth",
      "Ears",
      "Hair",
      "Facial hair",
      "Clothes",
    ]);
    expect(tabs[0].getAttribute("aria-selected")).to.equal("true");
    expect(maker.querySelector("canvas")).to.exist;
    const canvas = maker.querySelector(".avatar-maker__canvas-frame canvas");
    expect(canvas.width).to.equal(AVATAR_SPRITE_SIZE * 3);
    expect(canvas.height).to.equal(AVATAR_SPRITE_SIZE * 3);
  });

  it("shows the selected feature's controls", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);

    maker.querySelector("#avatar-tab-eyes").click();
    await maker.updateComplete;

    expect(maker.activeTab).to.equal("eyes");
    expect(
      maker.querySelector("#avatar-tab-eyes").getAttribute("aria-selected"),
    ).to.equal("true");
    expect(maker.querySelectorAll(".avatar-maker__adjustment")).to.have.length(
      4,
    );
    expect(
      maker.querySelector(".avatar-maker__colors legend").textContent.trim(),
    ).to.equal("Eye color");
  });

  it("moves the face vertically and horizontally", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    const canvas = maker.querySelector(".avatar-maker__canvas-frame canvas");
    const initial = canvas.toDataURL();

    maker.querySelector('[aria-label="Move down Face"]').click();
    await maker.updateComplete;
    const movedDown = canvas.toDataURL();

    expect(maker.avatar.face.position).to.equal(1);
    expect(movedDown).to.not.equal(initial);

    maker.querySelector('[aria-label="Move right Face"]').click();
    await maker.updateComplete;

    expect(maker.avatar.face.horizontalPosition).to.equal(1);
    expect(canvas.toDataURL()).to.not.equal(movedDown);
  });

  it("moves nose, mouth, and facial hair horizontally", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);

    for (const [partId, style] of [
      ["nose", "C"],
      ["mouth", "Happy"],
      ["facialHair", "Dali"],
    ]) {
      maker.querySelector(`#avatar-tab-${partId}`).click();
      await maker.updateComplete;
      [...maker.querySelectorAll(".avatar-maker__option")]
        .find((option) => option.textContent.trim() === style)
        .click();
      await maker.updateComplete;

      const canvas = maker.querySelector(".avatar-maker__canvas-frame canvas");
      const before = canvas.toDataURL();
      maker
        .querySelector(`[aria-label="Move right ${getFeatureLabel(partId)}"]`)
        .click();
      await maker.updateComplete;

      expect(maker.avatar[partId].horizontalPosition).to.equal(1);
      expect(canvas.toDataURL()).to.not.equal(before);
    }
  });

  it("offers every style exported from the XCF", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    const expectedStyles = {
      face: [
        "Round",
        "Oval",
        "Diamond",
        "Square",
        "Pear",
        "Wide",
        "Angular",
        "Triangle",
        "Gaunt",
      ],
      eyes: [
        "Beady",
        "Lines",
        "Happy",
        "Squint",
        "Hypnotic",
        "Sleepy",
        "Sparkle",
        "Round",
        "Lashes",
      ],
      eyebrows: ["None", "Soft", "Straight", "Hairy", "Thick", "Slanted"],
      nose: ["None", "L", "C", "D", "V", "Holes", "Big", "U", "Thick", "Pig"],
      mouth: [
        "Happy",
        "Smile",
        "Straight",
        "Kiss",
        "Kawai",
        "Skull",
        "Front Tooth",
        "Teeth",
        "Sad",
        "Open Mouth",
        "Lips",
        "Angry",
      ],
      ears: ["None", "Small", "Big", "Pointy", "Wide"],
      hair: [
        "None",
        "Short Curly",
        "Old",
        "Short High",
        "Short Classic",
        "Nerd",
        "Long1",
        "Long2",
        "Medi",
        "Buzz",
      ],
      facialHair: [
        "None",
        "Pencil",
        "Neckbeard",
        "Sideburns",
        "Beard",
        "Beard Curly",
        "Moustache",
        "Dali",
        "Goatee",
        "Kung Fu",
      ],
    };

    for (const [partId, styles] of Object.entries(expectedStyles)) {
      maker.querySelector(`#avatar-tab-${partId}`).click();
      await maker.updateComplete;
      expect(
        [
          ...maker.querySelectorAll(".avatar-maker__option > span:last-child"),
        ].map((label) => label.textContent.trim()),
        partId,
      ).to.deep.equal(styles);
    }
  });

  it("only offers color controls for colorable eye styles", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);

    maker.querySelector("#avatar-tab-eyes").click();
    await maker.updateComplete;
    const options = [...maker.querySelectorAll(".avatar-maker__option")];
    options.find((option) => option.textContent.trim() === "Beady").click();
    await maker.updateComplete;
    expect(maker.querySelector(".avatar-maker__colors")).to.not.exist;

    options.find((option) => option.textContent.trim() === "Round").click();
    await maker.updateComplete;
    expect(maker.querySelector(".avatar-maker__colors")).to.exist;

    options.find((option) => option.textContent.trim() === "Lashes").click();
    await maker.updateComplete;
    expect(maker.querySelector(".avatar-maker__colors")).to.exist;
  });

  it("renders layered hair with a lighter foreground", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    const canvas = maker.querySelector(".avatar-maker__canvas-frame canvas");
    const context = canvas.getContext("2d");

    expect(countColorPixels(context, [74, 48, 40])).to.be.greaterThan(0);
    expect(countColorPixels(context, [98, 72, 64])).to.be.greaterThan(0);
  });

  it("tints noses with the darker skin contour color", () => {
    const context = renderIsolatedFeatures({
      nose: { type: "c", position: 0, horizontalPosition: 0, size: 0 },
    });

    expect(countColorPixels(context, [167, 96, 51])).to.be.greaterThan(0);
    expect(countColorPixels(context, [21, 21, 34])).to.equal(0);
  });

  it("customizes clothes and background colors without a style picker", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    maker.querySelector("#avatar-tab-clothes").click();
    await maker.updateComplete;

    expect(maker.querySelector(".avatar-maker__option")).to.not.exist;
    expect(maker.querySelector(".avatar-maker__adjustments")).to.not.exist;
    expect(
      [...maker.querySelectorAll(".avatar-maker__colors legend")].map(
        (legend) => legend.textContent.trim(),
      ),
    ).to.deep.equal(["Clothes color", "Background color"]);

    const canvas = maker.querySelector(".avatar-maker__canvas-frame canvas");
    const initial = canvas.toDataURL();
    maker.querySelector('[aria-label="Clothes color 2"]').click();
    await maker.updateComplete;
    const changedClothes = canvas.toDataURL();

    expect(maker.avatar.clothes.color).to.equal("#39758c");
    expect(changedClothes).to.not.equal(initial);

    maker.querySelector('[aria-label="Background color 2"]').click();
    await maker.updateComplete;

    expect(maker.avatar.background.color).to.equal("#de935f");
    expect(canvas.toDataURL()).to.not.equal(changedClothes);
    for (const color of [
      [23, 83, 106],
      [167, 96, 51],
    ]) {
      expect(
        countColorPixels(canvas.getContext("2d"), color),
      ).to.be.greaterThan(0);
    }
  });

  it("composes the colorable layers of sleepy eyes", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);

    maker.querySelector("#avatar-tab-eyes").click();
    await maker.updateComplete;
    const sleepy = [...maker.querySelectorAll(".avatar-maker__option")].find(
      (option) => option.textContent.trim() === "Sleepy",
    );
    sleepy.click();
    await maker.updateComplete;

    const canvas = maker.querySelector(".avatar-maker__canvas-frame canvas");
    const context = canvas.getContext("2d");
    expect(countColorPixels(context, [57, 117, 140])).to.be.greaterThan(0);
    expect(countColorPixels(context, [245, 240, 230])).to.be.greaterThan(0);
    expect(countColorPixels(context, [21, 21, 34])).to.be.greaterThan(0);
  });

  it("renders the avatar as uniform pixel-art blocks", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    const canvas = maker.querySelector(".avatar-maker__canvas-frame canvas");
    const context = canvas.getContext("2d");
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

    expect(hasUniformBlocks(data, canvas.width, 3)).to.equal(true);
  });

  it("tints both sparkle irises with the selected eye color", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    maker.querySelector("#avatar-tab-eyes").click();
    await maker.updateComplete;
    [...maker.querySelectorAll(".avatar-maker__option")]
      .find((option) => option.textContent.trim() === "Sparkle")
      .click();
    await maker.updateComplete;
    maker.querySelector('[aria-label="Color 3"]').click();
    await maker.updateComplete;

    const canvas = maker.querySelector(".avatar-maker__canvas-frame canvas");
    expect(maker.avatar.eyes.color).to.equal("#3e7058");
    expect(
      countColorPixels(canvas.getContext("2d"), [62, 112, 88]),
    ).to.be.greaterThan(0);
  });

  it("uses the smaller, closer eye layout as the neutral baseline", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    maker.querySelector("#avatar-tab-eyes").click();
    await maker.updateComplete;
    const canvas = maker.querySelector(".avatar-maker__canvas-frame canvas");
    const before = canvas.toDataURL();

    expect(maker.avatar.eyes.spacing).to.equal(0);
    expect(maker.avatar.eyes.size).to.equal(0);
    expect(
      maker.querySelector('[aria-label="Move closer Eyes"]').disabled,
    ).to.equal(false);
    expect(
      maker.querySelector('[aria-label="Smaller Eyes"]').disabled,
    ).to.equal(false);

    maker.querySelector('[aria-label="Move apart Eyes"]').click();
    await maker.updateComplete;

    expect(maker.avatar.eyes.spacing).to.equal(1);
    expect(canvas.toDataURL()).to.not.equal(before);
  });

  it("preserves the authored eye position and proportions", async () => {
    const spriteUrl = new URL(
      "../../src/frontend/assets/avatar/eyes/beady-details.png",
      import.meta.url,
    );
    expect(await eyeSpriteRenderingMatchesSource(spriteUrl)).to.equal(true);
    expect(await spriteHalvesAreSeparated(spriteUrl)).to.equal(true);
    expect(
      await spriteHalvesAreSeparated(
        new URL(
          "../../src/frontend/assets/avatar/eyebrows/soft-details.png",
          import.meta.url,
        ),
      ),
    ).to.equal(true);
  });

  it("rotates eyes inward around their own centers", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    maker.querySelector("#avatar-tab-eyes").click();
    await maker.updateComplete;
    const canvas = maker.querySelector(".avatar-maker__canvas-frame canvas");
    const before = canvas.toDataURL();

    maker.querySelector('[aria-label="Rotate inward Eyes"]').click();
    await maker.updateComplete;

    expect(maker.avatar.eyes.rotation).to.equal(1);
    expect(canvas.toDataURL()).to.not.equal(before);
  });

  it("keeps facial hair positioned relative to the source artboard", () => {
    const neutral = getOpaqueCenter(
      renderIsolatedFacialHair("dali", 0),
      0,
      AVATAR_SPRITE_SIZE,
    );
    const bigger = getOpaqueCenter(
      renderIsolatedFacialHair("dali", 2),
      0,
      AVATAR_SPRITE_SIZE,
    );

    const center = AVATAR_SPRITE_SIZE / 2;
    expect(Math.abs(bigger.y - center)).to.be.greaterThan(
      Math.abs(neutral.y - center),
    );
  });

  it("renders beard styles behind the mouth", () => {
    const mouth = renderIsolatedFeatures({
      mouth: { type: "happy", position: 0, horizontalPosition: 0, size: 0 },
    });

    for (const type of ["beard", "beardCurly"]) {
      const facialHair = {
        type,
        position: 0,
        horizontalPosition: 0,
        size: 0,
        color: "#ff0000",
      };
      const beard = renderIsolatedFeatures({ facialHair });
      const overlap = getOpaqueOverlap(mouth, beard);
      expect(overlap, type).to.not.equal(undefined);

      const composed = renderIsolatedFeatures({
        mouth: {
          type: "happy",
          position: 0,
          horizontalPosition: 0,
          size: 0,
        },
        facialHair,
      });
      const pixel = composed.getImageData(
        overlap % AVATAR_SPRITE_SIZE,
        Math.floor(overlap / AVATAR_SPRITE_SIZE),
        1,
        1,
      ).data;
      expect([...pixel.slice(0, 3)], type).to.deep.equal([21, 21, 34]);
    }
  });

  it("allows optional facial features to be removed", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);

    maker.querySelector("#avatar-tab-ears").click();
    await maker.updateComplete;
    expect(maker.querySelectorAll(".avatar-maker__adjustment")).to.have.length(
      3,
    );
    maker.querySelector('[aria-label="Move apart Ears"]').click();
    await maker.updateComplete;
    expect(maker.avatar.ears.spacing).to.equal(1);

    const none = [...maker.querySelectorAll(".avatar-maker__option")].find(
      (option) => option.textContent.trim() === "None",
    );
    none.click();
    await maker.updateComplete;

    expect(maker.avatar.ears.type).to.equal("none");

    for (const partId of ["eyebrows", "nose"]) {
      maker.querySelector(`#avatar-tab-${partId}`).click();
      await maker.updateComplete;
      [...maker.querySelectorAll(".avatar-maker__option")]
        .find((option) => option.textContent.trim() === "None")
        .click();
      await maker.updateComplete;
      expect(maker.avatar[partId].type).to.equal("none");
    }
  });

  it("renders a distinct preview for every style in each feature", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);

    for (const tab of maker.querySelectorAll('[role="tab"]')) {
      tab.click();
      await maker.updateComplete;
      const previews = [
        ...maker.querySelectorAll(".avatar-maker__option canvas"),
      ];
      const images = previews.map((preview) => preview.toDataURL());
      expect(new Set(images).size).to.equal(images.length);
    }
  });

  it("updates a feature and emits the full avatar configuration", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    const changed = oneEvent(maker, "avatar-changed");

    maker.querySelector('[aria-label="Bigger Face"]').click();
    const event = await changed;

    expect(maker.avatar.face.size).to.equal(1);
    expect(event.detail.avatar.face.size).to.equal(1);
    expect(event.detail.avatar.eyes.type).to.equal("round");
  });

  it("keeps randomized adjustments away from their extremes", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    expect(randomizedAdjustmentsStayWithinInnerRange(maker)).to.equal(true);
  });

  it("changes only the face shape when adjusting face size", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    const canvas = maker.querySelector(".avatar-maker__canvas-frame canvas");
    const before = getCanvasColorPixels(canvas);

    maker.querySelector('[aria-label="Bigger Face"]').click();
    await maker.updateComplete;

    const after = getCanvasColorPixels(canvas);
    expect(after.eyes).to.deep.equal(before.eyes);
    expect(after.skin.length).to.be.greaterThan(before.skin.length);
  });

  it("rotates the face shape without moving the facial features", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    const canvas = maker.querySelector(".avatar-maker__canvas-frame canvas");
    const before = getCanvasColorPixels(canvas);

    maker.querySelector('[aria-label="Rotate clockwise Face"]').click();
    await maker.updateComplete;

    const after = getCanvasColorPixels(canvas);
    expect(maker.avatar.face.rotation).to.equal(1);
    expect(after.eyes).to.deep.equal(before.eyes);
    expect(after.skin).to.not.deep.equal(before.skin);
  });

  it("supports arrow-key navigation between tabs", async () => {
    const maker = await fixture(html`<phg-avatar-maker></phg-avatar-maker>`);
    const faceTab = maker.querySelector("#avatar-tab-face");

    faceTab.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    await maker.updateComplete;

    expect(maker.activeTab).to.equal("eyes");
    expect(document.activeElement).to.equal(
      maker.querySelector("#avatar-tab-eyes"),
    );
  });
});

function getCanvasColorPixels(canvas) {
  const context = canvas.getContext("2d");
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  return {
    eyes: findColorPixels(data, 57, 117, 140),
    skin: findColorPixels(data, 201, 130, 85),
  };
}

function hasUniformBlocks(data, width, blockSize) {
  for (let y = 0; y < width; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      const first = (y * width + x) * 4;
      for (let offsetY = 0; offsetY < blockSize; offsetY += 1) {
        for (let offsetX = 0; offsetX < blockSize; offsetX += 1) {
          const pixel = ((y + offsetY) * width + x + offsetX) * 4;
          for (let channel = 0; channel < 4; channel += 1) {
            if (data[pixel + channel] !== data[first + channel]) return false;
          }
        }
      }
    }
  }
  return true;
}

function findColorPixels(data, red, green, blue) {
  const pixels = [];
  for (let index = 0; index < data.length; index += 4) {
    if (
      data[index] === red &&
      data[index + 1] === green &&
      data[index + 2] === blue &&
      data[index + 3] === 255
    ) {
      pixels.push(index / 4);
    }
  }
  return pixels;
}

function countColorPixels(context, color) {
  const { data } = context.getImageData(
    0,
    0,
    context.canvas.width,
    context.canvas.height,
  );
  let count = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (color.every((channel, offset) => data[index + offset] === channel)) {
      count += 1;
    }
  }
  return count;
}

function getFeatureLabel(partId) {
  return partId === "facialHair"
    ? "Facial hair"
    : partId.replace(/^./, (letter) => letter.toUpperCase());
}
