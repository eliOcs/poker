import { closeAppModal, openAppModal } from "./app-navigation.js";

export const appSignInActions = {
  openProfileSignIn(options = {}) {
    openAppModal(this, "sign-in", options);
  },

  closeProfileSignIn() {
    closeAppModal(this);
  },

  openProfileSignUp(options = {}) {
    openAppModal(this, "sign-up", options);
  },

  closeProfileSignUp() {
    closeAppModal(this);
  },
};
