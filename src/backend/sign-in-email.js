import {
  COLORS,
  FONT_SIZES,
  FONT_STACKS,
  SPACING,
} from "../shared/design-tokens.js";

const EMAIL_BG = COLORS.bgMedium;
const PANEL_BG = "#232344";
const BORDER = "#4d4d78";
const TEXT = COLORS.fgWhite;
const MUTED = COLORS.fgMedium;
const FOOTER_MUTED = COLORS.fgMuted;
const ACTION = COLORS.primary;
const BUTTON_TEXT = COLORS.fgWhite;
const BUTTON_SHADOW = COLORS.bgDark;

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
  const logoUrl = `${safeOrigin}/logo.png`;

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
        <body style="margin:0;padding:32px 16px;background:${EMAIL_BG};font-family:${FONT_STACKS.emailMono};color:${TEXT};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:560px;background:${PANEL_BG};border:3px solid ${BORDER};">
                  <tr>
                    <td style="padding:32px 32px 20px;text-align:center;">
                      <img src="${logoUrl}" alt="Pluton Poker" width="256" style="display:block;margin:0 auto;height:auto;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 32px 24px;text-align:center;font-size:${FONT_SIZES.desktop.lg};line-height:2;color:${MUTED};">
                      Click the button below to sign in. This link expires in ${expiresInMinutes} minutes and can only be used once.
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:0 32px 24px;">
                      <a href="${safeUrl}" style="display:inline-block;padding:${SPACING.desktop.lg} 40px;background:${ACTION};border:3px solid #000;box-shadow:4px 4px 0 ${BUTTON_SHADOW}, inset 2px 2px 0 rgba(255,255,255,0.18), inset -2px -2px 0 rgba(0,0,0,0.22);color:${BUTTON_TEXT};text-decoration:none;font-family:${FONT_STACKS.emailMono};font-size:${FONT_SIZES.desktop.lg};line-height:1;font-weight:700;">
                        Sign in
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 32px 32px;text-align:center;font-size:${FONT_SIZES.desktop.sm};line-height:1.8;color:${FOOTER_MUTED};">
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
