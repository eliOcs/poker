import { closeAppModal, openAppModal } from "./app-navigation.js";

/** @param {any} app */
export function syncProfileDraft(app) {
  const editing = app._modal === "settings" || app.path === "/avatar";
  if (!editing) {
    app._settingsDraftActive = false;
    return;
  }
  if (!app.user || app._settingsDraftActive) return;
  app._settingsName = app.user.name ?? "";
  app._settingsVolume = app.user.settings.volume;
  app._settingsVibration = app.user.settings.vibration;
  app._settingsAvatar = app.user.settings.avatar;
  app._settingsDraftActive = true;
}

export const appProfileActions = {
  openProfileSettings() {
    openAppModal(this, "settings");
  },

  closeProfileSettings() {
    closeAppModal(this);
  },

  async saveProfileSettings(form) {
    const formData = new FormData(form);
    const volumeValue = formData.get("volume");
    const vibrationValue = formData.get("vibration");
    const name = this._settingsName.trim();
    const saved = await this._updateUser({
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
    if (!saved) {
      this.toast = { message: "Unable to save settings", variant: "error" };
      return;
    }
    this.closeProfileSettings();
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
