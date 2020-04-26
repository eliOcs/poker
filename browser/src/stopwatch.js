import { LitElement, html } from "lit-element";

export class Stopwatch extends LitElement {
  constructor() {
    super();
    this.websocket = new WebSocket("ws://localhost:8080");
    this.websocket.onmessage = (event) => {
      this.data = JSON.parse(event.data);
    };
  }

  static get properties() {
    return { data: { type: Object } };
  }

  start() {
    this.websocket.send("start");
  }

  stop() {
    this.websocket.send("stop");
  }

  reset() {
    this.websocket.send("reset");
  }

  render() {
    if (!this.data) {
      return html`<span>Loading ...</span>`;
    }

    return html` <span data-test="time">${this.data.time}</span>
      ${this.data.running
        ? html`<button data-test="stop" @click=${this.stop}>Stop</button>`
        : html`<button data-test="start" @click=${this.start}>Start</button>`}
      <button data-test="reset" @click=${this.reset}>Reset</button>`;
  }
}

customElements.define("wc-stopwatch", Stopwatch);
