function dispatchToast(host, detail) {
  host.dispatchEvent(
    new CustomEvent("toast", {
      detail,
      bubbles: true,
      composed: true,
    }),
  );
}

function readInput(root, selector) {
  return /** @type {HTMLInputElement|undefined} */ (
    root?.querySelector(selector)
  );
}

function validateRequiredInput(input) {
  if (input?.value.trim()) return true;
  input?.focus();
  return false;
}

function validateEmailInput(input) {
  if (input?.value.trim() && input.checkValidity()) return true;
  input?.focus();
  return false;
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
    this._syncSettingsFromUser();
    this.showSettings = true;
  },

  closeSettings() {
    this._syncSettingsFromUser();
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

  switchToSignUp() {
    this.closeSignIn();
    this.openSignUp();
  },

  clearSignInValidation() {
    this._signInInvalid = false;
  },

  openSignUp() {
    this._signUpEmailInvalid = false;
    this._signUpNameInvalid = false;
    this.showSignUp = true;
  },

  closeSignUp() {
    this._signUpEmailInvalid = false;
    this._signUpNameInvalid = false;
    this.showSignUp = false;
  },

  switchToSignIn() {
    this.closeSignUp();
    this.openSignIn();
  },

  clearSignUpValidation() {
    this._signUpEmailInvalid = false;
    this._signUpNameInvalid = false;
  },

  openRanking() {
    if (!this.hasRecordedHands()) return;
    this.showRanking = true;
  },

  closeRanking() {
    this.showRanking = false;
  },

  openTournamentLevels() {
    if (!this.game?.tournament) return;
    this.showTournamentLevels = true;
  },

  closeTournamentLevels() {
    this.showTournamentLevels = false;
  },

  saveSettings() {
    const input = /** @type {HTMLInputElement|undefined} */ (
      this.querySelector("#name-input")
    );
    const name = input?.value.trim() ?? "";
    this.dispatchEvent(
      new CustomEvent("update-user", {
        detail: {
          name,
          settings: {
            volume: this.volume,
            vibration: this.vibration,
          },
        },
        bubbles: true,
        composed: true,
      }),
    );
    dispatchToast(this, { message: "Settings saved", variant: "success" });
    this.showSettings = false;
  },

  requestSignIn() {
    const input = readInput(this, "#sign-in-email");
    const email = input?.value.trim() ?? "";
    if (!validateEmailInput(input)) {
      this._signInInvalid = true;
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

  requestSignUp() {
    const nameInput = readInput(this, "#sign-up-name");
    const emailInput = readInput(this, "#sign-up-email");
    const name = nameInput?.value.trim() ?? "";
    const email = emailInput?.value.trim() ?? "";

    this._signUpNameInvalid = !validateRequiredInput(nameInput);
    if (this._signUpNameInvalid) return;

    this._signUpEmailInvalid = !validateEmailInput(emailInput);
    if (this._signUpEmailInvalid) return;

    this.dispatchEvent(
      new CustomEvent("request-sign-in", {
        detail: { email, name },
        bubbles: true,
        composed: true,
      }),
    );
    this.showSignUp = false;
  },
};
