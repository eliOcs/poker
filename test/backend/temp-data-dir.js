import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** @returns {Promise<string>} */
export function createTempDataDir() {
  return mkdtemp(join(tmpdir(), "poker-test-data-"));
}
