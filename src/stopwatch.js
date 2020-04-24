"use strict";

function formatTime(seconds) {
  const time = [];
  let remainder = seconds;
  for (const unitInSecs of [3600, 60, 1]) {
    time.push(String(Math.floor(remainder / unitInSecs)).padStart(2, "0"));
    remainder %= unitInSecs;
  }
  return time.join(":");
}

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
