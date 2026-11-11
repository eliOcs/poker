import { describeLinkExpiry, renderEmailHtml } from "./email-layout.js";

/**
 * @param {{ appOrigin: string, signInUrl: string, expiresInMinutes: number }} params
 */
export function renderSignInEmail({ appOrigin, signInUrl, expiresInMinutes }) {
  return {
    subject: "Sign in to Pluton Poker",
    text: [
      "Sign in to Pluton Poker",
      "",
      "Use the link below to sign in:",
      signInUrl,
      "",
      describeLinkExpiry(expiresInMinutes),
      "If you did not request this email, you can ignore it.",
    ].join("\n"),
    html: renderEmailHtml({
      appOrigin,
      message: "Click the button below to sign in.",
      buttonLabel: "Sign in",
      buttonUrl: signInUrl,
      footer: `${describeLinkExpiry(expiresInMinutes)} If you did not request this email, you can safely ignore it.`,
    }),
  };
}
