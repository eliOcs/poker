import { HttpError } from "./http-error.js";
import * as Store from "./store.js";
import { sendSignInEmail as sendSesSignInEmail } from "./ses.js";
import {
  buildEmailSignInUrl,
  consumeEmailSignInToken,
  createEmailSignInToken,
  getEmailSignInExpiry,
  isValidEmail,
  normalizeEmail,
  saveEmailSignInToken,
} from "./sign-in.js";

/** @returns {string} */
function getAppOrigin() {
  const appOrigin = process.env.APP_ORIGIN?.replace(/\/$/, "");
  if (!appOrigin) {
    throw new Error("APP_ORIGIN is required for email sign-in links");
  }
  return appOrigin;
}

/**
 * @param {import('./http-routes.js').Response} res
 * @param {string} userId
 */
function setSessionCookie(res, userId) {
  const cookieDomain = process.env.DOMAIN
    ? ` Domain=${process.env.DOMAIN};`
    : "";
  res.setHeader("Set-Cookie", `phg=${userId};${cookieDomain} HttpOnly; Path=/`);
}

/**
 * @param {{ sendSignInEmail?: typeof sendSesSignInEmail }} [services]
 */
export function createSignInRoutes(services = {}) {
  const sendSignInEmail = services.sendSignInEmail || sendSesSignInEmail;

  return [
    {
      method: "POST",
      path: "/api/sign-in-links",
      handler: async ({ req, res, users, getOrCreateUser, parseBody, log }) => {
        const user = getOrCreateUser(req, res, users, log);
        const data = await parseBody(req);
        const email =
          data &&
          typeof data === "object" &&
          "email" in data &&
          typeof data.email === "string"
            ? normalizeEmail(data.email)
            : "";

        if (!email || !isValidEmail(email)) {
          throw new HttpError(400, "Valid email is required", {
            body: { error: "Valid email is required", status: 400 },
          });
        }

        const token = createEmailSignInToken();
        const { expiresAt, expiresInMinutes } = getEmailSignInExpiry();
        const appOrigin = getAppOrigin();

        saveEmailSignInToken({
          token,
          userId: user.id,
          email,
          expiresAt,
        });

        await sendSignInEmail({
          toEmail: email,
          appOrigin,
          signInUrl: buildEmailSignInUrl(appOrigin, token),
          expiresInMinutes,
        });

        res.writeHead(204);
        res.end();
      },
    },
    {
      method: "GET",
      path: /^\/auth\/email-sign-in\/verify(?:\?.*)?$/,
      handler: ({ req, res, users }) => {
        const url = new URL(req.url ?? "", getAppOrigin());
        const token = url.searchParams.get("token") ?? "";
        const signIn = consumeEmailSignInToken(token);

        if (!signIn) {
          res.writeHead(302, { Location: "/" });
          res.end();
          return;
        }

        const resolvedUser = Store.loadUser(signIn.userId);
        if (resolvedUser) {
          users[resolvedUser.id] = resolvedUser;
        }

        setSessionCookie(res, signIn.userId);
        res.writeHead(302, { Location: "/" });
        res.end();
      },
    },
  ];
}
