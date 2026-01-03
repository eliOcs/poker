import { html, css, LitElement } from "lit"
import "./home.js"
import "./index.js"

class App extends LitElement {
  static get styles() {
    return css`
      :host {
        display: block;
        height: 100%;
      }
    `
  }

  static get properties() {
    return {
      path: { type: String },
    }
  }

  constructor() {
    super()
    this.path = window.location.pathname
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener("popstate", () => {
      this.path = window.location.pathname
    })
    this.addEventListener("navigate", (e) => {
      history.pushState({}, "", e.detail.path)
      this.path = e.detail.path
    })
  }

  render() {
    const gameMatch = this.path.match(/^\/games\/([a-z0-9]+)$/)
    if (gameMatch) {
      return html`<phg-game .gameId=${gameMatch[1]}></phg-game>`
    }
    return html`<phg-home></phg-home>`
  }
}

customElements.define("phg-app", App)
