import { AVATAR_SPRITE_SIZE } from "./avatar-sprite-data.js";
import { drawSpriteAvatar, drawSpritePartPreview } from "./avatar-sprites.js";
import { drawPixelated } from "./canvas-pixel-renderer.js";

const PIXEL_ART_SIZE = AVATAR_SPRITE_SIZE;

/**
 * Draw an avatar from plain configuration data.
 *
 * @param {CanvasRenderingContext2D} context
 * @param {import('../shared/avatar.js').AvatarConfiguration} avatar
 */
export function drawAvatar(context, avatar) {
  drawPixelated(context, PIXEL_ART_SIZE, (pixelContext) => {
    pixelContext.fillStyle = avatar.background.color;
    pixelContext.fillRect(0, 0, PIXEL_ART_SIZE, PIXEL_ART_SIZE);
    drawSpriteAvatar(pixelContext, avatar);
  });
}

/**
 * Draw one avatar feature for a style-selection thumbnail.
 *
 * @param {CanvasRenderingContext2D} context
 * @param {import('../shared/avatar.js').AvatarConfiguration} avatar
 * @param {import('../shared/avatar.js').AvatarPartId} partId
 * @param {string} type
 */
export function drawAvatarPartPreview(context, avatar, partId, type) {
  drawSpritePartPreview(context, avatar, partId, type);
}
