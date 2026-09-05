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

export function renderAvatarMakerLoading(maker) {
  return html`<main class="main">
    <div class="content">
      ${maker.assetsError
        ? html`<p role="alert">Unable to load avatar styles.</p>
            <button
              class="button button--action"
              type="button"
              @click=${() => {
                maker.assetsReady = maker.loadAssets();
              }}
            >
              Retry
            </button>`
        : html`<p role="status">Loading avatar styles…</p>`}
      <button
        class="button button--muted"
        type="button"
        @click=${() => {
          dispatchAvatarAction(maker, "avatar-cancel");
        }}
      >
        Cancel
      </button>
    </div>
  </main>`;
}

/** @param {unknown} [detail] */
function dispatchAvatarAction(maker, type, detail = undefined) {
  maker.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}
