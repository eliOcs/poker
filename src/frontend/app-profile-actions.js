export const appProfileActions = {
  openProfileSettings() {
    this._settingsVolume = this.user.settings.volume;
    this._settingsVibration = this.user.settings.vibration;
    this._showProfileSettings = true;
  },

  closeProfileSettings() {
    this._showProfileSettings = false;
  },

  async saveProfileSettings() {
    const input = /** @type {HTMLInputElement|null} */ (
      this.shadowRoot?.querySelector("#profile-settings-name-input")
    );
    const name = input?.value.trim() || "";
    await this._updateUser({
      name,
      settings: {
        volume: this._settingsVolume,
        vibration: this._settingsVibration,
      },
    });
    this._showProfileSettings = false;
    this.toast = { message: "Settings saved", variant: "success" };
  },
};
