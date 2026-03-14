function dispatchToast(host, detail) {
  host.dispatchEvent(
    new CustomEvent("toast", {
      detail,
      bubbles: true,
      composed: true,
    }),
  );
}

export const gameModalActions = {
  openAccount() {
    if (!this.user?.id) return;
    this.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { path: `/players/${this.user.id}` },
        bubbles: true,
        composed: true,
      }),
    );
  },

  openSettings() {
    this.showSettings = true;
  },

  closeSettings() {
    this.showSettings = false;
  },

  openSignIn() {
    this._signInInvalid = false;
    this.showSignIn = true;
  },

  closeSignIn() {
    this._signInInvalid = false;
    this.showSignIn = false;
  },

  clearSignInValidation() {
    this._signInInvalid = false;
  },

  openRanking() {
    if (!this.hasRecordedHands()) return;
    this.showRanking = true;
  },

  closeRanking() {
    this.showRanking = false;
  },

  saveSettings() {
    const input = /** @type {HTMLInputElement|null} */ (
      this.shadowRoot?.querySelector("#name-input")
    );
    const name = input?.value.trim() || "";
    this.dispatchEvent(
      new CustomEvent("update-user", {
        detail: { name },
        bubbles: true,
        composed: true,
      }),
    );
    dispatchToast(this, { message: "Settings saved", variant: "success" });
    this.showSettings = false;
  },

  requestSignIn() {
    const input = /** @type {HTMLInputElement|null} */ (
      this.shadowRoot?.querySelector("#sign-in-email")
    );
    const email = input?.value.trim() || "";
    if (!email || !input?.checkValidity()) {
      this._signInInvalid = true;
      input?.focus();
      return;
    }
    this._signInInvalid = false;
    this.dispatchEvent(
      new CustomEvent("request-sign-in", {
        detail: { email },
        bubbles: true,
        composed: true,
      }),
    );
    this.showSignIn = false;
  },
};
