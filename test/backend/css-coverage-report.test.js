import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
  new URL("../../scripts/report-css-coverage.js", import.meta.url),
);

function setup(t) {
  const cwd = mkdtempSync(join(tmpdir(), "poker-css-coverage-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  mkdirSync(join(cwd, "src/frontend/styles"), { recursive: true });
  mkdirSync(join(cwd, "coverage/e2e/css/tmp"), { recursive: true });
  return cwd;
}

function record(cwd, name, entries) {
  writeFileSync(
    join(cwd, `coverage/e2e/css/tmp/${name}.json`),
    JSON.stringify(entries),
  );
}

function run(cwd) {
  return spawnSync(process.execPath, [script], { cwd, encoding: "utf8" });
}

test("CSS report unions usage across pages and includes unloaded stylesheets", (t) => {
  const cwd = setup(t);
  const text = "/* <script>& */\n.a { color: red; }\n.b { color: blue; }\n";
  const url = join(cwd, "src/frontend/styles/example.css");
  writeFileSync(url, text);
  writeFileSync(join(cwd, "src/frontend/unloaded.css"), ".unused {}");
  record(cwd, "page-1", [
    {
      url,
      text,
      ranges: [
        { start: 15, end: 30 },
        { start: 35, end: 40 },
      ],
    },
  ]);
  record(cwd, "page-2", [
    {
      url,
      text,
      ranges: [
        { start: 25, end: 35 },
        { start: 15, end: 30 },
      ],
    },
  ]);
  const result = run(cwd);
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(
    readFileSync(join(cwd, "coverage/e2e/css/coverage-summary.json"), "utf8"),
  );
  assert.equal(summary.used, 25);
  assert.equal(summary.total, text.length + 10);
  assert.deepEqual(summary.files[0].ranges, [{ start: 15, end: 40 }]);
  assert.equal(summary.files[0].loaded, true);
  assert.equal(summary.files[1].loaded, false);
  assert.equal(summary.files[1].used, 0);
  const html = readFileSync(join(cwd, "coverage/e2e/css/index.html"), "utf8");
  assert.ok(html.includes("&lt;script&gt;&amp;"));
  assert.ok(html.includes(`<mark>${text.slice(15, 40)}</mark>`));
  assert.ok(html.includes("Not loaded"));
});

test("CSS report rejects missing recordings, stale or missing source, and invalid ranges", (t) => {
  const cwd = setup(t);
  assert.match(run(cwd).stderr, /No CSS coverage recordings/);
  const url = join(cwd, "src/frontend/example.css");
  writeFileSync(url, ".new {}");
  record(cwd, "page", [{ url, text: ".old {}", ranges: [] }]);
  assert.match(run(cwd).stderr, /CSS source changed/);
  record(cwd, "page", [
    { url: `${url}.deleted.css`, text: ".old {}", ranges: [] },
  ]);
  assert.match(run(cwd).stderr, /CSS source missing from inventory/);
  record(cwd, "page", [
    { url, text: ".new {}", ranges: [{ start: 0, end: 100 }] },
  ]);
  assert.match(run(cwd).stderr, /Invalid CSS range/);
});

test("CSS report handles a recorded page with no stylesheets", (t) => {
  const cwd = setup(t);
  writeFileSync(join(cwd, "src/frontend/example.css"), ".unused {}");
  record(cwd, "page", []);
  const result = run(cwd);
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(
    readFileSync(join(cwd, "coverage/e2e/css/coverage-summary.json"), "utf8"),
  );
  assert.equal(summary.used, 0);
  assert.equal(summary.files[0].loaded, false);
});
