"use strict";
const result = exports;

result.ok = function (value) {
  return { type: "ok", value };
};

result.error = function (reason) {
  return { type: "error", reason };
};
