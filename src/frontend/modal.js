import { html, LitElement } from "lit";

export function renderModal(title, onClose, content) {
  return html`<phg-modal
    .title=${title}
    .content=${content}
    @close=${onClose}
  ></phg-modal>`;
}

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
    this.boundHandleKeydown = this.handleKeydown.bind(this);
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.boundHandleKeydown);
    this.updateComplete.then(() => {
      const autofocusElement = /** @type {HTMLElement|undefined} */ (
        this.querySelector("[autofocus]")
      );
      autofocusElement?.focus();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.boundHandleKeydown);
  }

  handleKeydown(event) {
    if (event.key === "Escape") this.close();
  }

  close() {
    this.dispatchEvent(new CustomEvent("close", { bubbles: true }));
  }

  render() {
    return html`
      <div class="modal-overlay" @click=${this.close}></div>
      <dialog class="modal" open @cancel=${this.close}>
        <div class="modal-header">
          <h3>${this.title}</h3>
          <button
            type="button"
            class="modal-close"
            @click=${this.close}
            title="Close"
          >
            ✕
          </button>
        </div>
        ${this.content}
      </dialog>
    `;
  }
}

customElements.define("phg-modal", Modal);
