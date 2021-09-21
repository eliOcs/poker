const socket = new WebSocket("wss://localhost:8443");

socket.onopen = function () {
  console.log("[open] Connection established");
};

socket.onmessage = function (event) {
  console.log(`[message] Data received from server: ${event.data}`);
};
