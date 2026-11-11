import { describeLinkExpiry, renderEmailHtml } from "./email-layout.js";

/**
 * @param {{ appOrigin: string, tournamentName: string, signInUrl: string, expiresInMinutes: number }} params
 */
export function renderTournamentStartEmail({
  appOrigin,
  tournamentName,
  signInUrl,
  expiresInMinutes,
}) {
  const headline = `"${tournamentName}" tournament started`;
  return {
    subject: headline,
    text: [
      `${headline}.`,
      "",
      "Use the link below to start playing:",
      signInUrl,
      "",
      describeLinkExpiry(expiresInMinutes),
      "You are receiving this email because you registered for this tournament.",
    ].join("\n"),
    html: renderEmailHtml({
      appOrigin,
      message: `${headline}. Click the button below to start playing.`,
      buttonLabel: "Open my table",
      buttonUrl: signInUrl,
      footer: `${describeLinkExpiry(expiresInMinutes)} You are receiving this email because you registered for this tournament.`,
    }),
  };
}
