const contentEl = document.getElementById("content");
const socket = new WebSocket("wss://localhost:8443");

socket.onmessage = function (event) {
  contentEl.textContent = event.data;
};
