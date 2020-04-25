import { LitElement, html } from "lit-element";

export class Stopwatch extends LitElement {
  constructor() {
    super();
    this.data = {
      time: "00:00:00",
      running: false,
    };
  }

  render() {
    return html`
      <span>${this.data.time}</span>
      <button>${this.data.running ? "Stop" : "Start"}</button>
      <button>Reset</button>
    `;
  }
}

customElements.define("wc-stopwatch", Stopwatch);
