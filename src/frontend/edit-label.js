import { html, css, LitElement } from "lit";
import { designTokens, baseStyles } from "./styles.js";
import { ICONS } from "./icons.js";

class EditLabel extends LitElement {
  static get styles() {
    return [
      designTokens,
      baseStyles,
      css`
        :host {
          display: inline-block;
          max-width: 100%;
          color: var(--color-fg-white);
        }

        :host([editing]) {
          width: min(100%, var(--edit-label-width, 460px));
        }

        .view,
        form {
          display: inline-flex;
          align-items: center;
          gap: var(--space-sm);
          max-width: 100%;
        }

        form {
          width: 100%;
        }

        .label-button,
        .icon-button {
          margin: 0;
          padding: 0;
          border: 0;
          font: inherit;
          color: inherit;
          background: transparent;
          cursor: pointer;
        }

        .label-button {
          min-width: 0;
          overflow: hidden;
          text-align: left;
          line-height: 1.5;
          text-overflow: ellipsis;
          white-space: nowrap;
          border-bottom: 2px dotted var(--color-fg-muted);
        }

        .view:hover .label-button,
        .view:focus-within .label-button {
          border-bottom-color: var(--color-primary);
        }

        .icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          width: 36px;
          height: 36px;
          color: var(--color-fg-white);
        }

        .icon-button svg {
          display: block;
          width: 22px;
          height: 22px;
          image-rendering: pixelated;
        }

        .view:hover .icon-button,
        .view:focus-within .icon-button {
          color: var(--color-primary);
        }

        .submit:hover,
        .submit:focus-visible {
          color: var(--color-success);
        }

        .cancel:hover,
        .cancel:focus-visible {
          color: var(--color-error);
        }

        input {
          flex: 1 1 auto;
          min-width: 0;
          padding: var(--space-md);
          font: inherit;
          font-size: var(--font-md);
          line-height: 1.5;
          color: var(--color-fg-white);
          background: var(--color-bg-medium);
          border: 3px solid var(--color-bg-dark);
          box-sizing: border-box;
        }

        input:focus {
          outline: none;
          border-color: var(--color-secondary);
          box-shadow: 0 0 0 1px var(--color-secondary);
        }
      `,
    ];
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
