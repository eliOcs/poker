import { html, LitElement } from "lit";

/** @typedef {"info"|"success"|"warning"|"error"} ToastVariant */

/**
 * @typedef {object} Toast
 * @property {string} message
 * @property {ToastVariant} variant
 * @property {{ label: string, href: string }} [action] - Makes the whole toast a link
 */

/**
 * Shows toasts stacked at the top of the screen. Which toasts exist and when
 * they expire is app state; this element only renders them.
 */
class Toasts extends LitElement {
  static get properties() {
    return {
      toasts: { type: Array },
    };
  }

  constructor() {
    super();
    /** @type {Toast[]} */
    this.toasts = [];
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.popover = "manual";
  }

  /** @param {Map<string, unknown>} changedProperties */
  updated(changedProperties) {
    const previous = /** @type {Toast[] | undefined} */ (
      changedProperties.get("toasts")
    );
    if (!changedProperties.has("toasts")) return;
    if (this.toasts.length === 0) {
      if (this.matches(":popover-open")) this.hidePopover();
      return;
    }
    // Showing again moves the stack above modals opened since it appeared.
    if (this.toasts.length > (previous?.length ?? 0)) {
      if (this.matches(":popover-open")) this.hidePopover();
      this.showPopover();
    }
  }

  /** @param {Toast} toast */
  dismiss(toast) {
    this.dispatchEvent(new CustomEvent("dismiss", { detail: toast }));
  }

  /** @param {Toast} toast */
  renderToast(toast) {
    const content = toast.action
      ? html`<a class="toast__content" href=${toast.action.href}>
          ${toast.message}
          <span class="toast__action">${toast.action.label}</span>
        </a>`
      : html`<span class="toast__content">${toast.message}</span>`;
    return html`<div
      class=${`toast toast--${toast.variant}`}
      role=${toast.variant === "error" ? "alert" : "status"}
      @click=${() => {
        this.dismiss(toast);
      }}
    >
      ${content}
    </div>`;
  }

  render() {
    return this.toasts.map((toast) => this.renderToast(toast));
  }
}

customElements.define("phg-toasts", Toasts);
