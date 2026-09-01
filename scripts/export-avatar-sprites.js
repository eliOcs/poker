import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  AVATAR_SPRITE_PARTS,
  AVATAR_SPRITE_SIZE,
} from "../src/frontend/avatar-sprite-data.js";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const source = process.argv[2] ?? `${projectRoot}poker-avatars.xcf`;
const outputRoot = `${projectRoot}src/frontend/assets/avatar`;
const exporter = `${projectRoot}scripts/export-avatar-sprites-gimp.py`;
const exports = [];

for (const [partId, part] of Object.entries(AVATAR_SPRITE_PARTS)) {
  const outputDirectory = `${outputRoot}/${toKebabCase(partId)}`;
  mkdirSync(outputDirectory, { recursive: true });

  for (const [type, sprite] of Object.entries(part.styles)) {
    if (!sprite) continue;
    for (const [role, layer] of Object.entries(sprite.layers)) {
      exports.push({
        category: part.category,
        style: sprite.source,
        direct: sprite.direct ?? false,
        splitHorizontally: part.splitHorizontally ?? false,
        layer: layer ?? null,
        output: `${outputDirectory}/${type}-${role}.png`,
      });
    }
  }
}

const batch = `exec(compile(open(${JSON.stringify(exporter)}).read(), ${JSON.stringify(exporter)}, "exec"))`;
execFileSync(
  "gimp",
  [
    "--no-interface",
    "--batch-interpreter=python-fu-eval",
    "--batch",
    batch,
    "--quit",
  ],
  {
    env: {
      ...process.env,
      POKER_AVATAR_EXPORT_SOURCE: source,
      POKER_AVATAR_EXPORT_SIZE: String(AVATAR_SPRITE_SIZE),
      POKER_AVATAR_EXPORT_TASKS: JSON.stringify(exports),
    },
    maxBuffer: 10 * 1024 * 1024,
    stdio: "pipe",
  },
);

for (const task of exports.filter(
  ({ splitHorizontally }) => splitHorizontally,
)) {
  const halfSize = AVATAR_SPRITE_SIZE / 2;
  for (const [side, offset, gravity] of [
    ["left", 0, "West"],
    ["right", halfSize, "East"],
  ]) {
    const output = task.output.replace(/\.png$/, `-${side}.png`);
    execFileSync("magick", [
      task.output,
      "-crop",
      `${halfSize}x${AVATAR_SPRITE_SIZE}+${offset}+0`,
      "+repage",
      "-background",
      "none",
      "-gravity",
      gravity,
      "-extent",
      `${AVATAR_SPRITE_SIZE}x${AVATAR_SPRITE_SIZE}`,
      output,
    ]);
  }
}

for (const task of exports) {
  const outputs = task.splitHorizontally
    ? ["left", "right"].map((side) =>
        task.output.replace(/\.png$/, `-${side}.png`),
      )
    : [task.output];
  for (const output of outputs) {
    const png = readFileSync(output);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    if (width !== AVATAR_SPRITE_SIZE || height !== AVATAR_SPRITE_SIZE) {
      throw new Error(`Invalid sprite canvas ${width}x${height}: ${output}`);
    }
  }
}

function toKebabCase(value) {
  return value.replace(/([A-Z])/g, "-$1").toLowerCase();
}
