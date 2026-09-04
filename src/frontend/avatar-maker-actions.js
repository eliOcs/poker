import { html } from "lit";

/**
 * @param {{ saving: boolean, avatar: object, reset: () => void, randomize: () => void }} maker
 */
export function renderAvatarMakerActions(maker) {
  return html`
    <div class="avatar-maker__page-actions">
      <button
        class="button button--muted"
        type="button"
        ?disabled=${maker.saving}
        @click=${() => {
          maker.reset();
        }}
      >
        Reset
      </button>
      <button
        class="button button--secondary"
        type="button"
        ?disabled=${maker.saving}
        @click=${() => {
          maker.randomize();
        }}
      >
        Randomize
      </button>
      <button
        class="button button--muted"
        type="button"
        ?disabled=${maker.saving}
        @click=${() => {
          dispatchAvatarAction(maker, "avatar-cancel");
        }}
      >
        Cancel
      </button>
      <button
        class="button button--action"
        type="button"
        ?disabled=${maker.saving}
        @click=${() => {
          dispatchAvatarAction(maker, "avatar-save", {
            avatar: structuredClone(maker.avatar),
          });
        }}
      >
        ${maker.saving ? "Saving…" : "Save"}
      </button>
    </div>
  `;
}

function dispatchAvatarAction(maker, type, detail) {
  maker.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}
