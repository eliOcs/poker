import { html } from "lit";

const SETTINGS_VOLUME_LABELS = ["Off", "25%", "75%", "100%"];
const SETTINGS_VOLUME_STEPS = [0, 0.25, 0.75, 1];
const SETTINGS_TURN_VIBRATION_OPTIONS = [
  { label: "Off", value: false },
  { label: "On", value: true },
];

/**
 * @param {any} app
 */
export function renderProfileSettingsModal(app) {
  if (!app._showProfileSettings) return "";

  return html`<phg-modal
    .title=${"Settings"}
    @close=${app.closeProfileSettings}
  >
    <form
      class="settings-content"
      @submit=${(event) => {
        event.preventDefault();
        app.saveProfileSettings(event.currentTarget);
      }}
    >
      <label for="profile-settings-name-input">Name</label>
      <input
        id="profile-settings-name-input"
        name="name"
        type="text"
        placeholder="Enter your name"
        maxlength="20"
        autofocus
        .value=${app.user?.name ?? ""}
      />
      <fieldset>
        <legend>Sound Volume</legend>
        <div class="volume-slider">
          ${SETTINGS_VOLUME_STEPS.map(
            (value, index) => html`
              <label class=${app._settingsVolume === value ? "active" : ""}>
                <input
                  type="radio"
                  name="volume"
                  value=${value}
                  .checked=${app._settingsVolume === value}
                  @change=${() => {
                    app._settingsVolume = value;
                  }}
                />
                ${SETTINGS_VOLUME_LABELS[index]}
              </label>
            `,
          )}
        </div>
      </fieldset>
      <fieldset>
        <legend>Vibration</legend>
        <div class="volume-slider">
          ${SETTINGS_TURN_VIBRATION_OPTIONS.map(
            ({ label, value }) => html`
              <label class=${app._settingsVibration === value ? "active" : ""}>
                <input
                  type="radio"
                  name="vibration"
                  value=${String(value)}
                  .checked=${app._settingsVibration === value}
                  @change=${() => {
                    app._settingsVibration = value;
                  }}
                />
                ${label}
              </label>
            `,
          )}
        </div>
      </fieldset>
      <div class="buttons">
        <button
          type="button"
          class="button button--muted"
          @click=${app.closeProfileSettings}
        >
          Cancel
        </button>
        <button type="submit" class="button button--action">Save</button>
      </div>
    </form>
  </phg-modal>`;
}
