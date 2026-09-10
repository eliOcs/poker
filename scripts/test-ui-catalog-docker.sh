#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p test-results \
  test/ui-catalog/ui-catalog.test.js-snapshots \
  test/ui-catalog/table-landscape.test.js-snapshots

docker build --platform linux/amd64 -f Dockerfile.ui-catalog -t poker-ui-catalog .
exec docker run --rm --platform linux/amd64 --ipc=host \
  --user "$(id -u):$(id -g)" \
  --volume "$PWD/test-results:/app/test-results" \
  --volume "$PWD/test/ui-catalog/ui-catalog.test.js-snapshots:/app/test/ui-catalog/ui-catalog.test.js-snapshots" \
  --volume "$PWD/test/ui-catalog/table-landscape.test.js-snapshots:/app/test/ui-catalog/table-landscape.test.js-snapshots" \
  poker-ui-catalog npm run test:ui-catalog -- "$@"
