/*  eslint-env node */
"use strict";

const { series, parallel, src, dest, watch } = require("gulp");

function clean(cb) {
  require("rimraf")("build", cb);
}

async function bundleJs() {
  const { rollup } = require("rollup");
  const resolve = require("@rollup/plugin-node-resolve");
  const alias = require("@rollup/plugin-alias");
  const path = require("path");
  let config = "config/dev.js";
  if (process.env.ENV === "prod") {
    config = "config/prod.js";
  }
  const bundle = await rollup({
    input: "src/stopwatch.js",
    plugins: [
      resolve(),
      alias({
        entries: [
          {
            find: "config",
            replacement: path.resolve(process.cwd(), config),
          },
        ],
      }),
    ],
  });
  return bundle.write({
    name: "app",
    file: "build/app.js",
    format: "iife",
  });
}

function copyAssets() {
  return src("src/index.html").pipe(dest("build"));
}

exports.build = series(clean, parallel(bundleJs, copyAssets));

exports.watch = function () {
  watch("src/index.html", { delay: "500" }, copyAssets);
  watch("src/**/*.js", { delay: "500" }, bundleJs);
};
