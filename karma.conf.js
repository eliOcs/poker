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
  options.esm.nodeResolve = true;
  config.set(options);
  return config;
};
