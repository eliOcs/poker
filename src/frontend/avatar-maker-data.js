const SKIN_COLORS = [
  "#f2c9a5",
  "#dda578",
  "#c98255",
  "#a7613f",
  "#78452f",
  "#4b2d25",
];
const EYE_COLORS = ["#573b2e", "#a27342", "#3e7058", "#39758c", "#777781"];
const HAIR_COLORS = [
  "#e3bc65",
  "#8d5a36",
  "#4a3028",
  "#211e25",
  "#77747b",
  "#b54835",
];
const CLOTHES_COLORS = [
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

export const DEFAULT_AVATAR = {
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

export function getAvatarColors(partId) {
  if (partId === "face") return SKIN_COLORS;
  if (partId === "eyes") return EYE_COLORS;
  if (["eyebrows", "hair", "facialHair"].includes(partId)) return HAIR_COLORS;
  if (partId === "clothes") return CLOTHES_COLORS;
  return undefined;
}
