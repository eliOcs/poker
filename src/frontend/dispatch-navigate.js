/**
 * @param {Element} target
 * @param {string} path
 * @param {{ allowMttLobby?: boolean, replace?: boolean }} [extraDetail]
 */
export function dispatchNavigate(target, path, extraDetail = {}) {
  target.dispatchEvent(
    new CustomEvent("navigate", {
      detail: { path, ...extraDetail },
      bubbles: true,
    }),
  );
}
