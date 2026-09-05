export const appProfileActions = {
  openProfileSettings() {
    this._settingsName = this.user.name ?? "";
    this._settingsVolume = this.user.settings.volume;
    this._settingsVibration = this.user.settings.vibration;
    this._settingsAvatar = this.user.settings.avatar;
    this._showProfileSettings = true;
  },

  closeProfileSettings() {
    this._showProfileSettings = false;
  },

  openAvatarMakerFromSettings() {
    this._reopenProfileSettingsAfterAvatar = true;
    this.closeProfileSettings();
  },

  async saveProfileSettings(form) {
    const formData = new FormData(form);
    const volumeValue = formData.get("volume");
    const vibrationValue = formData.get("vibration");
    const name = this._settingsName.trim();
    await this._updateUser({
      name,
      settings: {
        volume:
          typeof volumeValue === "string"
            ? Number(volumeValue)
            : this._settingsVolume,
        vibration:
          typeof vibrationValue === "string"
            ? vibrationValue === "true"
            : this._settingsVibration,
        // JSON requires null to explicitly request avatar removal.
        // eslint-disable-next-line no-restricted-syntax
        avatar: this._settingsAvatar ?? null,
      },
    });
    this._showProfileSettings = false;
    this.toast = { message: "Settings saved", variant: "success" };
  },

  closeAvatarMaker() {
    window.history.back();
  },

  applyAvatarDraft(avatar) {
    this._settingsAvatar = avatar;
    window.history.back();
  },
};
