import { html, LitElement } from "lit";
import { ICONS } from "./icons.js";

export function renderModal(title, onClose, content) {
  return html`<phg-modal
    .title=${title}
    .content=${content}
    @close=${onClose}
  ></phg-modal>`;
}

/** @param {MouseEvent} event @param {HTMLDialogElement} dialog */
function isOnBackdrop(event, dialog) {
  if (event.target !== dialog) return false;
  const box = dialog.getBoundingClientRect();
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
}

/**
 * A modal dialog shown with `showModal()`: the browser moves focus to the
 * `[autofocus]` element and makes the rest of the page inert. Owners remove
 * the element on `close`, so focus returns to the opener on disconnect.
 */
class Modal extends LitElement {
  static get properties() {
    return {
      title: { type: String },
      content: { attribute: false },
    };
  }

  constructor() {
    super();
    this.title = "";
    this.content = "";
    /** @type {Element|null|undefined} */
    this.opener = undefined;
    this.pressedBackdrop = false;
  }

  createRenderRoot() {
    return this;
  }

  get dialog() {
    return /** @type {HTMLDialogElement} */ (this.querySelector("dialog"));
  }

  connectedCallback() {
    super.connectedCallback();
    // Lit renders only once, so a reconnected modal reopens itself.
    if (this.hasUpdated) this.open();
  }

  firstUpdated() {
    this.open();
  }

  open() {
    // The first render can run after the owner already removed the modal.
    if (!this.isConnected) return;
    this.opener = document.activeElement;
    this.dialog.showModal();
    // Without an [autofocus] control, start at the top of the content rather
    // than on the close button, so arrow keys scroll it.
    if (!this.querySelector("[autofocus]"))
      /** @type {HTMLElement} */ (this.querySelector(".modal-content")).focus();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // A removed dialog stays open but is no longer modal; reset it.
    this.querySelector("dialog")?.close();
    // Removing the focused dialog leaves focus on the body.
    const focusLost =
      !document.activeElement || document.activeElement === document.body;
    if (
      focusLost &&
      this.opener instanceof HTMLElement &&
      this.opener.isConnected
    )
      this.opener.focus();
  }

  close() {
    this.dispatchEvent(new CustomEvent("close", { bubbles: true }));
  }

  /** @param {Event} event */
  handleCancel(event) {
    // Owners decide when the dialog goes away; Escape only requests it.
    event.preventDefault();
    this.close();
  }

  /** @param {PointerEvent} event */
  handlePointerDown(event) {
    this.pressedBackdrop = isOnBackdrop(event, this.dialog);
  }

  /** @param {MouseEvent} event */
  handleClick(event) {
    // Ignore drags that start inside the dialog and end on the backdrop.
    if (this.pressedBackdrop && isOnBackdrop(event, this.dialog)) this.close();
    this.pressedBackdrop = false;
  }

  render() {
    return html`
      <dialog
        class="modal"
        aria-label=${this.title}
        @cancel=${this.handleCancel}
        @pointerdown=${this.handlePointerDown}
        @click=${this.handleClick}
      >
        <div class="modal-header">
          <h3>${this.title}</h3>
          <button
            type="button"
            class="modal-close"
            @click=${this.close}
            title="Close"
            aria-label="Close"
          >
            ${ICONS.close}
          </button>
        </div>
        <div class="modal-content" tabindex="-1">${this.content}</div>
      </dialog>
    `;
  }
}

customElements.define("phg-modal", Modal);
