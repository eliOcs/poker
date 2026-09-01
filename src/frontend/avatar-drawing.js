import { AVATAR_SPRITE_SIZE } from "./avatar-sprite-data.js";
import { drawSpriteAvatar, drawSpritePartPreview } from "./avatar-sprites.js";
import { drawPixelated } from "./canvas-pixel-renderer.js";

const ARTBOARD_SIZE = 480;
const PIXEL_ART_SIZE = AVATAR_SPRITE_SIZE;

/**
 * Draw an avatar from plain configuration data.
 *
 * @param {CanvasRenderingContext2D} context
 * @param {any} avatar
 */
export function drawAvatar(context, avatar) {
  drawPixelated(context, PIXEL_ART_SIZE, (pixelContext) => {
    drawAvatarArtwork(pixelContext, avatar);
  });
}

function drawAvatarArtwork(context, avatar) {
  if (!avatar.background?.color) {
    throw new Error("Missing avatar background color");
  }
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.save();
  context.scale(
    context.canvas.width / ARTBOARD_SIZE,
    context.canvas.height / ARTBOARD_SIZE,
  );
  drawBackdrop(context, avatar.background.color);
  context.restore();
  drawSpriteAvatar(context, avatar);
}

/**
 * Draw one avatar feature for a style-selection thumbnail.
 *
 * @param {CanvasRenderingContext2D} context
 * @param {any} avatar
 * @param {string} partId
 * @param {string} type
 */
export function drawAvatarPartPreview(context, avatar, partId, type) {
  drawSpritePartPreview(context, avatar, partId, type);
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {string} color
 */
function drawBackdrop(context, color) {
  context.fillStyle = color;
  context.fillRect(0, 0, ARTBOARD_SIZE, ARTBOARD_SIZE);
}
