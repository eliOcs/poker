"use strict";

const tap = require("tap");
tap.same(require("../config"), require("../config/dev"));

process.env.ENV = "prod";
delete require.cache[require.resolve("../config")];
tap.same(require("../config"), require("../config/prod"));
