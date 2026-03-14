/* global window */
import { html } from "lit";
import { renderSignInEmail } from "/src/backend/sign-in-email.js";
import { COLORS, SPACING } from "/src/shared/design-tokens.js";

function emailPreviewFrame(doc) {
  return html`<iframe
    title="Email preview"
    style="display:block;width:100%;height:720px;border:0;background:${COLORS.fgWhite};"
    srcdoc=${doc}
  ></iframe>`;
}

export const EMAIL_TEST_CASES = {
  "email-sign-in": () => {
    const { html: emailHtml } = renderSignInEmail({
      appOrigin: window.location.origin,
      signInUrl:
        "https://plutonpoker.com/auth/email-sign-in/verify?token=example",
      expiresInMinutes: 30,
    });

    return html`
      <div
        class="email-preview"
        style="min-height:100vh;background:${COLORS.bgDark};padding:calc(${SPACING
          .desktop.lg} * 2);"
      >
        <div style="max-width:720px;margin:0 auto;">
          ${emailPreviewFrame(emailHtml)}
        </div>
      </div>
    `;
  },
};
