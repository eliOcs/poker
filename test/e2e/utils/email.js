import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";

const EMAIL_DIR = process.env.E2E_EMAIL_DIR;

/**
 * @returns {string}
 */
function getEmailDir() {
  if (!EMAIL_DIR) {
    throw new Error("E2E_EMAIL_DIR is required for e2e email tests");
  }
  return EMAIL_DIR;
}

export async function ensureEmailSinkDir() {
  const emailDir = getEmailDir();
  await mkdir(emailDir, { recursive: true });
}

/**
 * @param {string} toEmail
 * @param {number} startedAt
 * @param {number} [timeoutMs]
 * @returns {Promise<{ toEmail: string, appOrigin: string, signInUrl: string, expiresInMinutes: number, subject: string, html: string, text: string }>}
 */
export async function waitForLatestEmail(
  toEmail,
  startedAt,
  timeoutMs = 10_000,
) {
  const emailDir = getEmailDir();
  await ensureEmailSinkDir();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const files = existsSync(emailDir)
      ? (await readdir(emailDir))
          .filter((file) => file.endsWith(".json"))
          .sort()
          .reverse()
      : [];

    for (const file of files) {
      const filePath = `${emailDir}/${file}`;
      const fileStat = await stat(filePath);
      if (fileStat.mtimeMs < startedAt) continue;
      const parsed = JSON.parse(await readFile(filePath, "utf8"));
      if (parsed?.toEmail === toEmail) {
        return parsed;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for email to ${toEmail}`);
}
