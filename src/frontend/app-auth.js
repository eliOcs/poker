/**
 * @param {any} app
 * @param {string} email
 */
export async function requestSignIn(app, email) {
  try {
    const res = await fetch("/api/sign-in-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      app.toast = {
        message: "Sign-in link sent",
        variant: "success",
      };
      return;
    }

    const data = await res.json().catch(() => null);
    app.toast = {
      message: data?.error || "Unable to send sign-in link",
      variant: "error",
    };
  } catch {
    app.toast = {
      message: "Unable to send sign-in link",
      variant: "error",
    };
  }
}
