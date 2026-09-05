import { html, LitElement } from "lit";
import { AVATAR_SPRITE_SIZE } from "./avatar-sprite-data.js";
import { drawAvatar } from "./avatar-drawing.js";
import { loadPlayerAvatar } from "./avatar-loader.js";
import { loadAvatarSprites } from "./avatar-sprite-loader.js";
import { ICONS } from "./icons.js";

class Avatar extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      playerId: { type: String },
      revision: { type: String },
      label: { type: String },
      avatar: { type: Object },
    };
  }

  constructor() {
    super();
    this.playerId = undefined;
    this.revision = undefined;
    this.label = "Player avatar";
    this.avatar = undefined;
    this._renderedKey = undefined;
    this._loadGeneration = 0;
  }

  updated(changedProperties) {
    if (
      !changedProperties.has("playerId") &&
      !changedProperties.has("revision") &&
      !changedProperties.has("avatar")
    ) {
      return;
    }
    void this.loadAndDrawAvatar();
  }

  async loadAndDrawAvatar() {
    const request = beginAvatarLoad(this);
    if (!request) return;

    try {
      const avatar =
        request.avatar ??
        (await loadPlayerAvatar(request.playerId, request.revision));
      await loadAvatarSprites(avatar);
      if (!isCurrentLoad(this, request)) return;
      drawLoadedAvatar(this, avatar, request);
    } catch (error) {
      if (isCurrentLoad(this, request)) reportAvatarError(this, error);
    }
  }

  render() {
    if (!this.avatar && (!this.playerId || !this.revision)) {
      return html`<span class="avatar-empty" role="img" aria-label=${this.label}
        >${ICONS.signIn}</span
      >`;
    }

    return html`<canvas
      width=${AVATAR_SPRITE_SIZE}
      height=${AVATAR_SPRITE_SIZE}
      role="img"
      aria-label=${this.label}
    ></canvas>`;
  }
}

function beginAvatarLoad(avatar) {
  const generation = ++avatar._loadGeneration;
  if (avatar.avatar) {
    return { avatar: avatar.avatar, generation };
  }
  if (!avatar.playerId || !avatar.revision) return;
  const key = `${avatar.playerId}:${avatar.revision}`;
  if (key === avatar._renderedKey) return;
  return {
    playerId: avatar.playerId,
    revision: avatar.revision,
    generation,
    key,
  };
}

function isCurrentLoad(avatar, request) {
  return request.generation === avatar._loadGeneration;
}

function drawLoadedAvatar(avatarElement, avatar, request) {
  const canvas = avatarElement.querySelector("canvas");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("Avatar canvas not found");
  }
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Avatar canvas context unavailable");
  drawAvatar(context, avatar);
  delete canvas.dataset.error;
  canvas.dataset.rendered = "";
  if (request.revision) canvas.dataset.revision = request.revision;
  else delete canvas.dataset.revision;
  avatarElement._renderedKey = request.key;
}

function reportAvatarError(avatar, error) {
  const canvas = avatar.querySelector("canvas");
  if (canvas instanceof HTMLCanvasElement) {
    delete canvas.dataset.rendered;
    canvas.dataset.error =
      error instanceof Error ? error.message : "Unable to render avatar";
  }
  avatar.dispatchEvent(
    new CustomEvent("avatar-error", {
      detail: { error },
      bubbles: true,
    }),
  );
}

customElements.define("phg-avatar", Avatar);
