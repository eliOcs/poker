import { html, LitElement } from "lit";
import { ICONS } from "./icons.js";

class EditLabel extends LitElement {
  createRenderRoot() {
    return this;
  }

  static get properties() {
    return {
      value: { type: String },
      placeholder: { type: String },
      editing: { type: Boolean, reflect: true },
      draftValue: { type: String, state: true },
    };
  }

  constructor() {
    super();
    this.value = "";
    this.placeholder = "";
    this.editing = false;
    this.draftValue = "";
  }

  updated(changedProperties) {
    if (changedProperties.has("editing") && this.editing) {
      const input = this.renderRoot.querySelector("input");
      input?.focus();
      input?.select();
    }

    if (changedProperties.has("value") && !this.editing) {
      this.draftValue = this.value;
    }
  }

  startEditing() {
    this.draftValue = this.value;
    this.editing = true;
  }

  cancel() {
    this.draftValue = this.value;
    this.editing = false;
    this.dispatchEvent(
      new CustomEvent("edit-cancelled", { bubbles: true, composed: true }),
    );
  }

  submit() {
    const value = this.draftValue;
    this.value = value;
    this.editing = false;
    this.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  handleInput(event) {
    this.draftValue = event.target.value;
  }

  handleKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.cancel();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      this.submit();
    }
  }

  handleSubmit(event) {
    event.preventDefault();
    this.submit();
  }

  render() {
    return this.editing ? this.renderEdit() : this.renderView();
  }

  renderView() {
    const label = this.value || this.placeholder;
    return html`
      <span class="view">
        <button
          class="label-button"
          type="button"
          title=${label}
          @click=${this.startEditing}
        >
          ${label}
        </button>
        <button
          class="icon-button"
          type="button"
          aria-label="Edit label"
          title="Edit label"
          @click=${this.startEditing}
        >
          ${ICONS.pencil}
        </button>
      </span>
    `;
  }

  renderEdit() {
    return html`
      <form @submit=${this.handleSubmit}>
        <input
          .value=${this.draftValue}
          placeholder=${this.placeholder}
          aria-label="Label"
          @input=${this.handleInput}
          @keydown=${this.handleKeydown}
        />
        <button
          class="icon-button submit"
          type="submit"
          aria-label="Save label"
          title="Save label"
        >
          ${ICONS.check}
        </button>
        <button
          class="icon-button cancel"
          type="button"
          aria-label="Cancel editing"
          title="Cancel editing"
          @click=${this.cancel}
        >
          ${ICONS.close}
        </button>
      </form>
    `;
  }
}

customElements.define("phg-edit-label", EditLabel);
