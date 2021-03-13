"use strict";
module.exports =
  process.env.ENV === "prod" ? require("./prod") : require("./dev");
