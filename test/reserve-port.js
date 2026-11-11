import { createServer } from "node:net";

/** @returns {Promise<number>} */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "localhost", () => {
      const address = probe.address();
      probe.close(() => {
        if (address && typeof address === "object") resolve(address.port);
        else reject(new Error("free port probe has no address"));
      });
    });
  });
}

/**
 * Returns the port in the named environment variable, choosing a free one the
 * first time. Playwright workers re-evaluate the config and inherit the
 * environment, so every process agrees on the port.
 * @param {string} envName
 * @returns {Promise<number>}
 */
export async function reservePort(envName) {
  process.env[envName] ??= String(await findFreePort());
  return Number(process.env[envName]);
}
