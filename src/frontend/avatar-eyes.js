import {
  avatarEyeSpritesReady,
  drawSparkleSpriteEye,
  EYE_DARK,
  EYE_WHITE,
} from "./avatar-eye-sprites.js";

const DARK = EYE_DARK;
const OUTLINE = "#302336";
const WHITE = EYE_WHITE;
const EYE_SPACING_STEP = 11;

export const COLORABLE_EYE_TYPES = [
  "round",
  "relaxed",
  "lashes",
  "almond",
  "sparkle",
  "hypnotic",
  "sleepy",
];

export { avatarEyeSpritesReady };

const EYE_DRAWERS = {
  beady: drawBeadyEye,
  lines: drawLineEye,
  round: drawRoundEye,
  happy: drawHappyEye,
  relaxed: drawRelaxedEye,
  lashes: drawLashesEye,
  almond: drawAlmondEye,
  sparkle: drawSparkleEye,
  hypnotic: drawHypnoticEye,
  sleepy: drawSleepyEye,
  flat: drawFlatEye,
  squint: drawSquintEye,
};

/**
 * @param {CanvasRenderingContext2D} context
 * @param {any} eyes
 */
export function drawEyes(context, eyes) {
  const spacing = 46 + eyes.spacing * EYE_SPACING_STEP;
  const y = -28 + eyes.position * 8;
  const rotation = ((eyes.rotation ?? 0) * Math.PI) / 36;
  const scale = 1 + eyes.size * 0.12;
  const drawEye = EYE_DRAWERS[eyes.type];
  if (!drawEye) throw new Error(`Unknown eye type: ${eyes.type}`);

  for (const direction of [-1, 1]) {
    context.save();
    context.translate(direction * spacing, y);
    context.rotate(direction * rotation);
    context.scale(scale, scale);
    drawEye(context, direction, eyes.color, eyes.skinColor ?? "#c98255");
    context.restore();
  }
}

/**
 * @param {CanvasRenderingContext2D} context
 */
function drawBeadyEye(context) {
  context.fillStyle = DARK;
  context.beginPath();
  context.arc(0, 0, 11, 0, Math.PI * 2);
  context.fill();
}

/**
 * @param {CanvasRenderingContext2D} context
 */
function drawLineEye(context) {
  context.fillStyle = DARK;
  context.beginPath();
  context.roundRect(-7, -21, 14, 42, 6);
  context.fill();
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} _direction
 * @param {string} color
 */
function drawRoundEye(context, _direction, color) {
  drawEllipse(context, 22, 29);
  drawIris(context, 0, 5, 13, color);
}

/**
 * @param {CanvasRenderingContext2D} context
 */
function drawHappyEye(context) {
  setDarkStroke(context, 9);
  context.beginPath();
  context.moveTo(-22, 10);
  context.lineTo(0, -14);
  context.lineTo(22, 10);
  context.stroke();
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} _direction
 * @param {string} color
 */
function drawRelaxedEye(context, _direction, color) {
  drawAlmondWhite(context, 24, 15);
  drawIris(context, 0, 5, 11, color);
  setDarkStroke(context, 7);
  context.beginPath();
  context.moveTo(-25, 0);
  context.quadraticCurveTo(0, -20, 25, 0);
  context.stroke();
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} direction
 * @param {string} color
 */
function drawLashesEye(context, direction, color) {
  drawIris(context, 0, 6, 13, color);

  setDarkStroke(context, 6);
  context.beginPath();
  context.moveTo(-22, 1);
  context.quadraticCurveTo(0, -17, 22, 1);
  context.stroke();
  drawLashes(context, direction);
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} _direction
 * @param {string} color
 */
function drawAlmondEye(context, _direction, color) {
  drawAlmondWhite(context, 25, 19);
  drawIris(context, 0, 1, 11, color);
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} direction
 * @param {string} color
 */
function drawSparkleEye(context, direction, color) {
  if (drawSparkleSpriteEye(context, direction, color)) return;

  context.save();
  context.rotate(direction * -0.12);
  drawEllipse(context, 25, 24);
  drawIris(context, -direction * 3, 3, 17, color);
  context.fillStyle = WHITE;
  context.beginPath();
  context.arc(direction * 5, -4, 6, 0, Math.PI * 2);
  context.arc(-direction * 7, 7, 4, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} _direction
 * @param {string} color
 */
function drawHypnoticEye(context, _direction, color) {
  drawEllipse(context, 23, 24);
  context.strokeStyle = DARK;
  context.lineWidth = 4;
  for (let index = 0; index < 8; index += 1) {
    const angle = (index * Math.PI) / 4;
    context.beginPath();
    context.moveTo(Math.cos(angle) * 8, Math.sin(angle) * 8);
    context.lineTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
    context.stroke();
  }
  drawIris(context, 0, 0, 7, color);
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} direction
 * @param {string} color
 * @param {string} skinColor
 */
function drawSleepyEye(context, direction, color, skinColor) {
  const leftLidY = -direction * 4;
  const rightLidY = direction * 4;
  context.save();
  context.beginPath();
  context.ellipse(0, 0, 24, 27, 0, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = WHITE;
  context.fillRect(-24, -27, 48, 54);
  context.fillStyle = skinColor;
  context.beginPath();
  context.moveTo(-25, -28);
  context.lineTo(25, -28);
  context.lineTo(25, rightLidY);
  context.lineTo(-25, leftLidY);
  context.closePath();
  context.fill();
  drawIris(context, -direction * 4, 18, 15, color);
  context.restore();

  context.strokeStyle = OUTLINE;
  context.lineWidth = 6;
  context.beginPath();
  context.ellipse(0, 0, 24, 27, 0, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(-23, leftLidY);
  context.lineTo(23, rightLidY);
  context.stroke();
}

/**
 * @param {CanvasRenderingContext2D} context
 */
function drawFlatEye(context) {
  setDarkStroke(context, 9);
  context.beginPath();
  context.moveTo(-21, 0);
  context.lineTo(21, 0);
  context.stroke();
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} direction
 */
function drawSquintEye(context, direction) {
  setDarkStroke(context, 9);
  context.beginPath();
  context.moveTo(direction * 20, -13);
  context.lineTo(direction * -8, 0);
  context.lineTo(direction * 20, 13);
  context.stroke();
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} width
 * @param {number} height
 */
function drawEllipse(context, width, height) {
  context.fillStyle = WHITE;
  context.strokeStyle = OUTLINE;
  context.lineWidth = 6;
  context.beginPath();
  context.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} width
 * @param {number} height
 */
function drawAlmondWhite(context, width, height) {
  context.fillStyle = WHITE;
  context.strokeStyle = OUTLINE;
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(-width, 0);
  context.quadraticCurveTo(0, -height, width, 0);
  context.quadraticCurveTo(0, height, -width, 0);
  context.fill();
  context.stroke();
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @param {string} color
 */
function drawIris(context, x, y, radius, color) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = DARK;
  context.beginPath();
  context.arc(x, y, Math.max(4, radius * 0.48), 0, Math.PI * 2);
  context.fill();
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} direction
 */
function drawLashes(context, direction) {
  for (let index = -1; index <= 1; index += 1) {
    const x = direction * 13 + index * 7;
    context.beginPath();
    context.moveTo(x, -8);
    context.lineTo(x + direction * 4, -18 - Math.abs(index) * 2);
    context.stroke();
  }
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} width
 */
function setDarkStroke(context, width) {
  context.strokeStyle = DARK;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
}
