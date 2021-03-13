"use strict";

const tap = require("tap");
const sinon = require("sinon");
const WebSocket = require("ws");
const Server = require("../../src/api/server");

const stopwatch = {
  start: sinon.stub(),
  stop: sinon.stub(),
  reset: sinon.stub(),
  toJSON: sinon.stub().returns({ json: true }),
};
const webSocket = { on: sinon.stub(), send: sinon.stub() };
const webSocketServer = { on: sinon.stub() };
sinon.stub(WebSocket, "Server").returns(webSocketServer);

Server({ stopwatch });
tap.same(WebSocket.Server.firstCall.args, [{ port: 8080 }]);

webSocketServer.on.withArgs("connection").callArgWith(1, webSocket);
tap.same(webSocket.send.firstCall.args, ['{"json":true}']);

stopwatch.onUpdate(stopwatch);
tap.same(webSocket.send.secondCall.args, ['{"json":true}']);

webSocket.on.withArgs("message").callArgWith(1, "start");
tap.true(stopwatch.start.called);

webSocket.on.withArgs("message").callArgWith(1, "stop");
tap.true(stopwatch.stop.called);

webSocket.on.withArgs("message").callArgWith(1, "reset");
tap.true(stopwatch.reset.called);

WebSocket.Server.restore();
