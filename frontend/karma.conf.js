/* eslint-env node */
"use strict";

const path = require("path");
const resolve = require("@rollup/plugin-node-resolve");
const alias = require("@rollup/plugin-alias");
const istanbul = require("rollup-plugin-istanbul");
process.env.CHROME_BIN = require("puppeteer").executablePath();

module.exports = function (config) {
  const testFiles = config.grep ? config.grep : "test/**/*.js";
  config.set({
    browsers: ["ChromeHeadlessNoSandbox"],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: "ChromeHeadless",
        flags: ["--no-sandbox"],
      },
    },
    files: [testFiles],
    plugins: [
      "karma-mocha",
      "karma-mocha-reporter",
      "karma-chrome-launcher",
      "karma-rollup-preprocessor",
      "karma-coverage-istanbul-reporter",
    ],
    frameworks: ["mocha"],
    preprocessors: {
      [testFiles]: ["rollup"],
    },
    rollupPreprocessor: {
      plugins: [
        istanbul({ exclude: [testFiles, "node_modules/**/*"] }),
        resolve(),
        alias({
          entries: [
            {
              find: "config",
              replacement: path.resolve(process.cwd(), "config/dev.js"),
            },
          ],
        }),
      ],
      output: {
        name: "test",
        format: "iife",
        sourcemap: "inline",
      },
    },
    coverageIstanbulReporter: {
      reports: ["html", "lcovonly", "text-summary"],
      dir: "coverage",
      combineBrowserReports: true,
      skipFilesWithNoCoverage: false,
      thresholds: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
    reporters: ["mocha", "coverage-istanbul"],
    mochaReporter: {
      showDiff: true,
    },
    client: {
      mocha: {
        reporter: "html",
      },
    },
    colors: true,
    logLevel: "INFO",
    autoWatch: false,
    singleRun: true,
    concurrency: null,
  });
  return config;
};
