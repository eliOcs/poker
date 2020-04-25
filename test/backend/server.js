"use strict";

const sinon = require("sinon");

const stopwatch = {
  toJSON: sinon.stub(),
};
const server = Server({ stopwatch });
