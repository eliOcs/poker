import { showToast } from "./app-toasts.js";

/**
 * @param {any} app
 * @param {string} email
 * @param {string} returnPath
 */
export async function requestSignIn(app, email, returnPath) {
  try {
    const res = await fetch("/api/sign-in-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, returnPath }),
    });
    if (res.ok) {
      showToast(app, {
        message: "Sign-in link sent",
        variant: "success",
      });
      return;
    }

    const data = await res.json().catch(() => undefined);
    showToast(app, {
      message: data?.error ?? "Unable to send sign-in link",
      variant: "error",
    });
  } catch {
    showToast(app, {
      message: "Unable to send sign-in link",
      variant: "error",
    });
  }
}
