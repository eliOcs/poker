const buffer = document.createElement("canvas");

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} sourceSize
 * @param {(context: CanvasRenderingContext2D) => void} draw
 */
export function drawPixelated(context, sourceSize, draw) {
  buffer.width = sourceSize;
  buffer.height = sourceSize;
  const bufferContext = buffer.getContext("2d");
  if (!bufferContext) {
    throw new Error("Could not create the pixel-art canvas context");
  }

  draw(bufferContext);

  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(buffer, 0, 0, context.canvas.width, context.canvas.height);
  context.restore();
}
