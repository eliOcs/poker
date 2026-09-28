import { globSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const outputDir = "coverage/e2e/css";
const recordings = globSync(`${outputDir}/tmp/*.json`);
if (recordings.length === 0) {
  throw new Error(
    "No CSS coverage recordings. Run npm run test:e2e:coverage first.",
  );
}

// Inventory source files as well as loaded stylesheets, like c8's --all.
const files = new Map(
  globSync("src/frontend/**/*.css")
    .sort()
    .map((path) => [
      resolve(path),
      { path, text: readFileSync(path, "utf8"), loaded: false, ranges: [] },
    ]),
);

for (const recording of recordings) {
  const entries = JSON.parse(readFileSync(recording, "utf8"));
  if (!Array.isArray(entries))
    throw new Error(`Invalid CSS recording: ${recording}`);
  for (const entry of entries) {
    validateEntry(entry, recording);
    const file = files.get(entry.url);
    if (!file) {
      throw new Error(
        `CSS source missing from inventory: ${entry.url}. Rerun coverage.`,
      );
    }
    if (file.text !== entry.text) {
      throw new Error(
        `CSS source changed since collection: ${file.path}. Rerun coverage.`,
      );
    }
    file.loaded = true;
    file.ranges.push(...entry.ranges);
  }
}

const summary = [...files.values()].map((file) => {
  const ranges = mergeRanges(file.ranges);
  const used = ranges.reduce((sum, range) => sum + range.end - range.start, 0);
  return { ...file, ranges, used, total: file.text.length };
});
const used = summary.reduce((sum, file) => sum + file.used, 0);
const total = summary.reduce((sum, file) => sum + file.total, 0);
mkdirSync(outputDir, { recursive: true });
writeFileSync(
  `${outputDir}/coverage-summary.json`,
  JSON.stringify(
    {
      used,
      total,
      files: summary.map(({ path, loaded, ranges, used, total }) => ({
        path,
        loaded,
        ranges,
        used,
        total,
      })),
    },
    null,
    2,
  ) + "\n",
);
writeFileSync(`${outputDir}/index.html`, renderReport(summary, used, total));
console.log(
  `CSS coverage: ${percent(used, total)} (${used}/${total} source characters)`,
);
console.log(
  `CSS report: ${relative(process.cwd(), resolve(outputDir, "index.html"))}`,
);

function validateEntry(entry, recording) {
  if (
    !entry ||
    typeof entry.url !== "string" ||
    typeof entry.text !== "string" ||
    !Array.isArray(entry.ranges)
  )
    throw new Error(`Invalid CSS entry: ${recording}`);
  for (const range of entry.ranges) {
    if (!validRange(range, entry.text.length))
      throw new Error(`Invalid CSS range: ${recording}`);
  }
}

function validRange(range, length) {
  return (
    range &&
    Number.isSafeInteger(range.start) &&
    Number.isSafeInteger(range.end) &&
    range.start >= 0 &&
    range.end >= range.start &&
    range.end <= length
  );
}

function mergeRanges(ranges) {
  const merged = [];
  for (const range of ranges.sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function percent(used, total) {
  return total ? `${((used / total) * 100).toFixed(1)}%` : "n/a";
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function highlight(file) {
  let cursor = 0;
  let html = "";
  for (const { start, end } of file.ranges) {
    html += escapeHtml(file.text.slice(cursor, start));
    html += `<mark>${escapeHtml(file.text.slice(start, end))}</mark>`;
    cursor = end;
  }
  return html + escapeHtml(file.text.slice(cursor));
}

function renderReport(files, used, total) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>E2E CSS coverage</title>
<style>
body { font: 16px/1.5 system-ui, sans-serif; margin: 2rem auto; padding: 0 1rem; max-width: 1000px; color: #18232e; }
a { color: #175bb0; }
table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; }
th, td { text-align: left; padding: .5rem; border-bottom: 1px solid #ccd2d8; }
pre { background: #f0f2f4; padding: 1rem; overflow: auto; tab-size: 2; }
mark { background: #c9efd6; color: #173c23; }
summary { cursor: pointer; padding: .6rem 0; }
</style>
</head>
<body>
<h1>E2E CSS coverage</h1>
<p><strong>${percent(used, total)}</strong> of source characters covered (${used.toLocaleString("en-US")} / ${total.toLocaleString("en-US")}).</p>
<p><mark>Green text</mark> was reported as used by Chromium in at least one test. Other text was not reported as used; it can include comments, whitespace, and untested rules. This measures rule usage, not whether each declaration affects the final rendering.</p>
<p>All frontend CSS files are included. Unloaded files have zero coverage. Unused styles are investigation candidates: viewport sizes, hover/focus states, and uncommon flows affect usage.</p>
<p><a href="../index.html">JavaScript coverage</a> · <a href="coverage-summary.json">CSS JSON summary</a></p>
<table>
<thead><tr><th>Stylesheet</th><th>Covered</th><th>Collection</th></tr></thead>
<tbody>${files.map((file, index) => `<tr><td><a href="#file-${index}">${escapeHtml(file.path)}</a></td><td>${percent(file.used, file.total)}</td><td>${file.loaded ? "Loaded" : "Not loaded"}</td></tr>`).join("\n")}</tbody>
</table>
${files.map((file, index) => `<details id="file-${index}"><summary>${escapeHtml(file.path)} — ${percent(file.used, file.total)}</summary><pre><code>${highlight(file)}</code></pre></details>`).join("\n")}
<script>
function revealFile() {
  const target = document.getElementById(location.hash.slice(1));
  if (target instanceof HTMLDetailsElement) { target.open = true; target.scrollIntoView(); }
}
window.addEventListener("hashchange", revealFile);
revealFile();
</script>
</body>
</html>`;
}
