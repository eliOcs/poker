import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { renderSignInEmail } from "./sign-in-email.js";

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "eu-central-1",
});

function getFromEmail() {
  return process.env.SES_FROM_EMAIL || "no-reply@plutonpoker.com";
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
