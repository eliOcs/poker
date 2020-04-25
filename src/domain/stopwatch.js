"use strict";

module.exports = function Stopwatch() {
  let seconds = 0;
  let interval;
  const stopwatch = {};

  function notifyUpdate() {
    if (stopwatch.onUpdate) {
      stopwatch.onUpdate(stopwatch);
    }
  }

  stopwatch.start = function () {
    interval = setInterval(function () {
      seconds += 1;
      notifyUpdate();
    }, 1000);
    notifyUpdate();
  };

  stopwatch.stop = function () {
    clearInterval(interval);
    interval = null;
    notifyUpdate();
  };

  stopwatch.reset = function () {
    seconds = 0;
    notifyUpdate();
  };

  stopwatch.toJSON = function () {
    return {
      time: formatTime(seconds),
      running: Boolean(interval),
    };
  };

  return stopwatch;
};

function formatTime(seconds) {
  const time = [];
  let remainder = seconds;
  for (const unitInSecs of [
    3600 /* hours */,
    60 /* minutes */,
    1 /*seconds */,
  ]) {
    time.push(String(Math.floor(remainder / unitInSecs)).padStart(2, "0"));
    remainder %= unitInSecs;
  }
  return time.join(":");
}
