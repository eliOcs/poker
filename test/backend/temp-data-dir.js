import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// `npm run test:backend` points DATA_DIR at a temporary directory for the whole
// run, so tests never write into the dev server's `data/`.
const runDataDir = process.env.DATA_DIR;

/** @returns {Promise<string>} */
export function createTempDataDir() {
  return mkdtemp(join(tmpdir(), "poker-test-data-"));
}

/** Points DATA_DIR back at the run's directory after a test moved it. */
export function restoreDataDir() {
  if (runDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = runDataDir;
}
