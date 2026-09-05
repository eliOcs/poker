import { AVATAR_SPRITE_PARTS } from "./avatar-sprite-data.js";

/** @type {Map<string, HTMLImageElement>} */
const spriteImages = new Map();
const spriteImagePromises = new Map();
let allSpritesPromise;

export function loadAllAvatarSprites() {
  allSpritesPromise ??= Promise.all(
    Object.entries(AVATAR_SPRITE_PARTS).flatMap(([partId, part]) =>
      Object.keys(part.styles).flatMap((type) => loadPartSprites(partId, type)),
    ),
  )
    .then(() => undefined)
    .catch((error) => {
      allSpritesPromise = undefined;
      throw error;
    });
  return allSpritesPromise;
}

/** @param {import('../shared/avatar.js').AvatarConfiguration} avatar */
export function loadAvatarSprites(avatar) {
  return Promise.all(
    getAvatarSpriteReferences(avatar).map(({ partId, type, role, direction }) =>
      loadSpriteImage(partId, type, role, direction),
    ),
  ).then(() => undefined);
}

/** @param {import('../shared/avatar.js').AvatarConfiguration} avatar */
export function getAvatarSpritePaths(avatar) {
  return getAvatarSpriteReferences(avatar).map(
    ({ partId, type, role, direction }) =>
      getSpritePath(partId, type, role, direction),
  );
}

export function getAvatarSpriteImage(partId, type, role, direction) {
  // Drawing starts only after the selected sprites have loaded.
  return /** @type {HTMLImageElement} */ (
    spriteImages.get(getSpriteId(partId, type, role, direction))
  );
}

/** @param {import('../shared/avatar.js').AvatarConfiguration} avatar */
function getAvatarSpriteReferences(avatar) {
  const parts = /** @type {import('../shared/avatar.js').AvatarPartId[]} */ (
    Object.keys(AVATAR_SPRITE_PARTS)
  );
  return parts.flatMap((partId) =>
    getPartSpriteReferences(partId, avatar[partId].type),
  );
}

function loadPartSprites(partId, type) {
  return getPartSpriteReferences(partId, type).map(({ role, direction }) =>
    loadSpriteImage(partId, type, role, direction),
  );
}

function getPartSpriteReferences(partId, type) {
  const part = AVATAR_SPRITE_PARTS[partId];
  const sprite = part.styles[type];
  if (!sprite) return [];
  return Object.keys(sprite.layers).flatMap((role) =>
    getSpriteDirections(part).map((direction) => ({
      partId,
      type,
      role,
      direction,
    })),
  );
}

function loadSpriteImage(partId, type, role, direction) {
  const id = getSpriteId(partId, type, role, direction);
  const cachedImage = spriteImages.get(id);
  if (cachedImage) return Promise.resolve(cachedImage);
  const cachedPromise = spriteImagePromises.get(id);
  if (cachedPromise) return cachedPromise;

  const url = new URL(
    getSpritePath(partId, type, role, direction),
    window.location.origin,
  );
  const promise = loadImage(url)
    .then((image) => {
      spriteImages.set(id, image);
      return image;
    })
    .catch((error) => {
      spriteImagePromises.delete(id);
      throw error;
    });
  spriteImagePromises.set(id, promise);
  return promise;
}

function getSpritePath(partId, type, role, direction) {
  const directory = partId.replace(/([A-Z])/g, "-$1").toLowerCase();
  const side = direction < 0 ? "-left" : direction > 0 ? "-right" : "";
  return `/assets/avatar/${directory}/${type}-${role}${side}.png`;
}

function getSpriteId(partId, type, role, direction = 0) {
  return `${partId}/${type}/${role}/${direction}`;
}

function getSpriteDirections(part) {
  return part.splitHorizontally ? [-1, 1] : [0];
}

/**
 * @param {URL} url
 * @returns {Promise<HTMLImageElement>}
 */
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
