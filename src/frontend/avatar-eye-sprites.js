const SPRITE_WIDTH = 80;
const SPRITE_HEIGHT = 68;
export const EYE_DARK = "#151522";
export const EYE_WHITE = "#f5f0e6";
const spriteImages = new Map();
const tintCanvas = document.createElement("canvas");

const SPRITE_LAYERS = ["sclera", "iris", "details"];
const SPRITE_SIDES = ["left", "right"];

export const avatarEyeSpritesReady = Promise.all(
  SPRITE_SIDES.flatMap((side) =>
    SPRITE_LAYERS.map(async (layer) => {
      const id = `${side}-${layer}`;
      const url = new URL(
        `./assets/avatar/eyes/sparkle-${id}.png`,
        import.meta.url,
      );
      spriteImages.set(id, await loadImage(url));
    }),
  ),
);

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} direction
 * @param {string} irisColor
 */
export function drawSparkleSpriteEye(context, direction, irisColor) {
  const side = direction < 0 ? "left" : "right";
  const sclera = spriteImages.get(`${side}-sclera`);
  const iris = spriteImages.get(`${side}-iris`);
  const details = spriteImages.get(`${side}-details`);
  if (!sclera || !iris || !details) return false;

  context.imageSmoothingEnabled = false;
  drawTintedLayer(context, sclera, EYE_WHITE);
  drawTintedLayer(context, iris, irisColor);
  drawTintedLayer(context, details, EYE_DARK);
  return true;
}

function drawTintedLayer(context, image, color) {
  tintCanvas.width = image.naturalWidth;
  tintCanvas.height = image.naturalHeight;
  const tintContext = tintCanvas.getContext("2d");
  if (!tintContext) {
    throw new Error("Avatar eye tint canvas context unavailable");
  }

  tintContext.drawImage(image, 0, 0);
  tintContext.globalCompositeOperation = "source-in";
  tintContext.fillStyle = color;
  tintContext.fillRect(0, 0, tintCanvas.width, tintCanvas.height);
  tintContext.globalCompositeOperation = "source-over";
  context.drawImage(
    tintCanvas,
    -SPRITE_WIDTH / 2,
    -SPRITE_HEIGHT / 2,
    SPRITE_WIDTH,
    SPRITE_HEIGHT,
  );
}

/** @param {URL} url */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener(
      "load",
      () => {
        resolve(image);
      },
      { once: true },
    );
    image.addEventListener(
      "error",
      () => {
        reject(new Error(`Could not load avatar sprite: ${url.pathname}`));
      },
      { once: true },
    );
    image.src = url.href;
  });
}
