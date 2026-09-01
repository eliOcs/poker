export function drawOvalFacePartPreview({
  context,
  sourceContext,
  sourceCanvas,
  avatar,
  partId,
  drawPart,
}) {
  if (partId === "ears") {
    drawPart(sourceContext, avatar, "face");
    drawPart(sourceContext, avatar, "ears", -1);
    drawEarSpritePreview(context, sourceCanvas);
    return;
  }

  drawPart(sourceContext, avatar, partId);
  const partBounds = getAlphaBounds(sourceContext);
  if (!partBounds) {
    throw new Error(`Avatar preview part has no visible pixels: ${partId}`);
  }
  sourceContext.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  drawPart(sourceContext, avatar, "face");
  drawPart(sourceContext, avatar, partId);
  drawBoundedSpritePreview(context, sourceCanvas, partBounds);
}

export function getAlphaBounds(
  context,
  minSearchX = 0,
  maxSearchX = context.canvas.width,
) {
  const { data, width, height } = context.getImageData(
    0,
    0,
    context.canvas.width,
    context.canvas.height,
  );
  let minX = maxSearchX;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = minSearchX; x < maxSearchX; x += 1) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return undefined;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function drawEarSpritePreview(context, sourceCanvas) {
  context.imageSmoothingEnabled = false;
  context.drawImage(
    sourceCanvas,
    0,
    24,
    72,
    48,
    24,
    0,
    context.canvas.width,
    context.canvas.height,
  );
}

function drawBoundedSpritePreview(context, sourceCanvas, bounds) {
  const crop = getPartCrop(sourceCanvas, bounds);
  const scale = Math.min(
    context.canvas.width / crop.width,
    context.canvas.height / crop.height,
  );
  const outputWidth = Math.round(crop.width * scale);
  const outputHeight = Math.round(crop.height * scale);
  context.imageSmoothingEnabled = false;
  context.drawImage(
    sourceCanvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    Math.round((context.canvas.width - outputWidth) / 2),
    Math.round((context.canvas.height - outputHeight) / 2),
    outputWidth,
    outputHeight,
  );
}

function getPartCrop(sourceCanvas, bounds) {
  const margin = 4;
  const x = Math.max(0, bounds.x - margin);
  const y = Math.max(0, bounds.y - margin);
  const right = Math.min(sourceCanvas.width, bounds.x + bounds.width + margin);
  const bottom = Math.min(
    sourceCanvas.height,
    bounds.y + bounds.height + margin,
  );
  const width = right - x;
  const height = bottom - y;
  const ratioUnit = Math.ceil(Math.max(width / 3, height / 2));
  const cropWidth = ratioUnit * 3;
  const cropHeight = ratioUnit * 2;
  if (cropWidth > sourceCanvas.width || cropHeight > sourceCanvas.height) {
    return { x, y, width, height };
  }
  return {
    x: clamp(
      Math.round(x + width / 2 - cropWidth / 2),
      0,
      sourceCanvas.width - cropWidth,
    ),
    y: clamp(
      Math.round(y + height / 2 - cropHeight / 2),
      0,
      sourceCanvas.height - cropHeight,
    ),
    width: cropWidth,
    height: cropHeight,
  };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
