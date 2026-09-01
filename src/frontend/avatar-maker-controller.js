import { avatarSpritesReady } from "./avatar-sprites.js";
import { AVATAR_SPRITE_SIZE } from "./avatar-sprite-data.js";

const MOBILE_AVATAR_QUERY = "(width < 700px)";
const DESKTOP_AVATAR_CANVAS_SIZE = AVATAR_SPRITE_SIZE * 3;
const MOBILE_AVATAR_CANVAS_SIZE = AVATAR_SPRITE_SIZE * 2;

/** @param {import("lit").ReactiveControllerHost & {canvasSize: number}} host */
export function configureAvatarMaker(host) {
  const viewport = window.matchMedia(MOBILE_AVATAR_QUERY);
  const updateCanvasSize = () => {
    host.canvasSize = viewport.matches
      ? MOBILE_AVATAR_CANVAS_SIZE
      : DESKTOP_AVATAR_CANVAS_SIZE;
  };

  updateCanvasSize();
  host.addController({
    hostConnected() {
      viewport.addEventListener("change", updateCanvasSize);
    },
    hostDisconnected() {
      viewport.removeEventListener("change", updateCanvasSize);
    },
  });
  return avatarSpritesReady.then(() => {
    host.requestUpdate();
  });
}
