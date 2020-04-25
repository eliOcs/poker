/* eslint-env node */
"use strict";

process.env.CHROME_BIN = require("puppeteer").executablePath();
const { createDefaultConfig } = require("@open-wc/testing-karma");

module.exports = function (config) {
  const options = createDefaultConfig(config);
  options.files = [
    {
      pattern: config.grep ? config.grep : "test/browser/**/*.js",
      type: "module",
    },
  ];
  options.reporters.push("coverage-istanbul");
  options.esm.nodeResolve = true;
  options.esm.coverage = true;
  config.set(options);
  return config;
};
