import {
  BACKGROUND_COLORS,
  CLOTHES_COLORS,
  DEFAULT_AVATAR,
  EYE_COLORS,
  HAIR_COLORS,
  SKIN_COLORS,
} from "../shared/avatar.js";

export { BACKGROUND_COLORS, DEFAULT_AVATAR };

export function getAvatarColors(partId) {
  if (partId === "face") return SKIN_COLORS;
  if (partId === "eyes") return EYE_COLORS;
  if (["eyebrows", "hair", "facialHair"].includes(partId)) return HAIR_COLORS;
  if (partId === "clothes") return CLOTHES_COLORS;
  return undefined;
}
