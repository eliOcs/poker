import {
  AVATAR_SPRITE_PARTS,
  AVATAR_SPRITE_SIZE,
  PART_ADJUSTMENTS,
} from "./avatar-sprite-data.js";
import {
  drawOvalFacePartPreview,
  getAlphaBounds,
} from "./avatar-sprite-preview.js";

const PIXEL_SIZE = AVATAR_SPRITE_SIZE;
const DARK = "#151522";
const WHITE = "#f5f0e6";
const ACCENT = "#b54835";
const WHITE_LAYER_ROLES = new Set(["sclera", "teeth"]);
const SHARED_PREVIEW_SCALE_PARTS = new Set(["face", "nose"]);
const FULL_SKIN_PREVIEW_PARTS = new Set(["eyes", "eyebrows", "nose", "mouth"]);
const BEARD_TYPES = new Set(["neckbeard", "beard", "beardCurly"]);
const OVAL_FACE_PREVIEW_PARTS = new Set(["ears", "hair", "facialHair"]);
const spriteImages = new Map();
const spriteCenters = new Map();
let spritesReady = false;
const sharedPreviewScales = new Map();
const tintCanvas = document.createElement("canvas");
const previewCanvas = document.createElement("canvas");
const boundsCanvas = document.createElement("canvas");
tintCanvas.width = tintCanvas.height = PIXEL_SIZE;
previewCanvas.width = previewCanvas.height = PIXEL_SIZE;
boundsCanvas.width = boundsCanvas.height = PIXEL_SIZE;

export const avatarSpritesReady = Promise.all(
  Object.entries(AVATAR_SPRITE_PARTS).flatMap(([partId, part]) =>
    Object.entries(part.styles).flatMap(([type, sprite]) => {
      if (!sprite) return [];
      return Object.keys(sprite.layers).flatMap((role) =>
        getSpriteDirections(part).map(async (direction) => {
          const id = getSpriteId(partId, type, role, direction);
          const directory = toKebabCase(partId);
          const side = getDirectionSuffix(direction);
          const url = new URL(
            `./assets/avatar/${directory}/${type}-${role}${side}.png`,
            import.meta.url,
          );
          spriteImages.set(id, await loadImage(url));
        }),
      );
    }),
  ),
).then(() => {
  spritesReady = true;
});

/**
 * @param {CanvasRenderingContext2D} context
 * @param {any} avatar
 */
export function drawSpriteAvatar(context, avatar) {
  drawAdjustedPart(context, avatar, "torso");
  drawAdjustedPart(context, avatar, "clothes");
  drawAdjustedPart(context, avatar, "face");
  drawAdjustedPart(context, avatar, "eyes");
  drawAdjustedPart(context, avatar, "eyebrows");
  drawAdjustedPart(context, avatar, "nose");
  const beardBehindMouth = BEARD_TYPES.has(avatar.facialHair?.type);
  if (beardBehindMouth) drawAdjustedPart(context, avatar, "facialHair");
  drawAdjustedPart(context, avatar, "mouth");
  if (!beardBehindMouth) drawAdjustedPart(context, avatar, "facialHair");
  drawAdjustedPart(context, avatar, "hair");
  drawAdjustedPart(context, avatar, "ears");
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {any} avatar
 * @param {string} partId
 */
export function drawSpritePart(context, avatar, partId) {
  drawAdjustedPart(context, avatar, partId);
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {any} avatar
 * @param {string} partId
 * @param {string} type
 */
export function drawSpritePartPreview(context, avatar, partId, type) {
  const { sprite } = getSpriteConfig(partId, type);

  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  if (!sprite) {
    drawEmptyPreview(context);
    return true;
  }
  if (FULL_SKIN_PREVIEW_PARTS.has(partId)) {
    drawPreviewSkin(context, avatar.face.color);
  }

  const previewContext = previewCanvas.getContext("2d");
  if (!previewContext) {
    throw new Error("Avatar sprite preview canvas context unavailable");
  }
  previewContext.clearRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);
  const previewAvatar = {
    ...avatar,
    face: OVAL_FACE_PREVIEW_PARTS.has(partId)
      ? { ...avatar.face, type: "oval" }
      : avatar.face,
    [partId]: { ...avatar[partId], type },
  };
  if (!spritesReady) return true;
  if (OVAL_FACE_PREVIEW_PARTS.has(partId)) {
    drawOvalFacePartPreview({
      context,
      sourceContext: previewContext,
      sourceCanvas: previewCanvas,
      avatar: previewAvatar,
      partId,
      drawPart: drawPartLayers,
    });
    return true;
  }
  drawPartLayers(previewContext, previewAvatar, partId);
  const bounds = getAlphaBounds(previewContext);
  if (!bounds) {
    throw new Error(`Avatar sprite has no visible pixels: ${partId}/${type}`);
  }
  const scale = getPreviewScale(partId, bounds);
  const width = Math.max(1, Math.round(bounds.width * scale));
  const height = Math.max(1, Math.round(bounds.height * scale));
  context.imageSmoothingEnabled = false;
  context.drawImage(
    previewCanvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    Math.round((context.canvas.width - width) / 2),
    Math.round((context.canvas.height - height) / 2),
    width,
    height,
  );
  return true;
}

function getPreviewScale(partId, bounds) {
  const fitWidth = partId === "face" ? 92 : 86;
  const fitHeight = partId === "face" ? 60 : 52;
  const fittedScale = Math.min(
    fitWidth / bounds.width,
    fitHeight / bounds.height,
  );
  if (!SHARED_PREVIEW_SCALE_PARTS.has(partId) || !spritesReady) {
    return fittedScale;
  }
  const cachedScale = sharedPreviewScales.get(partId);
  if (cachedScale) return cachedScale;

  const context = boundsCanvas.getContext("2d");
  if (!context) {
    throw new Error("Avatar sprite bounds canvas context unavailable");
  }
  let spriteMaxWidth = 0;
  let spriteMaxHeight = 0;
  const part = AVATAR_SPRITE_PARTS[partId];
  for (const [type, sprite] of Object.entries(part.styles)) {
    if (!sprite) continue;
    context.clearRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);
    drawSpriteBoundsLayers(context, partId, type, sprite);
    const styleBounds = getAlphaBounds(context);
    if (!styleBounds) {
      throw new Error(`Avatar sprite has no visible pixels: ${partId}/${type}`);
    }
    spriteMaxWidth = Math.max(spriteMaxWidth, styleBounds.width);
    spriteMaxHeight = Math.max(spriteMaxHeight, styleBounds.height);
  }
  const scale = Math.min(
    fitWidth / spriteMaxWidth,
    fitHeight / spriteMaxHeight,
  );
  sharedPreviewScales.set(partId, scale);
  return scale;
}

function drawAdjustedPart(context, avatar, partId) {
  const part = avatar[partId];
  if (!part) throw new Error(`Missing avatar part: ${partId}`);
  const partConfig = AVATAR_SPRITE_PARTS[partId];
  if (!partConfig) throw new Error(`Unknown avatar sprite part: ${partId}`);
  if (!(part.type in partConfig.styles)) {
    throw new Error(`Unknown ${partId} sprite type: ${part.type}`);
  }
  if (!partConfig.styles[part.type]) return;
  const adjustment = PART_ADJUSTMENTS[partId];
  if (adjustment.paired) {
    drawPairedPart(context, avatar, partId, part, adjustment);
    return;
  }
  if (adjustment.preserveSourcePosition) {
    drawSourcePositionedPart(context, avatar, partId, part, adjustment);
    return;
  }

  drawSinglePart(context, avatar, partId, part, adjustment);
}

function drawSourcePositionedPart(context, avatar, partId, part, adjustment) {
  const scale = 1 + (part.size ?? 0) * adjustment.sizeStep;
  context.save();
  context.translate(
    PIXEL_SIZE / 2 +
      (part.horizontalPosition ?? 0) * adjustment.horizontalPositionStep,
    PIXEL_SIZE / 2 + (part.position ?? 0) * adjustment.positionStep,
  );
  context.scale(scale, scale);
  context.translate(-PIXEL_SIZE / 2, -PIXEL_SIZE / 2);
  drawPartLayers(context, avatar, partId);
  context.restore();
}

function drawPairedPart(context, avatar, partId, part, adjustment) {
  for (const direction of [-1, 1]) {
    const fallbackX = direction < 0 ? PIXEL_SIZE / 4 : (PIXEL_SIZE * 3) / 4;
    const center = getPartCenter(
      partId,
      part.type,
      direction,
      fallbackX,
      PIXEL_SIZE / 2,
    );
    context.save();
    context.translate(
      center.x + direction * (part.spacing ?? 0) * adjustment.spacingStep,
      center.y + (part.position ?? 0) * adjustment.positionStep,
    );
    context.rotate(
      direction * ((part.rotation ?? 0) * adjustment.rotationStep),
    );
    const scale = 1 + (part.size ?? 0) * adjustment.sizeStep;
    context.scale(scale, scale);
    context.translate(-center.x, -center.y);
    drawPartLayers(context, avatar, partId, direction);
    context.restore();
  }
}

function drawSinglePart(context, avatar, partId, part, adjustment) {
  const center = getPartCenter(
    partId,
    part.type,
    0,
    PIXEL_SIZE / 2,
    PIXEL_SIZE / 2,
  );
  context.save();
  context.translate(
    center.x +
      (part.horizontalPosition ?? 0) * (adjustment.horizontalPositionStep ?? 0),
    center.y + (part.position ?? 0) * adjustment.positionStep,
  );
  context.rotate((part.rotation ?? 0) * adjustment.rotationStep);
  const scale = 1 + (part.size ?? 0) * adjustment.sizeStep;
  context.scale(scale, scale);
  context.translate(-center.x, -center.y);
  drawPartLayers(context, avatar, partId);
  context.restore();
}

function getPartCenter(partId, type, direction, fallbackX, fallbackY) {
  const id = `${partId}/${type}/${direction}`;
  const cached = spriteCenters.get(id);
  if (cached) return cached;

  const sprite = getDrawableSprite(partId, type);
  const context = getBoundsContext();
  context.clearRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);
  if (!drawSpriteBoundsLayers(context, partId, type, sprite)) {
    if (spritesReady) {
      throw new Error(`Avatar sprite images unavailable: ${partId}/${type}`);
    }
    return { x: fallbackX, y: fallbackY };
  }

  const minX = direction > 0 ? PIXEL_SIZE / 2 : 0;
  const maxX = direction < 0 ? PIXEL_SIZE / 2 : PIXEL_SIZE;
  const bounds = getAlphaBounds(context, minX, maxX);
  if (!bounds) {
    if (spritesReady) {
      throw new Error(`Avatar sprite has no visible pixels: ${partId}/${type}`);
    }
    return { x: fallbackX, y: fallbackY };
  }
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  spriteCenters.set(id, center);
  return center;
}

function getSpriteConfig(partId, type) {
  const partConfig = AVATAR_SPRITE_PARTS[partId];
  if (!partConfig) throw new Error(`Unknown avatar sprite part: ${partId}`);
  if (!(type in partConfig.styles)) {
    throw new Error(`Unknown ${partId} sprite type: ${type}`);
  }
  return { partConfig, sprite: partConfig.styles[type] };
}

function getDrawableSprite(partId, type) {
  const { sprite } = getSpriteConfig(partId, type);
  if (!sprite) throw new Error(`Avatar sprite is empty: ${partId}/${type}`);
  return sprite;
}

function getBoundsContext() {
  const context = boundsCanvas.getContext("2d");
  if (!context) {
    throw new Error("Avatar sprite bounds canvas context unavailable");
  }
  return context;
}

function drawSpriteBoundsLayers(context, partId, type, sprite) {
  let hasImage = false;
  for (const role of Object.keys(sprite.layers)) {
    for (const { image } of getSpriteLayerImages(partId, type, role)) {
      context.drawImage(image, 0, 0);
      hasImage = true;
    }
  }
  return hasImage;
}

function drawPartLayers(context, avatar, partId, direction = 0) {
  const part = avatar[partId];
  const sprite = AVATAR_SPRITE_PARTS[partId]?.styles[part?.type];
  if (!sprite) {
    throw new Error(`Unknown ${partId} sprite type: ${part?.type}`);
  }
  for (const role of Object.keys(sprite.layers)) {
    for (const layer of getSpriteLayerImages(
      partId,
      part.type,
      role,
      direction,
    )) {
      drawTintedLayer(
        context,
        layer.image,
        getLayerColor(avatar, partId, role),
        layer.cropDirection,
      );
    }
  }
}

function getSpriteLayerImages(partId, type, role, direction = 0) {
  const part = AVATAR_SPRITE_PARTS[partId];
  if (!part) throw new Error(`Unknown avatar sprite part: ${partId}`);
  const directions = part.splitHorizontally
    ? direction === 0
      ? [-1, 1]
      : [direction]
    : [0];
  return directions.flatMap((imageDirection) => {
    const image = spriteImages.get(
      getSpriteId(partId, type, role, imageDirection),
    );
    if (!image && spritesReady) {
      throw new Error(
        `Avatar sprite image unavailable: ${partId}/${type}/${role}/${imageDirection}`,
      );
    }
    return image
      ? [{ image, cropDirection: part.splitHorizontally ? 0 : direction }]
      : [];
  });
}

function drawTintedLayer(context, image, color, direction) {
  const tintContext = tintCanvas.getContext("2d");
  if (!tintContext) {
    throw new Error("Avatar sprite tint canvas context unavailable");
  }
  tintContext.clearRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);
  tintContext.globalCompositeOperation = "source-over";
  tintContext.drawImage(image, 0, 0);
  tintContext.globalCompositeOperation = "source-in";
  tintContext.fillStyle = color;
  tintContext.fillRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);
  tintContext.globalCompositeOperation = "source-over";
  context.imageSmoothingEnabled = false;
  const halfSize = PIXEL_SIZE / 2;
  if (direction < 0) {
    context.drawImage(
      tintCanvas,
      0,
      0,
      halfSize,
      PIXEL_SIZE,
      0,
      0,
      halfSize,
      PIXEL_SIZE,
    );
  } else if (direction > 0) {
    context.drawImage(
      tintCanvas,
      halfSize,
      0,
      halfSize,
      PIXEL_SIZE,
      halfSize,
      0,
      halfSize,
      PIXEL_SIZE,
    );
  } else {
    context.drawImage(tintCanvas, 0, 0);
  }
}

function getLayerColor(avatar, partId, role) {
  if (role === "skin" || partId === "nose") {
    return getSkinLayerColor(avatar.face.color, partId);
  }
  if (WHITE_LAYER_ROLES.has(role)) return WHITE;
  if (role === "iris") return avatar.eyes.color;
  if (["background", "foreground"].includes(role)) {
    return getHairLayerColor(avatar[partId].color, role);
  }
  if (role === "color") return getColorLayerColor(avatar, partId);
  if (role === "tongue") return ACCENT;
  if (role === "contour") return getContourLayerColor(avatar, partId);
  if (["eyebrows", "hair", "facialHair"].includes(partId)) {
    return avatar[partId].color;
  }
  return DARK;
}

function getSkinLayerColor(color, partId) {
  return partId === "nose" ? shade(color, -34) : color;
}

function getColorLayerColor(avatar, partId) {
  return partId === "clothes" ? avatar.clothes.color : ACCENT;
}

function getHairLayerColor(color, role) {
  return role === "foreground" ? shade(color, 24) : color;
}

function getContourLayerColor(avatar, partId) {
  if (partId === "clothes") return shade(avatar.clothes.color, -34);
  if (["face", "ears", "torso"].includes(partId)) {
    return shade(avatar.face.color, -34);
  }
  return DARK;
}

function drawPreviewSkin(context, color) {
  context.fillStyle = color;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
}

function drawEmptyPreview(context) {
  context.strokeStyle = "#777781";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(31, 47);
  context.lineTo(65, 17);
  context.stroke();
}

function getSpriteId(partId, type, role, direction = 0) {
  return `${partId}/${type}/${role}/${direction}`;
}

function getSpriteDirections(part) {
  return part.splitHorizontally ? [-1, 1] : [0];
}

function getDirectionSuffix(direction) {
  if (direction < 0) return "-left";
  if (direction > 0) return "-right";
  return "";
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

function shade(color, amount) {
  const value = Number.parseInt(color.slice(1), 16);
  const red = Math.max(0, Math.min(255, (value >> 16) + amount));
  const green = Math.max(0, Math.min(255, ((value >> 8) & 0xff) + amount));
  const blue = Math.max(0, Math.min(255, (value & 0xff) + amount));
  return `rgb(${red}, ${green}, ${blue})`;
}

function toKebabCase(value) {
  return value.replace(/([A-Z])/g, "-$1").toLowerCase();
}
