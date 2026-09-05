import { html } from "lit";

/**
 * @param {{ avatar: object, randomize: () => void }} maker
 */
export function renderAvatarMakerActions(maker) {
  return html`
    <div class="avatar-maker__page-actions">
      <button
        class="button button--secondary avatar-maker__randomize"
        type="button"
        @click=${() => {
          maker.randomize();
        }}
      >
        Randomize
      </button>
      <div class="avatar-maker__confirmation-actions">
        <button
          class="button button--muted"
          type="button"
          @click=${() => {
            dispatchAvatarAction(maker, "avatar-cancel");
          }}
        >
          Cancel
        </button>
        <button
          class="button button--action"
          type="button"
          @click=${() => {
            dispatchAvatarAction(maker, "avatar-done", {
              avatar: structuredClone(maker.avatar),
            });
          }}
        >
          Done
        </button>
      </div>
    </div>
  `;
}

function dispatchAvatarAction(maker, type, detail) {
  maker.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}
