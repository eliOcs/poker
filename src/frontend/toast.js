import { html, LitElement } from "lit";

class Toast extends LitElement {
  static get properties() {
    return {
      variant: { type: String, reflect: true },
      duration: { type: Number },
      message: { type: String },
    };
  }

  constructor() {
    super();
    this.variant = "info";
    this.duration = 3000;
    this.message = "";
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.duration > 0) {
      this.dismissTimer = setTimeout(() => {
        this.dismiss();
      }, this.duration);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.dismissTimer) clearTimeout(this.dismissTimer);
  }

  dismiss() {
    this.dispatchEvent(new CustomEvent("dismiss", { bubbles: true }));
  }

  render() {
    return html`<div class="toast" @click=${this.dismiss}>
      ${this.message}
    </div>`;
  }
}

customElements.define("phg-toast", Toast);
