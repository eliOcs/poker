import { html } from "lit";

const SETTINGS_VOLUME_LABELS = ["Off", "25%", "75%", "100%"];
const SETTINGS_VOLUME_STEPS = [0, 0.25, 0.75, 1];

/**
 * @param {any} app
 */
export function renderProfileSettingsModal(app) {
  if (!app._showProfileSettings) return "";

  return html`<phg-modal
    .title=${"Settings"}
    @close=${app.closeProfileSettings}
  >
    <div class="settings-content">
      <label>Name</label>
      <input
        id="profile-settings-name-input"
        type="text"
        placeholder="Enter your name"
        maxlength="20"
        autofocus
        .value=${app.user?.name || ""}
        @keydown=${(e) => e.key === "Enter" && app.saveProfileSettings()}
      />
      <label>Sound Volume</label>
      <div class="volume-slider">
        ${SETTINGS_VOLUME_STEPS.map(
          (value, index) => html`
            <button
              class=${app._settingsVolume === value ? "active" : ""}
              @click=${() => {
                app._settingsVolume = value;
              }}
            >
              ${SETTINGS_VOLUME_LABELS[index]}
            </button>
          `,
        )}
      </div>
      <div class="buttons">
        <phg-button variant="secondary" @click=${app.closeProfileSettings}
          >Cancel</phg-button
        >
        <phg-button variant="action" @click=${app.saveProfileSettings}
          >Save</phg-button
        >
      </div>
    </div>
  </phg-modal>`;
}
