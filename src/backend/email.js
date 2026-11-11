import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import crypto from "node:crypto";
import { renderSignInEmail } from "./sign-in-email.js";
import { renderTournamentStartEmail } from "./tournament-start-email.js";

const sesClient = new SESClient({
  region: process.env.AWS_REGION ?? "eu-central-1",
});

function getFromEmail() {
  return process.env.SES_FROM_EMAIL ?? "no-reply@plutonpoker.com";
}

function getEmailSinkDir() {
  return process.env.EMAIL_SINK_DIR ?? "";
}

/**
 * @param {{ toEmail: string, subject: string, html: string, text: string } & Record<string, unknown>} email
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
    JSON.stringify(email, undefined, 2),
    "utf8",
  );

  return { provider: "sink", sinkFileName: fileName };
}

/**
 * @param {string} kind
 * @param {{ toEmail: string } & Record<string, unknown>} params
 * @param {{ subject: string, html: string, text: string }} email
 */
async function deliverEmail(kind, params, email) {
  const { toEmail } = params;
  if (getEmailSinkDir()) {
    const sink = await writeEmailToSink({ ...params, ...email });
    return {
      kind,
      provider: sink.provider,
      toEmail,
      sinkFileName: sink.sinkFileName,
    };
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

  return { kind, provider: "ses", toEmail };
}

/**
 * @param {{ toEmail: string, appOrigin: string, signInUrl: string, expiresInMinutes: number }} params
 */
export async function sendSignInEmail(params) {
  return deliverEmail("sign_in", params, renderSignInEmail(params));
}

/**
 * @param {{ toEmail: string, appOrigin: string, tournamentName: string, signInUrl: string, expiresInMinutes: number }} params
 */
export async function sendTournamentStartEmail(params) {
  return deliverEmail(
    "tournament_start",
    params,
    renderTournamentStartEmail(params),
  );
}
