"use strict";

const { port } = require("../../config");
const WebSocket = require("ws");

module.exports = function Server({ stopwatch }) {
  const wss = new WebSocket.Server({ port });
  wss.on("connection", function connection(ws) {
    ws.send(JSON.stringify(stopwatch.toJSON()));
    stopwatch.onUpdate = function (stopwatch) {
      ws.send(JSON.stringify(stopwatch.toJSON()));
    };

    ws.on("message", function incoming(message) {
      stopwatch[message]();
    });
  });
};
