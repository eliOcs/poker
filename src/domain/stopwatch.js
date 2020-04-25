"use strict";

module.exports = function Stopwatch() {
  let seconds = 0;
  let interval;

  function start() {
    interval = setInterval(function () {
      seconds += 1;
    }, 1000);
  }

  function stop() {
    clearInterval(interval);
    interval = null;
  }

  function reset() {
    seconds = 0;
  }

  function toJSON() {
    return {
      time: formatTime(seconds),
      running: Boolean(interval),
    };
  }

  return { start, stop, reset, toJSON };
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
