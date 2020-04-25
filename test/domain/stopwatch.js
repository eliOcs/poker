"use strict";

const tap = require("tap");
const sinon = require("sinon");
const Stopwatch = require("../../src/domain/stopwatch");

const clock = sinon.useFakeTimers();
const stopwatch = Stopwatch();

tap.same(stopwatch.toJSON(), {
  time: "00:00:00",
  running: false,
});
stopwatch.start();

clock.tick(1000 /* 1 second */);
tap.same(stopwatch.toJSON(), {
  time: "00:00:01",
  running: true,
});

clock.tick(60000 /* 1 minute */);
tap.same(stopwatch.toJSON(), {
  time: "00:01:01",
  running: true,
});

clock.tick(3600000 /* 1 hour */);
tap.same(stopwatch.toJSON(), {
  time: "01:01:01",
  running: true,
});

stopwatch.stop();
tap.same(stopwatch.toJSON(), {
  time: "01:01:01",
  running: false,
});

stopwatch.reset();
tap.same(stopwatch.toJSON(), {
  time: "00:00:00",
  running: false,
});

clock.restore();
