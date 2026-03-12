import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import crypto from "node:crypto";
import { renderSignInEmail } from "./sign-in-email.js";

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "eu-central-1",
});

function getFromEmail() {
  return process.env.SES_FROM_EMAIL || "no-reply@plutonpoker.com";
}

function getEmailSinkDir() {
  return process.env.EMAIL_SINK_DIR || "";
}

export async function cleanupEmailSink() {
  const sinkDir = getEmailSinkDir();
  if (!sinkDir || !existsSync(sinkDir)) return;
  await rm(sinkDir, { recursive: true, force: true });
}

/**
 * @param {{ toEmail: string, appOrigin: string, signInUrl: string, expiresInMinutes: number, subject: string, html: string, text: string }} email
 */
async function writeEmailToSink(email) {
  const sinkDir = getEmailSinkDir();
  if (!sinkDir) {
    throw new Error("EMAIL_SINK_DIR is required when using the email sink");
  }

  if (!existsSync(sinkDir)) {
    await mkdir(sinkDir, { recursive: true });
  }

  const safeEmail = email.toEmail.replaceAll(/[^a-z0-9@._-]+/gi, "-");
  const fileName = `${Date.now()}-${safeEmail}-${crypto.randomUUID()}.json`;
  await writeFile(
    `${sinkDir}/${fileName}`,
    JSON.stringify(email, null, 2),
    "utf8",
  );
}

/**
 * @param {{ toEmail: string, appOrigin: string, signInUrl: string, expiresInMinutes: number }} params
 */
export async function sendSignInEmail({
  toEmail,
  appOrigin,
  signInUrl,
  expiresInMinutes,
}) {
  const email = renderSignInEmail({
    appOrigin,
    signInUrl,
    expiresInMinutes,
  });

  if (getEmailSinkDir()) {
    await writeEmailToSink({
      toEmail,
      appOrigin,
      signInUrl,
      expiresInMinutes,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    return;
  }

  await sesClient.send(
    new SendEmailCommand({
      Source: getFromEmail(),
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Charset: "UTF-8",
          Data: email.subject,
        },
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: email.html,
          },
          Text: {
            Charset: "UTF-8",
            Data: email.text,
          },
        },
      },
    }),
  );
}
