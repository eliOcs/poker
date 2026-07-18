import test from "node:test";
import assert from "node:assert/strict";
import { getFilePath } from "../../src/backend/static-files.js";

test("serves the application stylesheet and nested CSS assets", () => {
  assert.equal(getFilePath("/app.css"), "src/frontend/app.css");
  assert.equal(
    getFilePath("/styles/controls.css"),
    "src/frontend/styles/controls.css",
  );
});
