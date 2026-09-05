export const AVATAR_SCHEMA_VERSION = 1;

/**
 * @typedef {typeof DEFAULT_AVATAR} AvatarConfiguration
 * @typedef {keyof typeof AVATAR_TYPES} AvatarPartId
 */

export const SKIN_COLORS = [
  "#f2c9a5",
  "#dda578",
  "#c98255",
  "#a7613f",
  "#78452f",
  "#4b2d25",
];
export const EYE_COLORS = [
  "#573b2e",
  "#a27342",
  "#3e7058",
  "#39758c",
  "#777781",
];
export const HAIR_COLORS = [
  "#e3bc65",
  "#8d5a36",
  "#4a3028",
  "#211e25",
  "#77747b",
  "#b54835",
];
export const CLOTHES_COLORS = [
  "#314c88",
  "#39758c",
  "#3e7058",
  "#b54835",
  "#8d5a36",
  "#77747b",
];
export const BACKGROUND_COLORS = [
  "#cc6666",
  "#de935f",
  "#f0c674",
  "#b5bd68",
  "#8abeb7",
  "#81a2be",
  "#b294bb",
];

export const AVATAR_TYPES = {
  torso: ["torso"],
  clothes: ["shirt"],
  face: [
    "round",
    "oval",
    "diamond",
    "square",
    "pear",
    "wide",
    "angular",
    "triangle",
    "gaunt",
  ],
  eyes: [
    "beady",
    "lines",
    "happy",
    "squint",
    "hypnotic",
    "sleepy",
    "sparkle",
    "round",
    "lashes",
  ],
  eyebrows: ["none", "soft", "straight", "hairy", "thick", "slanted"],
  nose: ["none", "l", "c", "d", "v", "holes", "big", "u", "thick", "pig"],
  mouth: [
    "happy",
    "smile",
    "straight",
    "kiss",
    "kawai",
    "skull",
    "frontTooth",
    "teeth",
    "sad",
    "openMouth",
    "lips",
    "angry",
  ],
  ears: ["none", "small", "big", "pointy", "wide"],
  hair: [
    "none",
    "shortCurly",
    "old",
    "shortHigh",
    "shortClassic",
    "nerd",
    "long1",
    "long2",
    "medi",
    "buzz",
  ],
  facialHair: [
    "none",
    "pencil",
    "neckbeard",
    "sideburns",
    "beard",
    "beardCurly",
    "moustache",
    "dali",
    "goatee",
    "kungFu",
  ],
};

const PART_SCHEMAS = {
  background: { color: BACKGROUND_COLORS },
  torso: { type: AVATAR_TYPES.torso, position: [0], size: [0] },
  clothes: {
    type: AVATAR_TYPES.clothes,
    position: [0],
    size: [0],
    color: CLOTHES_COLORS,
  },
  face: {
    type: AVATAR_TYPES.face,
    position: adjustmentValues(),
    horizontalPosition: adjustmentValues(),
    size: adjustmentValues(),
    rotation: adjustmentValues(),
    color: SKIN_COLORS,
  },
  eyes: {
    type: AVATAR_TYPES.eyes,
    position: adjustmentValues(),
    spacing: adjustmentValues(),
    rotation: adjustmentValues(),
    size: adjustmentValues(),
    color: EYE_COLORS,
  },
  eyebrows: {
    type: AVATAR_TYPES.eyebrows,
    position: adjustmentValues(),
    spacing: adjustmentValues(),
    size: adjustmentValues(),
    color: HAIR_COLORS,
  },
  nose: {
    type: AVATAR_TYPES.nose,
    position: adjustmentValues(),
    horizontalPosition: adjustmentValues(),
    size: adjustmentValues(),
  },
  mouth: {
    type: AVATAR_TYPES.mouth,
    position: adjustmentValues(),
    horizontalPosition: adjustmentValues(),
    size: adjustmentValues(),
  },
  ears: {
    type: AVATAR_TYPES.ears,
    position: adjustmentValues(),
    spacing: adjustmentValues(),
    size: adjustmentValues(),
  },
  hair: {
    type: AVATAR_TYPES.hair,
    position: adjustmentValues(),
    size: adjustmentValues(),
    color: HAIR_COLORS,
  },
  facialHair: {
    type: AVATAR_TYPES.facialHair,
    position: adjustmentValues(),
    horizontalPosition: adjustmentValues(),
    size: adjustmentValues(),
    color: HAIR_COLORS,
  },
};

export const DEFAULT_AVATAR = {
  schemaVersion: AVATAR_SCHEMA_VERSION,
  background: { color: "#cc6666" },
  torso: { type: "torso", position: 0, size: 0 },
  clothes: { type: "shirt", position: 0, size: 0, color: "#314c88" },
  face: {
    type: "oval",
    position: 0,
    horizontalPosition: 0,
    size: 0,
    rotation: 0,
    color: "#c98255",
  },
  eyes: {
    type: "round",
    position: 0,
    spacing: 0,
    rotation: 0,
    size: 0,
    color: "#39758c",
  },
  eyebrows: {
    type: "soft",
    position: 0,
    spacing: 0,
    size: 0,
    color: "#4a3028",
  },
  nose: { type: "c", position: 0, horizontalPosition: 0, size: 0 },
  mouth: { type: "happy", position: 0, horizontalPosition: 0, size: 0 },
  ears: { type: "small", position: 0, spacing: 0, size: 0 },
  hair: { type: "shortClassic", position: 0, size: 0, color: "#4a3028" },
  facialHair: {
    type: "none",
    position: 0,
    horizontalPosition: 0,
    size: 0,
    color: "#4a3028",
  },
};

/**
 * Validates avatar input and returns a canonical object with stable key order.
 * Legacy configurations without schemaVersion are upgraded to the current schema.
 *
 * @param {unknown} input
 * @returns {AvatarConfiguration}
 */
export function canonicalizeAvatar(input) {
  assertRecord(input, "avatar");
  assertKeys(input, ["schemaVersion", ...Object.keys(PART_SCHEMAS)], "avatar", {
    optional: ["schemaVersion"],
  });
  if (
    input.schemaVersion !== undefined &&
    input.schemaVersion !== AVATAR_SCHEMA_VERSION
  ) {
    throw new TypeError("avatar.schemaVersion is unsupported");
  }

  /** @type {Record<string, any>} */
  const avatar = { schemaVersion: AVATAR_SCHEMA_VERSION };
  const schemas = /** @type {[string, Record<string, any[]>][]} */ (
    Object.entries(PART_SCHEMAS)
  );
  for (const [partId, schema] of schemas) {
    const part = input[partId];
    assertRecord(part, `avatar.${partId}`);
    assertKeys(part, Object.keys(schema), `avatar.${partId}`);
    avatar[partId] = {};
    for (const [property, allowed] of Object.entries(schema)) {
      const rawValue = part[property];
      const value = property === "color" ? normalizeColor(rawValue) : rawValue;
      if (!allowed.includes(value)) {
        throw new TypeError(`avatar.${partId}.${property} is invalid`);
      }
      avatar[partId][property] = value;
    }
  }
  return /** @type {AvatarConfiguration} */ (avatar);
}

function adjustmentValues() {
  return [-2, -1, 0, 1, 2];
}

function normalizeColor(value) {
  return typeof value === "string" ? value.toLowerCase() : value;
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {asserts value is Record<string, any>}
 */
function assertRecord(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
}

function assertKeys(value, allowed, path, options = {}) {
  const optional = new Set(options.optional ?? []);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key))
      throw new TypeError(`${path}.${key} is unknown`);
  }
  for (const key of allowed) {
    if (!optional.has(key) && !(key in value)) {
      throw new TypeError(`${path}.${key} is required`);
    }
  }
}
