import { drawSpritePart } from "../../src/frontend/avatar-sprites.js";
import { AVATAR_SPRITE_SIZE } from "../../src/frontend/avatar-sprite-data.js";

const BEARD_TYPES = new Set(["neckbeard", "beard", "beardCurly"]);

export function getAlphaMask(context) {
  const { data } = context.getImageData(
    0,
    0,
    context.canvas.width,
    context.canvas.height,
  );
  return Array.from({ length: data.length / 4 }, (_, index) =>
    data[index * 4 + 3] > 0 ? 1 : 0,
  );
}

export function loadTestImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", reject, { once: true });
    image.src = url.href;
  });
}

export async function spriteHalvesAreSeparated(url) {
  const images = await Promise.all(
    ["left", "right"].map((side) =>
      loadTestImage(new URL(url.href.replace(/\.png$/, `-${side}.png`))),
    ),
  );
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = AVATAR_SPRITE_SIZE;
  const context = canvas.getContext("2d");
  return images.every((image, index) => {
    context.clearRect(0, 0, AVATAR_SPRITE_SIZE, AVATAR_SPRITE_SIZE);
    context.drawImage(image, 0, 0);
    return getAlphaMask(context).every(
      (opaque, pixel) =>
        !opaque ||
        pixel % AVATAR_SPRITE_SIZE < AVATAR_SPRITE_SIZE / 2 === (index === 0),
    );
  });
}

export async function eyeSpriteRenderingMatchesSource(url) {
  const image = await loadTestImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = AVATAR_SPRITE_SIZE;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const expected = getAlphaMask(context);
  return getAlphaMask(renderIsolatedEyes("beady")).every(
    (pixel, index) => pixel === expected[index],
  );
}

export function getOpaqueCenter(context, minX, maxX) {
  const { data, width, height } = context.getImageData(
    0,
    0,
    context.canvas.width,
    context.canvas.height,
  );
  let left = maxX;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return { x: (left + right + 1) / 2, y: (top + bottom + 1) / 2 };
}

export function getOpaqueOverlap(first, second) {
  const firstPixels = first.getImageData(
    0,
    0,
    AVATAR_SPRITE_SIZE,
    AVATAR_SPRITE_SIZE,
  ).data;
  const secondPixels = second.getImageData(
    0,
    0,
    AVATAR_SPRITE_SIZE,
    AVATAR_SPRITE_SIZE,
  ).data;
  for (let index = 0; index < firstPixels.length; index += 4) {
    if (firstPixels[index + 3] > 0 && secondPixels[index + 3] > 0) {
      return index / 4;
    }
  }
  return undefined;
}

export function renderIsolatedEyes(type) {
  return renderIsolatedFeatures({
    eyes: {
      type,
      position: 0,
      spacing: 0,
      rotation: 0,
      size: 0,
      color: "#39758c",
    },
  });
}

export function renderIsolatedFeatures(features) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = AVATAR_SPRITE_SIZE;
  const context = canvas.getContext("2d");
  const avatar = { face: { color: "#c98255" }, ...features };
  const selected = new Set(Object.keys(features));
  const draw = (partId) => {
    if (selected.has(partId)) drawSpritePart(context, avatar, partId);
  };
  for (const partId of ["face", "eyes", "eyebrows", "nose"]) draw(partId);
  const beardBehindMouth = BEARD_TYPES.has(features.facialHair?.type);
  if (beardBehindMouth) draw("facialHair");
  draw("mouth");
  if (!beardBehindMouth) draw("facialHair");
  draw("hair");
  draw("ears");
  return context;
}

export function renderIsolatedFacialHair(type, size) {
  return renderIsolatedFeatures({
    facialHair: {
      type,
      position: 0,
      size,
      color: "#4a3028",
    },
  });
}

export function getRandomizedNumericValues(maker, random) {
  const originalRandom = Math.random;
  try {
    Math.random = () => random;
    maker.randomize();
    return [
      ...new Set(
        Object.values(maker.avatar).flatMap((part) =>
          Object.values(part).filter((value) => typeof value === "number"),
        ),
      ),
    ].sort();
  } finally {
    Math.random = originalRandom;
  }
}

export function randomizedAdjustmentsStayWithinInnerRange(maker) {
  return (
    getRandomizedNumericValues(maker, 0).join() === "-1,0" &&
    getRandomizedNumericValues(maker, 0.999_999).join() === "0,1"
  );
}
