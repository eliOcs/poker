#!/usr/bin/env bash

set -euo pipefail

root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"

if [[ -z "$(git status --porcelain=v1 --untracked-files=all)" ]]; then
  echo "Semantic review passed: no uncommitted changes"
  exit
fi

rules=$(<scripts/review/rules.md)
prompt="Review the uncommitted changes against the repository's semantic review rules below.

Do not modify files or run npm scripts, tests, or Codex. You may inspect the diff and surrounding code. Return a finding only for a high-confidence violation introduced by a changed line. Use the rule heading as the finding's rule value. Return an empty findings array when all changes pass.

<semantic-review-rules>
$rules
</semantic-review-rules>"

output=$(mktemp "${TMPDIR:-/tmp}/poker-review.XXXXXX")
trap 'rm -f "$output"' EXIT

codex exec \
  --sandbox read-only \
  --ephemeral \
  --output-schema scripts/review/output.schema.json \
  --output-last-message "$output" \
  "$prompt" </dev/null

if [[ "$(tr -d '[:space:]' <"$output")" == '{"findings":[]}' ]]; then
  echo "Semantic review passed"
  exit
fi

echo "Semantic review failed:"
cat "$output"
exit 1
