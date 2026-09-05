import { mkdir, readdir, readFile, stat } from "node:fs/promises";

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
 * @param {number} [startedAt]
 * @param {number} [timeoutMs]
 * @returns {Promise<{ toEmail: string, appOrigin: string, signInUrl: string, expiresInMinutes: number, subject: string, html: string, text: string }>}
 */
export async function waitForLatestEmail(
  toEmail,
  startedAt = Date.now(),
  timeoutMs = 10_000,
) {
  const emailDir = getEmailDir();
  await ensureEmailSinkDir();
  const deadline = Date.now() + timeoutMs;
  const safeEmail = toEmail.replaceAll(/[^a-z0-9@._-]+/gi, "-");

  while (Date.now() < deadline) {
    // Sink filenames are <timestamp>-<sanitized recipient>-<uuid>.json.
    const latestFile = (await readdir(emailDir))
      .filter(
        (file) =>
          file.match(/^\d+-(.+)-[\da-f-]{36}\.json$/)?.[1] === safeEmail,
      )
      .sort()
      .at(-1);

    if (latestFile) {
      const email = await readDeliveredEmail(
        `${emailDir}/${latestFile}`,
        startedAt,
      );
      if (email?.toEmail === toEmail) return email;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for email to ${toEmail}`);
}

/**
 * @param {string} filePath
 * @param {number} startedAt
 */
async function readDeliveredEmail(filePath, startedAt) {
  if ((await stat(filePath)).mtimeMs < startedAt) return;
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    // The sink can expose the file before its write has completed.
    if (!(error instanceof SyntaxError)) throw error;
  }
}
