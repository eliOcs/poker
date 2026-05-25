import { html, LitElement } from "lit";

class AppSignInModal extends LitElement {
  static get properties() {
    return {
      mode: { type: String },
      prefillName: { type: String, attribute: "prefill-name" },
      _emailInvalid: { state: true },
      _nameInvalid: { state: true },
    };
  }

  constructor() {
    super();
    this.mode = "sign-in";
    this.prefillName = "";
    this._emailInvalid = false;
    this._nameInvalid = false;
  }

  createRenderRoot() {
    return this;
  }

  close() {
    this.dispatchEvent(new CustomEvent("close"));
  }

  switchMode() {
    this.dispatchEvent(
      new CustomEvent("switch-mode", {
        detail: { mode: this.mode === "sign-up" ? "sign-in" : "sign-up" },
      }),
    );
  }

  clearValidation() {
    this._emailInvalid = false;
    this._nameInvalid = false;
  }

  _input(selector) {
    return /** @type {HTMLInputElement|undefined} */ (
      this.querySelector(selector)
    );
  }

  _validateEmail(input) {
    if (input?.value.trim() && input.checkValidity()) return true;
    this._emailInvalid = true;
    input?.focus();
    return false;
  }

  _validateName(input) {
    if (input?.value.trim()) return true;
    this._nameInvalid = true;
    input?.focus();
    return false;
  }

  submit() {
    const emailInput = this._input("#profile-sign-in-email");
    const email = emailInput?.value.trim() ?? "";
    const nameInput = this._input("#profile-sign-up-name");
    const name = nameInput?.value.trim() ?? "";

    this.clearValidation();
    if (this.mode === "sign-up" && !this._validateName(nameInput)) return;
    if (!this._validateEmail(emailInput)) return;

    this.dispatchEvent(
      new CustomEvent("request-sign-in", {
        detail: this.mode === "sign-up" ? { email, name } : { email },
        bubbles: true,
        composed: true,
      }),
    );
    this.close();
  }

  renderNameInput() {
    if (this.mode !== "sign-up") return "";
    return html`
      <label for="profile-sign-up-name">Name</label>
      <input
        id="profile-sign-up-name"
        type="text"
        autocomplete="name"
        placeholder="Enter your name"
        maxlength="20"
        ?required=${true}
        aria-invalid=${this._nameInvalid ? "true" : "false"}
        autofocus
        .value=${this.prefillName}
        @input=${this.clearValidation}
      />
    `;
  }

  render() {
    const isSignUp = this.mode === "sign-up";
    return html`
      <phg-modal
        .title=${isSignUp ? "Sign up" : "Sign in"}
        @close=${this.close}
      >
        <form
          class="sign-in-content"
          @submit=${(e) => {
            e.preventDefault();
            this.submit();
          }}
        >
          <p class="sign-in-intro">
            ${isSignUp
              ? html`You will receive an email to complete the sign up.`
              : html`You will receive an email to complete the sign in.`}
          </p>
          ${this.renderNameInput()}
          <label for="profile-sign-in-email">Email</label>
          <input
            id="profile-sign-in-email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            ?required=${true}
            aria-invalid=${this._emailInvalid ? "true" : "false"}
            ?autofocus=${!isSignUp}
            @input=${this.clearValidation}
          />
          <div class="buttons">
            <phg-button variant="muted" @click=${this.close}>Cancel</phg-button>
            <phg-button variant="action" @click=${this.submit}
              >${isSignUp
                ? "Send sign-up link"
                : "Send sign-in link"}</phg-button
            >
          </div>
          <p class="sign-in-switch">
            ${isSignUp ? "Have an account?" : "New?"}
            <button
              type="button"
              class="sign-in-switch-link"
              @click=${this.switchMode}
            >
              ${isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </form>
      </phg-modal>
    `;
  }
}

customElements.define("phg-app-sign-in-modal", AppSignInModal);

/**
 * @param {any} app
 */
export function renderProfileSignInModal(app) {
  if (!app._showProfileSignIn) return "";
  return html`<phg-app-sign-in-modal
    mode="sign-in"
    @close=${() => app.closeProfileSignIn()}
    @switch-mode=${() => {
      app.closeProfileSignIn();
      app.openProfileSignUp();
    }}
  ></phg-app-sign-in-modal>`;
}

/**
 * @param {any} app
 */
export function renderProfileSignUpModal(app) {
  if (!app._showProfileSignUp) return "";
  return html`<phg-app-sign-in-modal
    mode="sign-up"
    .prefillName=${app.user?.name ?? ""}
    @close=${() => app.closeProfileSignUp()}
    @switch-mode=${() => {
      app.closeProfileSignUp();
      app.openProfileSignIn();
    }}
  ></phg-app-sign-in-modal>`;
}
