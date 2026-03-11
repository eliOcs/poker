const EMAIL_BG = "#17172b";
const PANEL_BG = "#232344";
const BORDER = "#4d4d78";
const TEXT = "#f3f3ff";
const MUTED = "#b8b8d8";
const ACTION = "#f3a71a";

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * @param {{ appOrigin: string, signInUrl: string, expiresInMinutes: number }} params
 */
export function renderSignInEmail({ appOrigin, signInUrl, expiresInMinutes }) {
  const safeOrigin = escapeHtml(appOrigin.replace(/\/$/, ""));
  const safeUrl = escapeHtml(signInUrl);
  const logoUrl = `${safeOrigin}/logo.webp`;

  return {
    subject: "Sign in to Pluton Poker",
    text: [
      "Sign in to Pluton Poker",
      "",
      "Use the link below to sign in:",
      signInUrl,
      "",
      `This link expires in ${expiresInMinutes} minutes and can only be used once.`,
      "If you did not request this email, you can ignore it.",
    ].join("\n"),
    html: `
      <!doctype html>
      <html lang="en">
        <body style="margin:0;padding:32px 16px;background:${EMAIL_BG};font-family:'Trebuchet MS',Verdana,sans-serif;color:${TEXT};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:560px;background:${PANEL_BG};border:3px solid ${BORDER};">
                  <tr>
                    <td style="padding:32px 32px 16px;text-align:center;">
                      <img src="${logoUrl}" alt="Pluton Poker" width="220" style="display:block;margin:0 auto;height:auto;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 32px 8px;text-align:center;font-size:28px;line-height:1.3;font-weight:700;color:${TEXT};">
                      Sign in to Pluton Poker
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 32px 24px;text-align:center;font-size:16px;line-height:1.6;color:${MUTED};">
                      Click the button below to sign in. This link expires in ${expiresInMinutes} minutes and can only be used once.
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:0 32px 24px;">
                      <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;background:${ACTION};border:3px solid #000;color:#17172b;text-decoration:none;font-size:18px;font-weight:700;">
                        Sign in
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 32px 32px;text-align:center;font-size:14px;line-height:1.6;color:${MUTED};">
                      If you did not request this email, you can safely ignore it.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };
}
