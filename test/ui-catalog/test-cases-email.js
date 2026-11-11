/* global window */
import { html } from "lit";
import { renderSignInEmail } from "/src/backend/sign-in-email.js";
import { renderTournamentStartEmail } from "/src/backend/tournament-start-email.js";

const BACKGROUND = "#0f0f1a";
const FRAME_BACKGROUND = "#f0f0f0";
const SPACE_LG = "16px";

function emailPreviewFrame(doc) {
  return html`<iframe
    title="Email preview"
    style="display:block;width:100%;height:720px;border:0;background:${FRAME_BACKGROUND};"
    srcdoc=${doc}
  ></iframe>`;
}

function emailPreview(emailHtml) {
  return html`
    <div
      class="email-preview"
      style="min-height:100vh;background:${BACKGROUND};padding:calc(${SPACE_LG} * 2);"
    >
      <div style="max-width:720px;margin:0 auto;">
        ${emailPreviewFrame(emailHtml)}
      </div>
    </div>
  `;
}

export const EMAIL_TEST_CASES = {
  "email-sign-in": () => {
    const { html: emailHtml } = renderSignInEmail({
      appOrigin: window.location.origin,
      signInUrl:
        "https://plutonpoker.com/auth/email-sign-in/verify?token=example",
      expiresInMinutes: 30,
    });

    return emailPreview(emailHtml);
  },

  "email-tournament-start": () => {
    const { html: emailHtml } = renderTournamentStartEmail({
      appOrigin: window.location.origin,
      tournamentName: "Friday Deepstack",
      signInUrl:
        "https://plutonpoker.com/auth/email-sign-in/callback?token=example",
      expiresInMinutes: 30,
    });

    return emailPreview(emailHtml);
  },
};
