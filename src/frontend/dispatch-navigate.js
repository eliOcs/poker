/**
 * @param {Element} target
 * @param {string} path
 * @param {{ allowMttLobby?: boolean }} [extraDetail]
 */
export function dispatchNavigate(target, path, extraDetail = {}) {
  target.dispatchEvent(
    new CustomEvent("navigate", {
      detail: { path, ...extraDetail },
      bubbles: true,
    }),
  );
}
