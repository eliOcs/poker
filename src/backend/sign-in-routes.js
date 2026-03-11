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
  normalizeReturnPath,
  saveEmailSignInToken,
} from "./sign-in.js";
import { DEFAULT_SETTINGS } from "./user.js";

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
 * @param {Record<string, any>} users
 * @param {import('./http-routes.js').Response} res
 * @param {{ userId: string, email: string, returnPath: string }} signIn
 * @returns {string}
 */
function completeSignIn(users, res, signIn) {
  const resolvedUser = Store.loadUser(signIn.userId);
  if (resolvedUser) {
    Store.saveUser({
      ...resolvedUser,
      email: signIn.email,
    });
    users[resolvedUser.id] = {
      ...resolvedUser,
      email: signIn.email,
    };
  } else {
    users[signIn.userId] = {
      id: signIn.userId,
      name: undefined,
      email: signIn.email,
      settings: { ...DEFAULT_SETTINGS },
    };
    Store.saveUser(users[signIn.userId]);
  }

  setSessionCookie(res, signIn.userId);
  return signIn.returnPath;
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
        const returnPath =
          data && typeof data === "object" && "returnPath" in data
            ? normalizeReturnPath(data.returnPath)
            : "/";

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
          returnPath,
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
      method: "POST",
      path: "/api/sign-in-links/verify",
      handler: async ({ req, res, users, parseBody }) => {
        const data = await parseBody(req);
        const token =
          data &&
          typeof data === "object" &&
          "token" in data &&
          typeof data.token === "string"
            ? data.token
            : "";

        const signIn = consumeEmailSignInToken(token);
        if (!signIn) {
          throw new HttpError(400, "Invalid or expired sign-in link", {
            body: { error: "Invalid or expired sign-in link", status: 400 },
          });
        }

        const returnPath = completeSignIn(users, res, signIn);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ returnPath }));
      },
    },
  ];
}
