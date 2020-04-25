"use strict";

const Stopwatch = require("../domain/stopwatch");
const Server = require("./server");
Server({ stopwatch: Stopwatch() });
