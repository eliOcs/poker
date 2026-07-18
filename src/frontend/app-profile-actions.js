export const appProfileActions = {
  openProfileSettings() {
    this._settingsVolume = this.user.settings.volume;
    this._settingsVibration = this.user.settings.vibration;
    this._showProfileSettings = true;
  },

  closeProfileSettings() {
    this._showProfileSettings = false;
  },

  async saveProfileSettings(form) {
    const formData = new FormData(form);
    const nameValue = formData.get("name");
    const volumeValue = formData.get("volume");
    const vibrationValue = formData.get("vibration");
    const name = typeof nameValue === "string" ? nameValue.trim() : "";
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
      },
    });
    this._showProfileSettings = false;
    this.toast = { message: "Settings saved", variant: "success" };
  },
};
